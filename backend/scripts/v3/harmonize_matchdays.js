/**
 * Phase 9: Global Matchday Harmonization & Precision Tuning
 *
 * This script re-calculates and standardizes the 'round' column for all
 * historical seasons in V3_Fixtures.
 *
 * Goals:
 *  1. Format all league rounds as 'Regular Season - X'.
 *  2. Fix calculation bugs (like Saudi 2008 having only 14 rounds).
 *  3. Ensure 100% consistency with modern API data.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'harmonize_matchdays' });

async function harmonize() {
    try {
        await db.init();
        log.info('🚀 Starting Global Matchday Harmonization...');

        // 1. Get all seasons from Import Log (where we have historical data)
        const seasons = await db.all(`
            SELECT league_id, season_year 
            FROM V3_Import_Log 
            WHERE source = 'transfermarkt' AND status = 'done'
            ORDER BY league_id, season_year DESC
        `);

        log.info({ count: seasons.length }, 'Found historical seasons to process');

        for (const { league_id, season_year } of seasons) {
            // 2. Fetch all fixtures for this season, ordered by date
            const fixtures = await db.all(`
                SELECT fixture_id, date, home_team_id, away_team_id, round
                FROM V3_Fixtures
                WHERE league_id = $1 AND season_year = $2
                ORDER BY date ASC NULLS LAST, fixture_id ASC
            `, [league_id, season_year]);

            if (fixtures.length === 0) continue;

            // 3. Count unique teams to determine matchesPerRound
            const uniqueTeams = new Set();
            fixtures.forEach(f => {
                uniqueTeams.add(f.home_team_id);
                uniqueTeams.add(f.away_team_id);
            });

            const teamCount = uniqueTeams.size;
            const matchesPerRound = Math.floor(teamCount / 2) || 10;

            log.info({ league_id, season_year, teamCount, matchesPerRound }, 'Processing season');

            // 4. Update each fixture with the new canonical round
            for (let i = 0; i < fixtures.length; i++) {
                const f = fixtures[i];
                
                // Only harmonize "Regular Season" type rounds.
                // Skip Cups/Playoffs if they are already named (e.g. 'Quarter-finals')
                const isRegular = !f.round || f.round.startsWith('Regular') || f.round.startsWith('Matchday');
                
                if (isRegular) {
                    const currentRoundNum = Math.ceil((i + 1) / matchesPerRound);
                    const newRoundStr = `Regular Season - ${currentRoundNum}`;

                    if (f.round !== newRoundStr) {
                        await db.run(
                            `UPDATE V3_Fixtures SET round = $1 WHERE fixture_id = $2`,
                            [newRoundStr, f.fixture_id]
                        );
                    }
                }
            }
        }

        log.info('✅ Harmonization Complete');
        process.exit(0);

    } catch (e) {
        log.error({ err: e.message }, 'Harmonization failed');
        process.exit(1);
    }
}

harmonize();
