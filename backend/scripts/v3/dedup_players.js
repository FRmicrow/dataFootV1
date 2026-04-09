/**
 * Deduplicate players who appear in 2009 Ligue 1 lineups under multiple name variants.
 * Strategy: find all (player_id, normalized_name) pairs that appear in 2009 lineups,
 * group by normalized name, and merge all records into the one with the most appearances.
 */
import 'dotenv/config';
import db from '../../src/config/database.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;

function normalize(str) {
    return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-\s]+/g, ' ').trim() ?? '';
}

const FIXTURE_SUBQUERY = `(SELECT fixture_id FROM v3_fixtures WHERE league_id = ${LEAGUE_ID} AND season_year = ${SEASON})`;

async function deduplicatePlayers() {
    try {
        await db.init();
        console.log(`Finding and merging duplicate players in ${SEASON} Ligue 1...`);

        // Get all unique players who appeared in 2009 lineups
        const players = await db.all(`
            SELECT DISTINCT fps.player_id, p.name
            FROM v3_fixture_player_stats fps
            JOIN v3_players p ON fps.player_id = p.player_id
            WHERE fps.fixture_id IN ${FIXTURE_SUBQUERY}
        `);

        console.log(`  Found ${players.length} unique player-entries in 2009 lineups`);

        // Group by normalized name
        const groups = new Map();
        for (const p of players) {
            const normName = normalize(p.name);
            if (!groups.has(normName)) groups.set(normName, []);
            groups.get(normName).push(p);
        }

        // Find duplicates
        let mergeCount = 0;
        for (const [normName, group] of groups) {
            if (group.length <= 1) continue;

            // Sort by appearances in 2009 (desc) to find canonical player
            const withApps = await Promise.all(group.map(async (p) => {
                const r = await db.get(`
                    SELECT COUNT(*) as apps FROM v3_fixture_player_stats fps
                    WHERE fps.player_id = $1 AND fps.fixture_id IN ${FIXTURE_SUBQUERY}
                `, [p.player_id]);
                return { ...p, apps: parseInt(r.apps) };
            }));
            withApps.sort((a, b) => b.apps - a.apps);

            const canonical = withApps[0]; // Most appearances = canonical
            const dupes = withApps.slice(1);

            console.log(`  Merging: "${normName}"`);
            console.log(`    canonical: ${canonical.name} (id:${canonical.player_id}, apps:${canonical.apps})`);
            console.log(`    dupes: ${dupes.map(d => `${d.name}(${d.player_id}, ${d.apps})`).join(', ')}`);

            for (const dupe of dupes) {
                // Redirect all v3_fixture_player_stats rows
                const rowsToRedirect = await db.all(`SELECT fixture_id FROM v3_fixture_player_stats WHERE player_id = $1 AND fixture_id IN ${FIXTURE_SUBQUERY}`, [dupe.player_id]);
                for (const row of rowsToRedirect) {
                    try {
                        await db.run(`UPDATE v3_fixture_player_stats SET player_id = $1 WHERE player_id = $2 AND fixture_id = $3`, [canonical.player_id, dupe.player_id, row.fixture_id]);
                    } catch (e) {
                        await db.run(`DELETE FROM v3_fixture_player_stats WHERE player_id = $1 AND fixture_id = $2`, [dupe.player_id, row.fixture_id]);
                    }
                }
                // Redirect all v3_fixture_events (player and assist)
                await db.run(`UPDATE v3_fixture_events SET player_id = $1 WHERE player_id = $2`, [canonical.player_id, dupe.player_id]);
                await db.run(`UPDATE v3_fixture_events SET assist_id = $1 WHERE assist_id = $2`, [canonical.player_id, dupe.player_id]);
                mergeCount++;
            }
        }

        console.log(`\n  Total merges performed: ${mergeCount}`);

        // Re-sync goals/assists
        console.log('\n- Re-syncing goals...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_total = (
                SELECT COUNT(*) FROM v3_fixture_events fe
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id
                AND fe.type = 'Goal' AND (fe.detail IS NULL OR fe.detail NOT ILIKE '%Own%')
            )
            WHERE fps.fixture_id IN ${FIXTURE_SUBQUERY}
        `);

        console.log('- Re-syncing assists...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_assists = (
                SELECT COUNT(*) FROM v3_fixture_events fe
                WHERE fe.fixture_id = fps.fixture_id AND fe.assist_id = fps.player_id AND fe.type = 'Goal'
            )
            WHERE fps.fixture_id IN ${FIXTURE_SUBQUERY}
        `);

        console.log(`\nDeduplication complete! Re-run populate_ui_data_${SEASON}.js next.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

deduplicatePlayers();
