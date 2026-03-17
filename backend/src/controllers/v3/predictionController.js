import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import logger from '../../utils/logger.js';

/**
 * Sync Predictions for Upcoming Matches
 * Strategy:
 * 1. Find upcoming fixtures (next 3-5 days) for top leagues.
 * 2. Fetch prediction data from API-Football (/predictions?fixture={id}).
 * 3. Store in V3_Predictions.
 */
export const syncUpcomingProps = async (req, res) => {
    try {
        // 1. Get upcoming fixtures for top leagues (Rank <= 10)
        // We look for fixtures scheduled between TODAY and TODAY+5 days
        const fixtures = await db.all(`
            SELECT f.fixture_id, f.api_id, f.league_id 
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE f.status_short = 'NS' 
            AND f.date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '5 days')
            AND c.importance_rank < 10
            ORDER BY c.importance_rank ASC, f.date ASC
            LIMIT 20 -- Batch limit to avoid API quota hit
        `);

        if (fixtures.length === 0) {
            return res.json({ success: true, data: { message: 'No upcoming high-profile fixtures found to predict.' } });
        }

        let synced = 0;
        let errors = 0;

        for (const fixture of fixtures) {
            try {
                // Check if we already have a prediction for this fixture
                const existing = await db.get("SELECT id FROM V3_Predictions WHERE fixture_id = ?", [fixture.fixture_id]);
                if (existing) continue; // Skip if already exists

                // Fetch from API
                const response = await footballApi.makeRequest('/predictions', { fixture: fixture.api_id });

                if (response.response && response.response.length > 0) {
                    const p = response.response[0];
                    const winner = p.predictions.winner || {};
                    const prob = p.predictions.percent || {};

                    await db.run(`
                        INSERT INTO V3_Predictions (
                            fixture_id, league_id, season,
                            winner_id, winner_name, winner_comment,
                            prob_home, prob_draw, prob_away,
                            goals_home, goals_away, advice,
                            comparison_data, h2h_data, teams_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        fixture.fixture_id,
                        fixture.league_id,
                        '2024',
                        winner.id,
                        winner.name,
                        winner.comment,
                        prob.home,
                        prob.draw,
                        prob.away,
                        p.predictions.goals?.home ?? null,
                        p.predictions.goals?.away ?? null,
                        p.predictions.advice,
                        JSON.stringify(p.comparison || {}),
                        JSON.stringify(p.h2h || []),
                        JSON.stringify(p.teams || {})
                    ]);
                    synced++;
                }

                // Rate limit
                await new Promise(r => setTimeout(r, 200));

            } catch (e) {
                logger.error({ err: e, fixtureId: fixture.fixture_id }, 'Failed prediction sync for fixture');
                errors++;
            }
        }

        res.json({
            success: true,
            data: { message: 'Sync complete', synced, errors, total_candidates: fixtures.length }
        });

    } catch (error) {
        logger.error({ err: error }, 'Prediction Sync Error');
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get stored predictions
 * Filters: status (upcoming/finished), league_rank (high/all)
 */
export const getPredictions = async (req, res) => {
    const { status = 'upcoming', min_prob = 0 } = req.query;

    try {
        let sql = `
            SELECT 
                p.*,
                f.date as match_date, f.status_short,
                th.name as home_team, th.logo_url as home_logo,
                ta.name as away_team, ta.logo_url as away_logo,
                l.name as league_name, l.logo_url as league_logo,
                c.flag_url as country_flag
            FROM V3_Predictions p
            JOIN V3_Fixtures f ON p.fixture_id = f.fixture_id
            JOIN V3_Teams th ON f.home_team_id = th.team_id
            JOIN V3_Teams ta ON f.away_team_id = ta.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Countries c ON l.country_id = c.country_id
        `;

        const params = [];
        const conditions = [];

        if (status === 'upcoming') {
            conditions.push("f.status_short = 'NS'");
        } else if (status === 'history') {
            conditions.push("f.status_short IN ('FT', 'AET', 'PEN')");
        }

        if (min_prob > 0) {
            // Heuristic: check if any probability > min_prob
            // Stored as "45%", replace % to cast
            conditions.push(`(
                CAST(REPLACE(p.prob_home, '%', '') AS INTEGER) >= ? OR 
                CAST(REPLACE(p.prob_away, '%', '') AS INTEGER) >= ?
             )`);
            params.push(min_prob, min_prob);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += " ORDER BY f.date ASC LIMIT 50";

        const predictions = await db.all(sql, params);
        res.json({ success: true, data: predictions });

    } catch (e) {
        logger.error({ err: e }, 'Prediction fetch error');
        res.status(500).json({ success: false, error: e.message });
    }
};
