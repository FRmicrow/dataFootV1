import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import probabilityService from './probabilityService.js';
import MarketVolatilityService from './MarketVolatilityService.js';
import mlService from './mlService.js';
import QuantService from './quantService.js';
import NarrativeService from './narrativeService.js';
import { BOOKMAKER_PRIORITY } from '../../config/betting.js';
import { parseProbability, mapLiveOdds } from '../../utils/v3Helpers.js';

// Simple in-memory cache for daily fixtures (TTL 15 mins)
let dailyCache = {
    date: null,
    data: null,
    timestamp: 0
};

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Helper to get the list of leagues monitored for Live Bet intelligence (US_131)
 */
const getTrackedLeagues = async () => {
    try {
        const row = await db.get("SELECT tracked_leagues FROM V3_System_Preferences LIMIT 1");
        if (!row || !row.tracked_leagues) return [];
        return JSON.parse(row.tracked_leagues);
    } catch (e) {
        console.error("⚠️ Failed to parse tracked_leagues:", e.message);
        return [];
    }
};

/**
 * Helper to resolve monitored API IDs based on tracked leagues or top 5 fallback
 */
async function getMonitoredApiIds() {
    const trackedLeagues = await getTrackedLeagues();
    if (trackedLeagues.length > 0) {
        const rows = await db.all(`SELECT api_id FROM V3_Leagues WHERE league_id IN (${trackedLeagues.map(() => '?').join(',')})`, trackedLeagues);
        return rows.map(r => r.api_id);
    }
    const top5 = await db.all(`SELECT l.api_id FROM V3_Leagues l JOIN V3_Countries c ON l.country_id = c.country_id ORDER BY c.importance_rank ASC, l.importance_rank ASC LIMIT 5`);
    return top5.map(r => r.api_id);
}

/**
 * Service to handle Live Bet logic (US_010, US_011, US_012)
 */

/**
 * Get Daily Fixtures with Odds (US_010, US_011)
 */
export const getDailyFixturesService = async (targetDate) => {
    const today = targetDate || new Date().toISOString().split('T')[0];
    const now = Date.now();
    if (dailyCache.date === today && (now - dailyCache.timestamp < CACHE_TTL) && dailyCache.data) return dailyCache.data;

    try {
        let fixturesResponse = await footballApi.getFixturesByDate(today);
        let fixtures = fixturesResponse.response || [];
        if (fixtures.length < 10 && (!targetDate || targetDate === today)) {
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            fixtures = [...fixtures, ...((await footballApi.getFixturesByDate(tomorrow)).response || [])];
        }

        const allowedApiIds = await getMonitoredApiIds();
        fixtures = fixtures.filter(f => allowedApiIds.includes(f.league.id));

        const oddsMap = {};
        try {
            const oddsRes = await footballApi.getOdds({ date: today });
            (oddsRes.response || []).forEach(item => { oddsMap[item.fixture.id] = item; });
        } catch (err) { console.error("⚠️ Failed to fetch odds:", err.message); }

        const fixtureIds = fixtures.map(f => f.fixture.id);
        const predictionsMap = {};
        if (fixtureIds.length > 0) {
            const preds = await db.all(`SELECT * FROM V3_Predictions WHERE fixture_id IN (${fixtureIds.map(() => '?').join(',')})`, fixtureIds);
            preds.forEach(p => { predictionsMap[p.fixture_id] = p; });
        }

        const mappedFixtures = fixtures.map(f => {
            const odds = mapLiveOdds(oddsMap[f.fixture.id]);
            const pred = predictionsMap[f.fixture.id];
            let impliedProbs = odds?.match_winner ? probabilityService.calculateFairProbabilities(odds.match_winner)?.probabilities : null;

            return {
                ...f,
                live_odds: odds,
                implied_probabilities: impliedProbs,
                ai_prediction: pred ? {
                    probabilities: { home: parseProbability(pred.prob_home), draw: parseProbability(pred.prob_draw), away: parseProbability(pred.prob_away) },
                    edge: pred.edge_value, confidence: pred.confidence_score, risk: pred.risk_level
                } : null
            };
        });

        const countryRanks = (await db.all("SELECT name, importance_rank FROM V3_Countries")).reduce((acc, c) => ({ ...acc, [c.name]: c.importance_rank }), {});
        const leagueRanks = (await db.all("SELECT api_id, importance_rank FROM V3_Leagues")).reduce((acc, l) => ({ ...acc, [l.api_id]: l.importance_rank }), {});

        mappedFixtures.forEach(f => {
            f.league.country_importance_rank = countryRanks[f.league.country] || 999;
            f.league.league_importance_rank = leagueRanks[f.league.id] || 999;
        });

        mappedFixtures.sort((a, b) => (a.league.country_importance_rank - b.league.country_importance_rank) || (a.league.league_importance_rank - b.league.league_importance_rank) || a.league.name.localeCompare(b.league.name) || (new Date(a.fixture.date) - new Date(b.fixture.date)));

        dailyCache = { date: today, data: mappedFixtures, timestamp: Date.now() };
        return mappedFixtures;
    } catch (error) {
        console.error("Error in getDailyFixturesService:", error);
        throw error;
    }
};

/**
 * Get Upcoming Matches for Selected Leagues (US_022, AC 2 & 3)
 * Fetches next 10 fixtures for each league ID.
 * Falls back to Top 5 most important leagues from local DB.
 */
export const getUpcomingByLeaguesService = async (leagueIds = []) => {
    console.log(`📅 Fetching upcoming matches for league IDs: [${leagueIds.join(', ')}]`);

    // Fetch all leagues with their importance rank & name for enrichment
    // Internal league_id and api_id (API-Football external id) are DIFFERENT
    let allDbLeagues = [];
    try {
        allDbLeagues = await db.all(
            "SELECT l.league_id, l.api_id, l.name, l.logo_url as logo, c.name as country, c.importance_rank FROM V3_Leagues l JOIN V3_Countries c ON l.country_id = c.country_id ORDER BY c.importance_rank ASC"
        );
        console.log(`   🏛️ Loaded ${allDbLeagues.length} leagues from local DB for enrichment`);
    } catch (dbErr) {
        console.error('   ⚠️ DB lookup failed:', dbErr.message);
    }

    // Build maps keyed by BOTH internal id and api_id for lookups
    const byInternalId = {}; // league_id -> row
    const byApiId = {};      // api_id -> row
    allDbLeagues.forEach(l => {
        byInternalId[l.league_id] = l;
        byApiId[l.api_id] = l;
    });

    // Resolve target internal IDs: fallback to Top 5 if none given
    let targetInternalIds = (leagueIds || []).filter(Boolean).map(Number);
    if (targetInternalIds.length === 0) {
        targetInternalIds = allDbLeagues.slice(0, 5).map(l => l.league_id);
        console.log(`   ℹ️ No leagues selected — defaulting to Top 5: [${targetInternalIds.join(', ')}]`);
    }

    if (targetInternalIds.length === 0) {
        return { groups: [], meta: { leagueCount: 0, totalFixtures: 0, source: 'empty' } };
    }

    // Translate internal IDs → api_ids for the Football API call
    const apiIdPairs = targetInternalIds.map(internalId => ({
        internalId,
        apiId: byInternalId[internalId]?.api_id
    })).filter(p => p.apiId); // skip any not found in DB

    console.log(`   🔗 Resolved ${apiIdPairs.length} api_ids: [${apiIdPairs.map(p => p.apiId).join(', ')}]`);

    // Fetch upcoming fixtures for each league in parallel by API ID

    // Also fetch today's odds by date (best effort)
    const today = new Date().toISOString().split('T')[0];
    let oddsMap = {};
    try {
        const oddsRes = await footballApi.getOdds({ date: today });
        (oddsRes.response || []).forEach(item => { oddsMap[item.fixture.id] = item; });
    } catch (_) { /* odds optional */ }

    try {
        let activeLeagues = leagueIds;
        if (activeLeagues.length === 0) {
            const top5 = await db.all(`SELECT l.league_id FROM V3_Leagues l JOIN V3_Countries c ON l.country_id = c.country_id ORDER BY c.importance_rank ASC, l.importance_rank ASC LIMIT 5`);
            activeLeagues = top5.map(r => r.league_id);
        }

        const leagueMetas = await db.all(`SELECT league_id, api_id, name, logo_url FROM V3_Leagues WHERE league_id IN (${activeLeagues.map(() => '?').join(',')})`, activeLeagues);
        const results = [];

        for (const meta of leagueMetas) {
            const fixturesRes = await footballApi.getFixturesByLeague(meta.api_id, { next: 10 });
            const fixtures = fixturesRes.response || [];
            if (fixtures.length === 0) continue;

            const fixtureIds = fixtures.map(f => f.fixture.id);
            const oddsData = await footballApi.getOdds({ league: meta.api_id, season: fixtures[0].league.season }) || { response: [] };
            const oddsMap = (oddsData.response || []).reduce((acc, item) => ({ ...acc, [item.fixture.id]: item }), {});
            const predictions = (await db.all(`SELECT * FROM V3_Predictions WHERE fixture_id IN (${fixtureIds.map(() => '?').join(',')})`, fixtureIds)).reduce((acc, p) => ({ ...acc, [p.fixture_id]: p }), {});

            const mapped = fixtures.map(f => {
                const odds = mapLiveOdds(oddsMap[f.fixture.id]);
                const pred = predictions[f.fixture.id];
                return {
                    ...f,
                    live_odds: odds,
                    ai_prediction: pred ? {
                        probabilities: { home: parseProbability(pred.prob_home), draw: parseProbability(pred.prob_draw), away: parseProbability(pred.prob_away) },
                        edge: pred.edge_value, confidence: pred.confidence_score, risk: pred.risk_level
                    } : null
                };
            });

            results.push({ league_id: meta.league_id, name: meta.name, logo: meta.logo_url, fixtures: mapped });
        }
        return results;
    } catch (error) {
        console.error("Error in getUpcomingByLeaguesService:", error);
        throw error;
    }
};

/**
 * Get Match Details (US_012)
 * Aggregates Predictions, Lineups, H2H, and Detailed Odds.
 */
/**
 * Helper: Resolve Match Lineups (Official vs Probable)
 */
function resolveMatchLineups(officialLineups, predictionData, homeId, awayId) {
    if (officialLineups?.length > 0) {
        return { type: 'OFFICIAL', home: officialLineups.find(l => l.team.id === homeId), away: officialLineups.find(l => l.team.id === awayId) };
    }
    if (predictionData?.lineups) {
        return { type: 'PROBABLE', home: predictionData.lineups.find(l => l.team.id === homeId), away: predictionData.lineups.find(l => l.team.id === awayId) };
    }
    return { type: 'PROBABLE', home: null, away: null };
}

/**
 * Helper: Resolve H2H (API vs Local DB Fallback)
 */
async function resolveMatchH2H(predictionData, fixtureData) {
    if (predictionData?.h2h?.length > 0) return predictionData.h2h;
    const hId = fixtureData.teams.home.id, aId = fixtureData.teams.away.id;
    const matches = await db.all(`SELECT f.fixture_id as id, f.date, f.goals_home, f.goals_away, f.home_team_id, f.away_team_id FROM V3_Fixtures f WHERE ((f.home_team_id = ? AND f.away_team_id = ?) OR (f.home_team_id = ? AND f.away_team_id = ?)) AND f.status_short IN ('FT', 'AET', 'PEN') AND f.date < ? ORDER BY f.date DESC LIMIT 5`, [hId, aId, aId, hId, fixtureData.fixture.date]);
    return matches.map(m => ({
        fixture: { id: m.id, date: m.date },
        teams: { home: { id: m.home_team_id, name: m.home_team_id === hId ? fixtureData.teams.home.name : fixtureData.teams.away.name }, away: { id: m.away_team_id, name: m.away_team_id === aId ? fixtureData.teams.away.name : fixtureData.teams.home.name } },
        goals: { home: m.goals_home, away: m.goals_away }, league: { name: "Local DB History" }
    }));
}

/**
 * Helper: Compute Predictive Features (Fatigue, Momentum, Health)
 */
function computePredictiveFeatures(fixtureData, predictionData, injuriesData, h2h) {
    const features = { fatigue: { home: null, away: null }, momentum: { home_gd: null, away_gd: null }, squad_health: { home: 'Optimal', away: 'Optimal' }, psychological_edge: 'Neutral' };
    try {
        const getMom = (last5) => last5 ? last5.split('').reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) : null;
        features.momentum.home_gd = getMom(predictionData?.teams?.home?.last_5);
        features.momentum.away_gd = getMom(predictionData?.teams?.away?.last_5);
        const evalHealth = (tid) => { const count = injuriesData.filter(i => i.team.id === tid).length; return count === 0 ? 'Optimal' : (count <= 2 ? `Moderate (${count} missing)` : `Critical (${count} missing)`); };
        features.squad_health.home = evalHealth(fixtureData.teams.home.id);
        features.squad_health.away = evalHealth(fixtureData.teams.away.id);
        if (h2h.length > 0) {
            const hVenue = h2h.filter(m => m.teams.home.id === fixtureData.teams.home.id);
            if (hVenue.length > 0) {
                const winRate = Math.round((hVenue.filter(m => m.goals.home > m.goals.away).length / hVenue.length) * 100);
                features.psychological_edge = winRate >= 60 ? `Home Dominant (${winRate}%)` : (winRate <= 30 ? `Away Edge (${100 - winRate}%)` : 'Neutral');
            }
        }
    } catch (e) { console.warn("Predictive compute failed:", e.message); }
    return features;
}

/**
 * Get Match Details (US_012)
 */
export const getMatchDetailsService = async (fixtureId) => {
    console.log(`🔍 Fetching details for match ${fixtureId}...`);

    const [fixtureRes, predictionsRes, lineupsRes, oddsRes, injuriesRes, mlPrediction] = await Promise.all([
        footballApi.getFixtureById(fixtureId), footballApi.getPredictions(fixtureId), footballApi.getFixtureLineups(fixtureId), footballApi.getOdds({ fixture: fixtureId }), footballApi.getInjuries(fixtureId), mlService.getPredictionForFixture(fixtureId)
    ]);
    if (!fixtureRes.response?.[0]) throw new Error("Fixture not found");
    const fixtureData = fixtureRes.response[0], predictionData = predictionsRes.response?.[0], officialLineups = lineupsRes.response, oddsData = oddsRes.response?.[0], injuriesData = injuriesRes.response || [];

    const homeId = fixtureData.teams.home.id, awayId = fixtureData.teams.away.id;
    let homeSquad = [], awaySquad = [], mEvents = [], mStats = [];
    try {
        const promises = [footballApi.getSquads(homeId), footballApi.getSquads(awayId)];
        if (['FT', 'AET', 'PEN'].includes(fixtureData.fixture.status.short)) promises.push(footballApi.getFixtureEvents(fixtureId), footballApi.getFixtureStatistics(fixtureId));
        const res = await Promise.all(promises);
        homeSquad = res[0]?.response?.[0]?.players || []; awaySquad = res[1]?.response?.[0]?.players || [];
        if (promises.length > 2) { mEvents = res[2]?.response || []; mStats = res[3]?.response || []; }
    } catch (e) {
        console.error("Secondary data fetch error (Ignored for robustness):", e);
    }

    const lineups = resolveMatchLineups(officialLineups, predictionData, homeId, awayId);
    const h2h = await resolveMatchH2H(predictionData, fixtureData);
    const detailedOdds = oddsData?.bookmakers?.find(b => [52, 11].includes(b.id) || b.id === oddsData.bookmakers[0].id)?.bets.filter(b => [1, 5, 8, 12].includes(b.id)) || [];

    const investment = await (async () => {
        const m1X2 = detailedOdds.find(m => m.id === 1);
        if (!m1X2 || !mlPrediction?.probabilities) return null;
        const o = {}; m1X2.values.forEach(v => { o[v.value.toLowerCase()] = v.odd; });
        const fair = probabilityService.calculateFairProbabilities(o);
        if (!fair) return null;
        const league = await db.get(`SELECT brier_score, total_bets FROM V3_Backtest_Results WHERE league_id = ? ORDER BY created_at DESC LIMIT 1`, [fixtureData.league.id]);
        const res = QuantService.calculateValue(mlPrediction.probabilities, fair.probabilities, { hasLineups: officialLineups?.length > 0, volatility: MarketVolatilityService.getVolatilityReport(fixtureId, 1), brierScore: league?.brier_score, leagueHistoryCount: league?.total_bets || 0 });
        await db.run(`INSERT INTO V3_Predictions (fixture_id, league_id, prob_home, prob_draw, prob_away, edge_value, confidence_score, risk_level) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(fixture_id) DO UPDATE SET prob_home=excluded.prob_home, prob_draw=excluded.prob_draw, prob_away=excluded.prob_away, edge_value=excluded.edge_value, confidence_score=excluded.confidence_score, risk_level=excluded.risk_level, prediction_date=CURRENT_TIMESTAMP`, [fixtureId, fixtureData.league.id, mlPrediction.probabilities.home, mlPrediction.probabilities.draw, mlPrediction.probabilities.away, res.edge, res.confidence, res.risk_level]);
        return res;
    })();

    return {
        fixture: fixtureData, lineups, stats: { form: { home: predictionData?.teams?.home?.last_5 || [], away: predictionData?.teams?.away?.last_5 || [] }, h2h },
        odds: detailedOdds, probabilities: detailedOdds.reduce((acc, m) => { const mo = {}; m.values.forEach(v => { mo[v.value] = v.odd; }); const f = probabilityService.calculateFairProbabilities(mo); if (f) acc[m.id] = f; return acc; }, {}),
        market_movement: MarketVolatilityService.getVolatilityReport(fixtureId, 1), ml_prediction: mlPrediction, narrative: await NarrativeService.encodeContext(fixtureId), investment_value: investment,
        prediction: predictionData, injuries: injuriesData, events: mEvents, matchStats: mStats, squads: { home: homeSquad, away: awaySquad }, predictiveFeatures: computePredictiveFeatures(fixtureData, predictionData, injuriesData, h2h)
    };
};

/**
 * Helper: Create Smart Snapshot for ML (US_017)
 */
async function createSmartSnapshot(fixtureId) {
    try {
        const match = await getMatchDetailsService(fixtureId);
        const homeId = match.fixture?.teams?.home?.id, awayId = match.fixture?.teams?.away?.id;
        if (!homeId || !awayId) return;

        const snapSql = `INSERT INTO V3_Feature_Snapshots (fixture_id, team_id, feature_type, feature_data) VALUES (?, ?, ?, ?) ON CONFLICT(fixture_id, team_id, feature_type) DO UPDATE SET feature_data = excluded.feature_data, snapshot_timestamp = CURRENT_TIMESTAMP`;
        if (match.lineups?.home) await db.run(snapSql, [fixtureId, homeId, 'SQUAD', JSON.stringify(match.lineups.home)]);
        if (match.lineups?.away) await db.run(snapSql, [fixtureId, awayId, 'SQUAD', JSON.stringify(match.lineups.away)]);
        if (match.stats?.form?.home) await db.run(snapSql, [fixtureId, homeId, 'FORM', JSON.stringify(match.stats.form.home)]);
        if (match.stats?.form?.away) await db.run(snapSql, [fixtureId, awayId, 'FORM', JSON.stringify(match.stats.form.away)]);
        db.save(false);
    } catch (e) { console.error("Snapshot failed:", e.message); }
}

/**
 * Save Match Odds (US_016)
 */
export const saveMatchOddsService = async (fixtureId) => {
    const fixture = await db.get("SELECT league_id FROM V3_Fixtures WHERE fixture_id = ?", [fixtureId]);
    if (fixture) {
        const monitored = await getMonitoredApiIds();
        const leagueApiId = (await db.get("SELECT api_id FROM V3_Leagues WHERE league_id = ?", [fixture.league_id]))?.api_id;
        if (!monitored.includes(leagueApiId)) return { success: false, reason: 'unmonitored_league' };
    }

    const oddsRes = await footballApi.getOdds({ fixture: fixtureId });
    const bookmakers = oddsRes.response?.[0]?.bookmakers;
    if (!bookmakers?.length) throw new Error("No odds available");

    const bookie = bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[0].id) || bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[1].id) || bookmakers[0];
    const sql = `INSERT INTO V3_Odds(fixture_id, bookmaker_id, market_id, value_home_over, value_draw, value_away_under, handicap_value, updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(fixture_id, bookmaker_id, market_id, handicap_value) DO UPDATE SET value_home_over=excluded.value_home_over, value_draw=excluded.value_draw, value_away_under=excluded.value_away_under, updated_at=CURRENT_TIMESTAMP`;

    let count = 0;
    for (const m of bookie.bets) {
        let v1 = null, v2 = null, v3 = null, h = null;
        if (m.id === 1) { v1 = m.values.find(v => v.value === 'Home')?.odd; v2 = m.values.find(v => v.value === 'Draw')?.odd; v3 = m.values.find(v => v.value === 'Away')?.odd; }
        else if (m.id === 5) { const o = m.values.find(v => v.value === 'Over 2.5'), u = m.values.find(v => v.value === 'Under 2.5'); if (o && u) { v1 = o.odd; v3 = u.odd; h = 2.5; } }
        if (v1 || v2 || v3) { await db.run(sql, [fixtureId, bookie.id, m.id, v1, v2, v3, h]); count++; }
    }

    await db.run("UPDATE V3_Fixtures SET has_odds = 1 WHERE fixture_id = ?", [fixtureId]);
    await createSmartSnapshot(fixtureId);
    return { success: true, count, bookmaker: bookie.name };
};
