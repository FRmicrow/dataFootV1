import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import probabilityService from './probabilityService.js';
import MarketVolatilityService from './MarketVolatilityService.js';
import mlService from './mlService.js';
import QuantService from './quantService.js';
import NarrativeService from './narrativeService.js';
import { BOOKMAKER_PRIORITY } from '../../config/betting.js';

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
const getTrackedLeagues = () => {
    try {
        const row = db.get("SELECT tracked_leagues FROM V3_System_Preferences LIMIT 1");
        if (!row || !row.tracked_leagues) return [];
        return JSON.parse(row.tracked_leagues);
    } catch (e) {
        console.error("⚠️ Failed to parse tracked_leagues:", e.message);
        return [];
    }
};

/**
 * Service to handle Live Bet logic (US_010, US_011, US_012)
 */

/**
 * Get Daily Fixtures with Odds (US_010, US_011)
 * Fetches fixtures for today. If < 10, fetches tomorrow's.
 * Merges with Odds.
 * US_131: Respects 'tracked_leagues' activation switch.
 */
export const getDailyFixturesService = async (targetDate) => {
    const today = targetDate || new Date().toISOString().split('T')[0];
    const now = Date.now();
    const isToday = !targetDate || targetDate === new Date().toISOString().split('T')[0];

    // US_131: Load Tracked Leagues
    const trackedLeagues = getTrackedLeagues();
    const hasTracking = trackedLeagues.length > 0;

    // 1. Check Cache
    if (dailyCache.date === today && (now - dailyCache.timestamp < CACHE_TTL) && dailyCache.data) {
        console.log('⚡ Serving Live Bet Dashboard from Cache');
        return dailyCache.data;
    }

    console.log(`🎰 Fetching Live Bet Dashboard for ${today}... ${hasTracking ? `(Monitoring ${trackedLeagues.length} leagues)` : '(Default: Top 5 Mode)'}`);

    try {
        // 2. Fetch Fixtures for Today
        let fixturesResponse = await footballApi.getFixturesByDate(today);
        let fixtures = fixturesResponse.response || [];

        // 3. Fallback logic: If < 10 matches AND it's a request for "today" without specific targetDate, fetch tomorrow
        if (fixtures.length < 10 && isToday) {
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            console.log(`   Detailed: Only ${fixtures.length} matches today. Fetching tomorrow (${tomorrow})...`);
            const tomorrowResponse = await footballApi.getFixturesByDate(tomorrow);
            fixtures = [...fixtures, ...(tomorrowResponse.response || [])];
        }

        // US_131: Strategic Activation Switch - Filtering
        // Only keep leagues that are 'tracked' or match the 'Top 5' fallback if tracking is empty.
        let allowedApiIds = [];
        if (hasTracking) {
            // Tracked leagues are stored by internal ID. We need to map them to api_ids.
            const placeholders = trackedLeagues.map(() => '?').join(',');
            const rows = db.all(`SELECT api_id FROM V3_Leagues WHERE league_id IN (${placeholders})`, trackedLeagues);
            allowedApiIds = rows.map(r => r.api_id);
        } else {
            // Fallback: Top 5 most important leagues
            const top5 = db.all(`
                SELECT l.api_id 
                FROM V3_Leagues l 
                JOIN V3_Countries c ON l.country_id = c.country_id 
                ORDER BY c.importance_rank ASC, l.importance_rank ASC 
                LIMIT 5
            `);
            allowedApiIds = top5.map(r => r.api_id);
            console.log(`   🛰️ Activation Switch: No tracked leagues. Falling back to Top 5 API IDs: [${allowedApiIds.join(', ')}]`);
        }

        const filteredFixtures = fixtures.filter(f => allowedApiIds.includes(f.league.id));
        const skippedCount = fixtures.length - filteredFixtures.length;
        if (skippedCount > 0) {
            console.log(`   🛡️ Activation Switch: Skipped ${skippedCount} fixtures from non-monitored leagues.`);
        }
        fixtures = filteredFixtures;

        // 4. Fetch Odds (Bulk) - Note: This endpoint is heavy, filtering by bookmaker/bet might be needed if API allows
        // API-Football /odds endpoint with date returns a lot. We try to get for specific date.
        // We'll fetch for Today. If we added Tomorrow, we might need a second call, but let's stick to Today's odds for now to save quota.
        // Actually, for the "Good Bet" indicator, we need odds.
        // Let's try to fetch odds for the *dates* we have fixtures for.
        // Optimization: Fetch odds only for the 'today' batch mostly.

        let oddsMap = {};
        try {
            console.log(`   Fetching Odds for ${today}...`);
            const oddsResponse = await footballApi.getOdds({ date: today });
            if (oddsResponse.response) {
                oddsResponse.response.forEach(item => {
                    oddsMap[item.fixture.id] = item;
                });
            }
        } catch (err) {
            console.error("   ⚠️ Failed to fetch odds:", err.message);
        }

        const fixtureIds = fixtures.map(f => f.fixture.id);
        const predictionsMap = {};
        if (fixtureIds.length > 0) {
            const placeholders = fixtureIds.map(() => '?').join(',');
            const preds = db.all(`SELECT * FROM V3_Predictions WHERE fixture_id IN (${placeholders})`, fixtureIds);
            preds.forEach(p => { predictionsMap[p.fixture_id] = p; });
        }

        // 5. Merge & Map Data
        const mappedFixtures = fixtures.map(f => {
            const fixtureId = f.fixture.id;
            const oddsData = oddsMap[fixtureId];
            const savedPrediction = predictionsMap[fixtureId];

            // Resolve Importance Rank from Local DB
            // We need to look up Country -> importance_rank
            // Since we can't do N DB calls, we might load countries once or rely on default.
            // Let's do a quick lookup helper or just use default.
            // For better performance, let's fetch all V3_Countries once and create a map.

            // Odds Mapping (US_011)
            let displayOdds = null;
            if (oddsData && oddsData.bookmakers.length > 0) {
                // Priority: Winamax (52) -> Unibet (11) -> First
                const PREFERRED_IDS = [52, 11];
                let bookmaker = oddsData.bookmakers.find(b => PREFERRED_IDS.includes(b.id));
                if (!bookmaker) bookmaker = oddsData.bookmakers[0];

                // Market 1: Match Winner (1N2)
                const winMarket = bookmaker.bets.find(b => b.id === 1);
                // Market 5: Goals Over/Under
                const goalsMarket = bookmaker.bets.find(b => b.id === 5);

                // Helper to safely extract odd value
                const getOdd = (arr, val) => arr?.find(k => k.value === val)?.odd;

                displayOdds = {
                    match_winner: winMarket ? {
                        home: getOdd(winMarket.values, "Home"),
                        draw: getOdd(winMarket.values, "Draw"),
                        away: getOdd(winMarket.values, "Away")
                    } : null,
                    goals_ou25: goalsMarket ? {
                        over: getOdd(goalsMarket.values, "Over 2.5"),
                        under: getOdd(goalsMarket.values, "Under 2.5")
                    } : null
                };
            }

            // Probability normalization helper (handles both "45%" and "0.45" formats)
            const parseProb = (p) => {
                if (p === null || p === undefined) return 0;
                if (typeof p === 'number') return p;
                if (typeof p === 'string') {
                    if (p.includes('%')) return (parseFloat(p) || 0) / 100;
                    return parseFloat(p) || 0;
                }
                return 0;
            };

            let impliedProbs = null;
            if (displayOdds?.match_winner) {
                const fair = probabilityService.calculateFairProbabilities(displayOdds.match_winner);
                if (fair) impliedProbs = fair.probabilities;
            }

            return {
                ...f,
                live_odds: displayOdds, // Renamed from 'odds' to match frontend prop
                implied_probabilities: impliedProbs,
                ai_prediction: savedPrediction ? {
                    probabilities: {
                        home: parseProb(savedPrediction.prob_home),
                        draw: parseProb(savedPrediction.prob_draw),
                        away: parseProb(savedPrediction.prob_away)
                    },
                    edge: savedPrediction.edge_value,
                    confidence: savedPrediction.confidence_score,
                    risk: savedPrediction.risk_level
                } : null
            };
        });

        const countries = db.all("SELECT name, importance_rank FROM V3_Countries");
        const countryRankMap = {};
        countries.forEach(c => countryRankMap[c.name] = c.importance_rank);

        const leagues = db.all("SELECT api_id, importance_rank FROM V3_Leagues");
        const leagueRankMap = {};
        leagues.forEach(l => leagueRankMap[l.api_id] = l.importance_rank);

        mappedFixtures.forEach(f => {
            const countryName = f.league.country;
            f.league.country_importance_rank = countryRankMap[countryName] || 999;
            f.league.league_importance_rank = leagueRankMap[f.league.id] || 999;
        });

        // 7. Sort (US_010 AC 2 / US_052)
        // 1. Country Importance Rank (ASC)
        // 2. League Importance Rank (ASC)
        // 3. League Name
        // 4. Date
        mappedFixtures.sort((a, b) => {
            if (a.league.country_importance_rank !== b.league.country_importance_rank) {
                return a.league.country_importance_rank - b.league.country_importance_rank;
            }
            if (a.league.league_importance_rank !== b.league.league_importance_rank) {
                return a.league.league_importance_rank - b.league.league_importance_rank;
            }
            if (a.league.name !== b.league.name) {
                return a.league.name.localeCompare(b.league.name);
            }
            return new Date(a.fixture.date) - new Date(b.fixture.date);
        });

        // Update Cache
        dailyCache = {
            date: today,
            data: mappedFixtures,
            timestamp: Date.now()
        };

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
        allDbLeagues = db.all(
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
    const results = await Promise.allSettled(
        apiIdPairs.map(({ apiId }) => footballApi.getNextFixturesByLeague(apiId, 10))
    );

    // Also fetch today's odds by date (best effort)
    const today = new Date().toISOString().split('T')[0];
    let oddsMap = {};
    try {
        const oddsRes = await footballApi.getOdds({ date: today });
        (oddsRes.response || []).forEach(item => { oddsMap[item.fixture.id] = item; });
    } catch (_) { /* odds optional */ }

    // Build odds extraction helper
    const extractOdds = (fixtureId) => {
        const oddsData = oddsMap[fixtureId];
        if (!oddsData || !oddsData.bookmakers?.length) return null;
        const PREFERRED_IDS = [52, 11];
        let bookmaker = oddsData.bookmakers.find(b => PREFERRED_IDS.includes(b.id)) || oddsData.bookmakers[0];
        const winMarket = bookmaker.bets.find(b => b.id === 1);
        const goalsMarket = bookmaker.bets.find(b => b.id === 5);
        const getOdd = (arr, val) => arr?.find(k => k.value === val)?.odd;
        return {
            match_winner: winMarket ? {
                home: getOdd(winMarket.values, "Home"),
                draw: getOdd(winMarket.values, "Draw"),
                away: getOdd(winMarket.values, "Away")
            } : null,
            goals_ou25: goalsMarket ? {
                over: getOdd(goalsMarket.values, "Over 2.5"),
                under: getOdd(goalsMarket.values, "Under 2.5")
            } : null
        };
    };

    // Group fixtures by league, sorted by importance_rank
    const groups = [];
    results.forEach((result, i) => {
        const { internalId, apiId } = apiIdPairs[i];
        const dbLeague = byInternalId[internalId];
        if (result.status === 'rejected' || !result.value?.response?.length) return;

        const fixtures = result.value.response.map(f => ({
            ...f,
            live_odds: extractOdds(f.fixture.id),
            league: {
                ...f.league,
                importance_rank: dbLeague?.importance_rank ?? 999
            }
        }));

        // Sort fixtures within league by date
        fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

        groups.push({
            league: {
                id: internalId,
                api_id: apiId,
                name: dbLeague?.name || fixtures[0]?.league?.name || `League ${apiId}`,
                logo: dbLeague?.logo || fixtures[0]?.league?.logo || '',
                country: dbLeague?.country || fixtures[0]?.league?.country || '',
                importance_rank: dbLeague?.importance_rank ?? 999
            },
            fixtures
        });
    });

    // Sort groups by importance_rank (AC 3)
    groups.sort((a, b) => a.league.importance_rank - b.league.importance_rank);

    // US_172: Fetch AI predictions for all collected fixture IDs
    const allFixtureIds = groups.flatMap(g => g.fixtures.map(f => f.fixture.id));
    const predictionsMap = {};
    if (allFixtureIds.length > 0) {
        const placeholders = allFixtureIds.map(() => '?').join(',');
        try {
            const preds = db.all(`SELECT * FROM V3_Predictions WHERE fixture_id IN (${placeholders})`, allFixtureIds);
            preds.forEach(p => { predictionsMap[p.fixture_id] = p; });
        } catch (e) {
            console.error("⚠️ Failed to fetch predictions for upcoming dashboard:", e.message);
        }
    }

    // Map AI predictions back to fixtures
    groups.forEach(g => {
        g.fixtures.forEach(f => {
            const savedPrediction = predictionsMap[f.fixture.id];

            // Probability normalization helper (handles both "45%" and "0.45" formats)
            const parseProb = (p) => {
                if (p === null || p === undefined) return 0;
                if (typeof p === 'number') return p;
                if (typeof p === 'string') {
                    if (p.includes('%')) return (parseFloat(p) || 0) / 100;
                    return parseFloat(p) || 0;
                }
                return 0;
            };

            let impliedProbs = null;
            if (f.live_odds?.match_winner) {
                const fair = probabilityService.calculateFairProbabilities(f.live_odds.match_winner);
                if (fair) impliedProbs = fair.probabilities;
            }

            f.implied_probabilities = impliedProbs;
            f.ai_prediction = savedPrediction ? {
                probabilities: {
                    home: parseProb(savedPrediction.prob_home),
                    draw: parseProb(savedPrediction.prob_draw),
                    away: parseProb(savedPrediction.prob_away)
                },
                edge: savedPrediction.edge_value,
                confidence: savedPrediction.confidence_score,
                risk: savedPrediction.risk_level
            } : null;
        });
    });

    return {
        groups,
        meta: {
            leagueCount: groups.length,
            totalFixtures: groups.reduce((sum, g) => sum + g.fixtures.length, 0),
            source: leagueIds.length > 0 ? 'selected' : 'default_top5'
        }
    };
};

/**
 * Get Match Details (US_012)
 * Aggregates Predictions, Lineups, H2H, and Detailed Odds.
 */
export const getMatchDetailsService = async (fixtureId) => {
    console.log(`🔍 Fetching details for match ${fixtureId}...`);

    // Parallel Fetching for performance
    const [
        fixtureRes,
        predictionsRes,
        lineupsRes,
        oddsRes,
        injuriesRes,
        mlPrediction
    ] = await Promise.all([
        footballApi.getFixtureById(fixtureId),
        footballApi.getPredictions(fixtureId),
        footballApi.getFixtureLineups(fixtureId),
        footballApi.getOdds({ fixture: fixtureId }),
        footballApi.getInjuries(fixtureId),
        mlService.getPredictionForFixture(fixtureId)
    ]);

    if (!fixtureRes.response || fixtureRes.response.length === 0) {
        throw new Error("Fixture not found");
    }

    const fixtureData = fixtureRes.response[0];
    const predictionData = predictionsRes.response?.[0] || null;
    const officialLineups = lineupsRes.response;
    const oddsData = oddsRes.response?.[0];
    const injuriesData = injuriesRes.response || [];

    // 1b. Fetch Squads now that we know the team IDs
    const homeTeamId = fixtureData.teams.home.id;
    const awayTeamId = fixtureData.teams.away.id;
    const isFinished = ['FT', 'AET', 'PEN'].includes(fixtureData.fixture.status.short);

    let homeSquadData = [];
    let awaySquadData = [];
    let matchEvents = [];
    let matchStats = [];

    try {
        const promises = [
            footballApi.getSquads(homeTeamId),
            footballApi.getSquads(awayTeamId)
        ];

        if (isFinished) {
            promises.push(footballApi.getFixtureEvents(fixtureId), footballApi.getFixtureStatistics(fixtureId));
        }

        const results = await Promise.all(promises);

        homeSquadData = results[0]?.response?.[0]?.players || [];
        awaySquadData = results[1]?.response?.[0]?.players || [];

        if (isFinished) {
            matchEvents = results[2]?.response || [];
            matchStats = results[3]?.response || [];
        }
    } catch (e) {
        console.error("Secondary data fetch error (Ignored for robustness):", e);
    }

    // 1. Lineups Logic (AC 1)
    // If official lineups exist (array > 0), use them.
    // Else fall back to probable predictions.
    let lineups = {
        type: 'PROBABLE', // Default
        home: null,
        away: null
    };

    if (officialLineups && officialLineups.length > 0) {
        lineups.type = 'OFFICIAL';
        lineups.home = officialLineups.find(l => l.team.id === fixtureData.teams.home.id);
        lineups.away = officialLineups.find(l => l.team.id === fixtureData.teams.away.id);
    } else if (predictionData && predictionData.lineups) {
        // format is different in predictions, usually a simple list or similar structure
        // API-Football predictions lineups structure: { home: { formation: "", startXI: [] }, away: ... }
        // We'll normalize to match expected frontend structure if needed, or pass raw.
        lineups.type = 'PROBABLE';
        lineups.home = predictionData.lineups.filter(l => l.team.id === fixtureData.teams.home.id)[0];
        lineups.away = predictionData.lineups.filter(l => l.team.id === fixtureData.teams.away.id)[0];
        // Note: Prediction lineups structure might differ from official. 
        // We pass what we have; frontend should handle "Probable" rendering.
    }

    // 2. Head to Head (AC 2)
    // Predictions endpoint often includes h2h and last 5 form!
    let h2h = predictionData?.h2h || []; // Fallback empty

    // Fallback: If API H2H is empty, check Local DB V3_Fixtures
    if (h2h.length === 0) {
        try {
            const hId = fixtureData.teams.home.id;
            const aId = fixtureData.teams.away.id;

            // Get last 5 meetings from DB
            const sql = `
                SELECT 
                    fixture_id as id, 
                    date,
                    league_id,
                    home_team_id, 
                    away_team_id,
                    goals_home,
                    goals_away
                FROM V3_Fixtures 
                WHERE ((home_team_id = ? AND away_team_id = ?) OR (home_team_id = ? AND away_team_id = ?))
                AND status_short IN ('FT', 'AET', 'PEN')
                AND date < ?
                ORDER BY date DESC
                LIMIT 5
            `;

            // We need league names too... a bit complex for raw SQL unless we join.
            // For now, let's keep it simple or do a join.
            // Actually, frontend expects a specific structure: { fixture: { date, id }, teams: { home: { name... }, away: { ... } }, goals: { home, away }, league: { name } }
            // To do this properly, we need names.

            const matches = db.all(sql, [hId, aId, aId, hId, fixtureData.fixture.date]);

            if (matches.length > 0) {
                // We need team names. Use current fixture names as proxy if IDs match? 
                // Or fetch from V3_Teams if available.
                // Shortcuts: Using names from current fixture context
                const hName = fixtureData.teams.home.name;
                const aName = fixtureData.teams.away.name;

                h2h = matches.map(m => ({
                    fixture: { id: m.id, date: m.date },
                    teams: {
                        home: { id: m.home_team_id, name: m.home_team_id === hId ? hName : aName },
                        away: { id: m.away_team_id, name: m.away_team_id === aId ? aName : hName }
                    },
                    goals: { home: m.goals_home, away: m.goals_away },
                    league: { name: "Local DB History" } // Placeholder
                }));
                console.log(`   ✅ Recovered ${h2h.length} H2H matches from Local DB`);
            }
        } catch (err) {
            console.warn("   ⚠️ Local H2H lookup failed:", err.message);
        }
    }

    // Team Form (Last 5)
    const form = {
        home: predictionData?.teams?.home?.last_5 || [],
        away: predictionData?.teams?.away?.last_5 || []
    };

    // 3. Detailed Odds (AC 3)
    let detailedOdds = [];
    if (oddsData && oddsData.bookmakers.length > 0) {
        // Selection logic: Strict Hierarchy based on Config (US_175)
        let bookmaker = oddsData.bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[0].id) ||
            oddsData.bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[1].id) ||
            oddsData.bookmakers[0];

        console.log(`   🎯 Selected Bookmaker for Details: ${bookmaker.name} (ID: ${bookmaker.id})`);

        const TARGET_MARKETS = [1, 5, 8, 12];
        detailedOdds = bookmaker.bets.filter(b => TARGET_MARKETS.includes(b.id));
    }

    // ==========================================
    // US_021 - Predictive Feature Engineering
    // ==========================================
    let predictiveFeatures = {
        fatigue: { home: null, away: null },
        momentum: { home_gd: null, home_cs: null, away_gd: null, away_cs: null },
        squad_health: { home: 'Optimal', away: 'Optimal' },
        psychological_edge: 'Neutral'
    };

    try {
        const fixtureDate = new Date(fixtureData.fixture.date);

        // Feature 1: Fatigue Index (AC 1)
        const getFatigue = (teamId) => {
            const row = db.get(`
                SELECT date FROM V3_Fixtures 
                WHERE (home_team_id = ? OR away_team_id = ?) 
                AND status_short IN ('FT', 'AET', 'PEN') 
                AND date < ? 
                ORDER BY date DESC LIMIT 1
            `, [teamId, teamId, fixtureData.fixture.date]);

            if (row && row.date) {
                const diffTime = Math.abs(fixtureDate - new Date(row.date));
                return Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
            return null;
        };
        predictiveFeatures.fatigue.home = getFatigue(homeTeamId);
        predictiveFeatures.fatigue.away = getFatigue(awayTeamId);

        // Feature 2: Form Momentum (AC 2)
        const getMomentum = (teamStats) => {
            if (teamStats?.goals?.for?.total !== undefined && teamStats?.goals?.against?.total !== undefined) {
                return teamStats.goals.for.total - teamStats.goals.against.total;
            }
            return null;
        };
        predictiveFeatures.momentum.home_gd = getMomentum(predictionData?.teams?.home?.last_5);
        predictiveFeatures.momentum.away_gd = getMomentum(predictionData?.teams?.away?.last_5);

        // Feature 3: Missing Key Player Impact (Squad Health) (AC 3)
        const evalSquadHealth = (teamId) => {
            const teamInjuries = injuriesData.filter(i => i.team.id === teamId);
            if (teamInjuries.length === 0) return 'Optimal';
            if (teamInjuries.length <= 2) return `Moderate (${teamInjuries.length} missing)`;
            return `Critical (${teamInjuries.length} missing)`;
        };
        predictiveFeatures.squad_health.home = evalSquadHealth(homeTeamId);
        predictiveFeatures.squad_health.away = evalSquadHealth(awayTeamId);

        // Feature 4: Psychological Edge (AC 4)
        if (h2h.length > 0) {
            let homeVenueMatches = 0;
            let homeWins = 0;
            h2h.forEach(match => {
                // Determine if played at current Home Team's venue. 
                // We assume if home team ID matches our home team ID, it was at home.
                const mHomeId = match.teams?.home?.id;
                const mAwayId = match.teams?.away?.id;
                if (mHomeId === homeTeamId) {
                    homeVenueMatches++;
                    if (match.goals?.home > match.goals?.away) homeWins++;
                }
            });

            if (homeVenueMatches > 0) {
                const winRate = Math.round((homeWins / homeVenueMatches) * 100);
                if (winRate >= 60) predictiveFeatures.psychological_edge = `Home Dominant (${winRate}% Win Rate)`;
                else if (winRate <= 30) predictiveFeatures.psychological_edge = `Away Edge (${100 - winRate}% Non-Loss Rate)`;
            }
        }
    } catch (fErr) {
        console.warn("⚠️ Failed to compute predictive features:", fErr.message);
    }

    return {
        fixture: fixtureData,
        lineups,
        stats: {
            form,
            h2h
        },
        odds: detailedOdds,
        probabilities: detailedOdds.reduce((acc, market) => {
            // Convert market to odds object for calculator
            const marketOdds = {};
            market.values.forEach(v => {
                marketOdds[v.value] = v.odd;
            });

            const fair = probabilityService.calculateFairProbabilities(marketOdds);
            if (fair) acc[market.id] = fair;
            return acc;
        }, {}),
        market_movement: MarketVolatilityService.getVolatilityReport(fixtureId, 1), // Standard: analyze Match Winner
        ml_prediction: mlPrediction,
        narrative: await NarrativeService.encodeContext(fixtureId),
        investment_value: (() => {
            const market1X2 = detailedOdds.find(m => m.id === 1);
            if (!market1X2 || !mlPrediction?.probabilities) return null;

            // Map detailedOdds values to odds object for calculator
            const marketOdds = {};
            market1X2.values.forEach(v => {
                marketOdds[v.value.toLowerCase()] = v.odd;
            });

            const fairMarket = probabilityService.calculateFairProbabilities(marketOdds);
            if (!fairMarket) return null;

            // Fetch League Accuracy Context (US_160)
            const leagueStats = db.get(`
                SELECT brier_score, total_bets
                FROM V3_Backtest_Results
                WHERE league_id = ?
                ORDER BY created_at DESC LIMIT 1
            `, [fixtureData.league.id]);

            const result = QuantService.calculateValue(
                mlPrediction.probabilities,
                fairMarket.probabilities,
                {
                    hasLineups: officialLineups.length > 0,
                    volatility: MarketVolatilityService.getVolatilityReport(fixtureId, 1),
                    brierScore: leagueStats?.brier_score,
                    leagueHistoryCount: leagueStats?.total_bets || 0
                }
            );

            // Persist to DB (US_160)
            try {
                db.run(`
                    INSERT INTO V3_Predictions (fixture_id, league_id, prob_home, prob_draw, prob_away, edge_value, confidence_score, risk_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(fixture_id) DO UPDATE SET
                        prob_home = excluded.prob_home,
                        prob_draw = excluded.prob_draw,
                        prob_away = excluded.prob_away,
                        edge_value = excluded.edge_value,
                        confidence_score = excluded.confidence_score,
                        risk_level = excluded.risk_level,
                        prediction_date = CURRENT_TIMESTAMP
                `, [
                    fixtureId,
                    fixtureData.league.id,
                    mlPrediction.probabilities.home.toString(),
                    mlPrediction.probabilities.draw.toString(),
                    mlPrediction.probabilities.away.toString(),
                    result.edge,
                    result.confidence,
                    result.risk_level
                ]);
            } catch (dbErr) {
                console.warn("⚠️ Failed to persist prediction to DB:", dbErr.message);
            }

            return result;
        })(),
        prediction: predictionData,
        injuries: injuriesData,
        events: matchEvents,
        matchStats: matchStats,
        squads: {
            home: homeSquadData,
            away: awaySquadData
        },
        predictiveFeatures // Exporting the newly calculated intelligent variables
    };
};

/**
 * Save Match Odds (US_016)
 * Fetches odds from API and saves to V3_Odds.
 */
export const saveMatchOddsService = async (fixtureId) => {
    console.log(`💾 Saving odds for fixture ${fixtureId}...`);

    // US_131: Check if this fixture belongs to a monitored league
    const fixtureLeague = db.get("SELECT league_id FROM V3_Fixtures WHERE fixture_id = ?", [fixtureId]);
    if (fixtureLeague) {
        const trackedLeagues = getTrackedLeagues();
        let isMonitored = false;
        if (trackedLeagues.length > 0) {
            isMonitored = trackedLeagues.includes(fixtureLeague.league_id);
        } else {
            // Check if it's in top 5
            const top5 = db.all(`
                SELECT l.league_id 
                FROM V3_Leagues l 
                JOIN V3_Countries c ON l.country_id = c.country_id 
                ORDER BY c.importance_rank ASC, l.importance_rank ASC 
                LIMIT 5
            `);
            isMonitored = top5.map(r => r.league_id).includes(fixtureLeague.league_id);
        }

        if (!isMonitored) {
            console.log(`   🛡️ Activation Switch: Fixture ${fixtureId} belongs to a non-monitored league (Target: Tracking-Only). Skipping sync.`);
            return { success: false, reason: 'unmonitored_league' };
        }
    }

    // 1. Fetch Latest Odds
    const oddsRes = await footballApi.getOdds({ fixture: fixtureId });
    if (!oddsRes.response || oddsRes.response.length === 0) {
        throw new Error("No odds available for this fixture");
    }

    const oddsData = oddsRes.response[0];
    const bookmakers = oddsData.bookmakers;
    if (!bookmakers || bookmakers.length === 0) {
        throw new Error("No bookmakers available");
    }

    // 2. Select Bookmaker: Strict Hierarchy based on Config (US_175)
    let selectedBookmaker = bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[0].id) ||
        bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[1].id) ||
        bookmakers[0];

    console.log(`   🎯 Selected Bookmaker for Refresh: ${selectedBookmaker.name} (ID: ${selectedBookmaker.id})`);

    const bookmakerId = selectedBookmaker.id;

    // 3. Prepare Bulk Insert/Upsert
    // We want to save ALL markets provided by this bookmaker
    // Schema: fixture_id, bookmaker_id, market_id, [values]
    const markets = selectedBookmaker.bets;

    // SQLite doesn't natively support massive bulk upsert well in one statement if fields vary, 
    // but here we can define specific value mappings for common markets 
    // or just store generic JSON? 
    // The V3_Odds table has specific columns: value_home_over, value_draw, value_away_under, handicap_value
    // We need to map market types to these columns.

    /*
        Mapping Logic:
        Market 1 (1N2): Home -> home, Draw -> draw, Away -> away
        Market 5 (Goals): Over 2.5 -> home (as Over), Under 2.5 -> away (as Under). 
                         Wait, the column names are `value_home_over`, `value_away_under`.
                         So Over -> home_over, Under -> away_under.
        Market 8 (BTTS): Yes -> home, No -> away
        Market 12 (Double Chance): Home/Draw -> home, Home/Away -> draw, Draw/Away -> away ?? 
                                   No, standard 1N2 columns might not fit Double Chance perfectly without convention.
        
        For V1 Foundation, let's focus on Market 1 (1N2) and Market 5 (O/U 2.5) as they fit the schema perfectly.
    */

    const sql = `
        REPLACE INTO V3_Odds (
            fixture_id, bookmaker_id, market_id, 
            value_home_over, value_draw, value_away_under, 
            handicap_value, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    let count = 0;
    try {
        for (const market of markets) {
            let val1 = null, val2 = null, val3 = null, handicap = null;

            if (market.id === 1) { // Match Winner
                val1 = market.values.find(v => v.value === 'Home')?.odd;
                val2 = market.values.find(v => v.value === 'Draw')?.odd;
                val3 = market.values.find(v => v.value === 'Away')?.odd;
            } else if (market.id === 5) { // Goals Over/Under
                const over25 = market.values.find(v => v.value === 'Over 2.5');
                const under25 = market.values.find(v => v.value === 'Under 2.5');
                if (over25 && under25) {
                    val1 = over25.odd;
                    val3 = under25.odd;
                    handicap = 2.5;
                } else {
                    continue;
                }
            } else {
                continue;
            }

            if (val1 || val2 || val3) {
                db.run(sql, [fixtureId, bookmakerId, market.id, val1, val2, val3, handicap]);
                count++;
            }
        }
    } catch (e) {
        console.error("Error during batch odds insert:", e);
        throw e;
    }

    console.log(`   ✅ Saved ${count} markets to V3_Odds`);

    // Update V3_Fixtures has_odds flag
    try {
        db.run("UPDATE V3_Fixtures SET has_odds = 1 WHERE fixture_id = ?", [fixtureId]);
    } catch (e) {
        // Ignore if V3_Fixtures row doesn't exist yet
    }

    // --- US_017 Smart Snapshot ---
    console.log(`📸 Creating Smart Snapshot for ML...`);
    try {
        // Fetch snapshot data (Lineups, Form, Match details)
        const matchData = await getMatchDetailsService(fixtureId);

        const fixtureInfo = matchData.fixture?.fixture;
        const homeTeamId = matchData.fixture?.teams?.home?.id;
        const awayTeamId = matchData.fixture?.teams?.away?.id;

        if (fixtureInfo && homeTeamId && awayTeamId) {
            const snapSql = `
                INSERT INTO V3_Feature_Snapshots (fixture_id, team_id, feature_type, feature_data)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(fixture_id, team_id, feature_type) DO UPDATE SET 
                feature_data = excluded.feature_data, 
                snapshot_timestamp = CURRENT_TIMESTAMP
            `;

            // SQUAD Snapshot
            if (matchData.lineups?.home) {
                db.run(snapSql, [fixtureId, homeTeamId, 'SQUAD', JSON.stringify(matchData.lineups.home)]);
            }
            if (matchData.lineups?.away) {
                db.run(snapSql, [fixtureId, awayTeamId, 'SQUAD', JSON.stringify(matchData.lineups.away)]);
            }

            // FORM Snapshot
            if (matchData.stats?.form?.home) {
                db.run(snapSql, [fixtureId, homeTeamId, 'FORM', JSON.stringify(matchData.stats.form.home)]);
            }
            if (matchData.stats?.form?.away) {
                db.run(snapSql, [fixtureId, awayTeamId, 'FORM', JSON.stringify(matchData.stats.form.away)]);
            }

            // Additional features like STANDINGS_POINTS or INJURIES could be added here by extending getMatchDetailsService
            console.log(`   ✅ Synced Smart Snapshot for ${fixtureId} to V3_Feature_Snapshots`);
            db.save(false);
        }
    } catch (snapErr) {
        console.error("   ❌ Failed to create smart snapshot:", snapErr.message);
    }

    return { success: true, count, bookmaker: selectedBookmaker.name };
};
