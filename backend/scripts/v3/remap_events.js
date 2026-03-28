/**
 * Re-maps ALL event player_id and assist_id in v3_fixture_events for 2009 Ligue 1
 * using fuzzy unaccent + last-name matching, then re-syncs stats into v3_fixture_player_stats.
 *
 * This is the authoritative fix for the player_id naming issue across events.
 */
import 'dotenv/config';
import db from '../../src/config/database.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;

// Cache to avoid repeated DB queries
const cache = new Map();

function normalize(str) {
    return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() ?? '';
}

async function lookupPlayerByName(name) {
    if (!name || name.trim() === '-' || name.trim() === '') return null;
    if (cache.has(name)) return cache.get(name);

    // Strategy 1: exact
    let p = await db.get("SELECT player_id, name FROM v3_players WHERE name = $1 LIMIT 1", [name]);

    // Strategy 2: unaccent exact (requires unaccent extension)
    if (!p) {
        const rows = await db.all("SELECT player_id, name FROM v3_players WHERE unaccent(name) = unaccent($1) LIMIT 5", [name]);
        if (rows.length === 1) p = rows[0];
        else if (rows.length > 1) p = rows[0]; // take first
    }

    // Strategy 3: last name contains match
    if (!p) {
        const parts = normalize(name).split(/\s+/).filter(x => x.length > 2);
        const lastName = parts[parts.length - 1];
        if (lastName) {
            const rows = await db.all(
                "SELECT player_id, name FROM v3_players WHERE unaccent(lower(name)) LIKE $1 LIMIT 10",
                [`%${lastName}%`]
            );
            if (rows.length === 1) {
                p = rows[0];
            } else if (rows.length > 1) {
                const normFull = normalize(name);
                const exact = rows.find(r => normalize(r.name) === normFull);
                if (exact) {
                    p = exact;
                } else {
                    const firstChar = normalize(name)[0];
                    const initial = rows.filter(r => normalize(r.name).startsWith(firstChar));
                    if (initial.length === 1) p = initial[0];
                    else if (initial.length > 0) p = initial[0];
                }
            }
        }
    }

    cache.set(name, p || null);
    return p || null;
}

async function remapEvents() {
    try {
        await db.init();
        await db.run("CREATE EXTENSION IF NOT EXISTS unaccent").catch(() => {});

        const fixtureIds = (await db.all(
            "SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?",
            [LEAGUE_ID, SEASON]
        )).map(r => r.fixture_id);

        console.log(`Re-mapping events for ${fixtureIds.length} fixtures...`);

        const placeholders = fixtureIds.map((_, i) => `$${i + 1}`).join(',');

        // Fetch all events that need fixing (player_id may be wrong or right; we recompute)
        const events = await db.all(`
            SELECT id, player_name, assist_name, player_id, assist_id, type
            FROM v3_fixture_events
            WHERE fixture_id IN (${placeholders}) AND type IN ('Goal', 'Card')
        `, fixtureIds);

        console.log(`  Total events to re-map: ${events.length}`);

        let fixedPlayer = 0;
        let fixedAssist = 0;

        for (const ev of events) {
            let changed = false;

            if (ev.player_name) {
                const p = await lookupPlayerByName(ev.player_name);
                if (p && p.player_id !== ev.player_id) {
                    await db.run("UPDATE v3_fixture_events SET player_id = $1 WHERE id = $2", [p.player_id, ev.id]);
                    changed = true;
                    fixedPlayer++;
                }
            }

            if (ev.assist_name) {
                const a = await lookupPlayerByName(ev.assist_name);
                if (a && a.player_id !== ev.assist_id) {
                    await db.run("UPDATE v3_fixture_events SET assist_id = $1 WHERE id = $2", [a.player_id, ev.id]);
                    changed = true;
                    fixedAssist++;
                }
            }
        }

        console.log(`  Fixed player_ids: ${fixedPlayer}`);
        console.log(`  Fixed assist_ids: ${fixedAssist}`);

        // Now re-sync goals/assists/cards into fixture_player_stats
        console.log('\n- Re-syncing goals...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_total = (
                SELECT COUNT(*) FROM v3_fixture_events fe
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id
                AND fe.type = 'Goal' AND (fe.detail IS NULL OR fe.detail NOT ILIKE '%Own%')
            )
            WHERE fps.fixture_id IN (${placeholders})
        `, fixtureIds);

        console.log('- Re-syncing assists...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_assists = (
                SELECT COUNT(*) FROM v3_fixture_events fe
                WHERE fe.fixture_id = fps.fixture_id AND fe.assist_id = fps.player_id AND fe.type = 'Goal'
            )
            WHERE fps.fixture_id IN (${placeholders})
        `, fixtureIds);

        console.log('- Re-syncing yellow cards...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET cards_yellow = (
                SELECT COUNT(*) FROM v3_fixture_events fe
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id
                AND fe.type = 'Card' AND fe.detail ILIKE '%Yellow%'
            )
            WHERE fps.fixture_id IN (${placeholders})
        `, fixtureIds);

        console.log('Event re-mapping complete!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

remapEvents();
