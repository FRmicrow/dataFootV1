import db from '../../src/config/database.js';
import StatsEngine from '../../src/services/v3/StatsEngine.js';

/**
 * Global 60-Year UI Rebuild Engine (Self-Contained).
 * Locks down identities and re-calculates all UI summaries for Ligue 1 (1950-2009).
 */

const CANONICAL_IDS = {
    'angers': 1, 'bordeaux': 2, 'lyon': 4, 'marseille': 5, 'montpellier': 6,
    'nantes': 7, 'nice': 8, 'paris': 9, 'monaco': 11, 'nimes': 12,
    'reims': 13, 'rennes': 14, 'strasbourg': 15, 'toulouse': 16, 'lorient': 17,
    'brest': 18, 'metz': 19, 'lens': 20, 'saint etienne': 21, 'caen': 22,
    'nancy': 23, 'valenciennes': 24, 'auxerre': 25, 'sochaux': 26, 'guingamp': 27,
    'ajaccio': 28, 'martigues': 29, 'troyes': 30, 'bastia': 31, 'le havre': 36,
    'grenoble': 1172, 'le mans': 1176, 'boulogne': 1177, 'sedan': 1178, 'istres': 1180,
    'lille': 11504, 'roubaix': 18737, 'sete': 18710, 'cannes': 20531, 'laval': 20558,
    'racing': 18873, 'toulon': 1355, 'ales': 20686
};

const TABLES = [
    { table: 'v3_fixtures', cols: ['home_team_id', 'away_team_id'] },
    { table: 'v3_fixture_lineups', cols: ['team_id'], conflict: ['fixture_id'] },
    { table: 'v3_fixture_player_stats', cols: ['team_id'], conflict: ['fixture_id', 'player_id'] },
    { table: 'v3_fixture_events', cols: ['team_id'] },
    { table: 'v3_team_aliases', cols: ['team_id'] }
];

async function rebuild() {
    try {
        await db.init();
        console.log('--- STARTING GLOBAL 60-YEAR REBUILD (1950-2009) ---');

        // 1. IDENTITY LOCKDOWN
        console.log('Phase 1: Hard Lockdown on Canonical IDs...');
        for (const [key, id] of Object.entries(CANONICAL_IDS)) {
            const dups = await db.all("SELECT team_id FROM v3_teams WHERE (name ILIKE $1 OR name ILIKE $2) AND team_id != $3 AND (country = 'France' OR country IS NULL)", [`%${key}%`, `%${key}ois%`, id]);
            for (const d of dups) {
                console.log(`  Merging duplicate: ${d.team_id} -> ${id} (${key})`);
                for (const t of TABLES) {
                    for (const col of t.cols) {
                        try {
                            if (t.conflict) {
                                const whereClause = t.conflict.map(c => `t1.${c} = t2.${c}`).join(' AND ');
                                await db.run(`DELETE FROM ${t.table} t1 WHERE t1.${col} = $1 AND EXISTS (SELECT 1 FROM ${t.table} t2 WHERE t2.${col} = $2 AND ${whereClause})`, [d.team_id, id]);
                            }
                            await db.run(`UPDATE ${t.table} SET ${col} = $1 WHERE ${col} = $2`, [id, d.team_id]);
                        } catch (e) {}
                    }
                }
                await db.run("UPDATE v3_teams SET name = name || ' (Retired)', data_source = 'retired' WHERE team_id = $1", [d.team_id]);
            }
            // Standardize Canonical Name
            const name = key.charAt(0).toUpperCase() + key.slice(1);
            await db.run("UPDATE v3_teams SET name = $1, country = 'France' WHERE team_id = $2", [name, id]);
        }
        
        // Manual Map for special names
        await db.run("UPDATE v3_teams SET name = 'Paris Saint Germain' WHERE team_id = 9");
        await db.run("UPDATE v3_teams SET name = 'Saint Etienne' WHERE team_id = 21");
        await db.run("UPDATE v3_teams SET name = 'Le Havre' WHERE team_id = 36");
        await db.run("UPDATE v3_teams SET name = 'Le Mans' WHERE team_id = 1176");
        await db.run("UPDATE v3_teams SET name = 'Racing Paris' WHERE team_id = 18873");
        await db.run("UPDATE v3_teams SET name = 'Nîmes' WHERE team_id = 12");
        await db.run("UPDATE v3_teams SET name = 'Sète' WHERE team_id = 18710");
        await db.run("UPDATE v3_teams SET name = 'Alès' WHERE team_id = 20686");

        // 2. WIPE HISTORICAL AGGREGATES (Ligue 1 ONLY)
        console.log('Phase 2: Wiping Aggregates...');
        await db.run("DELETE FROM v3_standings WHERE league_id = 1 AND season_year BETWEEN 1950 AND 2009");
        await db.run("DELETE FROM v3_player_stats WHERE league_id = 1 AND season_year BETWEEN 1950 AND 2009");
        await db.run("DELETE FROM v3_player_season_stats WHERE league_id = 1 AND season_year BETWEEN 1950 AND 2009");

        // 3. RE-AGGREGATE LOOP
        console.log('Phase 3: Deep Re-Aggregation...');
        for (let year = 2009; year >= 1950; year--) {
            console.log(`  Processing ${year}...`);
            
            // Standings
            const standings = await StatsEngine.getDynamicStandings(1, year, 1, 38);
            for (const s of standings) {
                await db.run(`INSERT INTO V3_Standings (league_id, season_year, team_id, rank, points, goals_diff, played, win, draw, lose, goals_for, goals_against, form, status, group_name)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                              [1, year, s.team_id, s.rank, s.points, s.goals_diff, s.played, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.form, 'FT', 'Regular Season']);
            }

            // Player Stats
            const players = await db.all(`
                SELECT DISTINCT player_id, team_id FROM v3_fixture_player_stats fps
                JOIN v3_fixtures f ON fps.fixture_id = f.fixture_id
                WHERE f.league_id = 1 AND f.season_year = ?
            `, [year]);

            for (const p of players) {
                const stats = await db.get(`
                    SELECT position, COUNT(*) as count,
                        SUM(CASE WHEN is_start_xi = true THEN 1 ELSE 0 END) as lineups,
                        SUM(minutes_played) as minutes,
                        SUM(goals_total) as goals,
                        SUM(goals_assists) as assists,
                        SUM(cards_yellow) as yellow,
                        SUM(cards_red) as red,
                        AVG(NULLIF(CAST(rating AS FLOAT), 0)) as avg_rating
                    FROM v3_fixture_player_stats fps
                    JOIN v3_fixtures f ON fps.fixture_id = f.fixture_id
                    WHERE fps.player_id = ? AND fps.team_id = ? AND f.league_id = 1 AND f.season_year = ?
                    GROUP BY fps.player_id, fps.team_id, fps.position
                    ORDER BY count DESC
                    LIMIT 1
                `, [p.player_id, p.team_id, year]);

                if (stats) {
                    await db.run(`INSERT INTO V3_Player_Stats (player_id, team_id, league_id, season_year, games_appearences, games_lineups, games_minutes, goals_total, goals_assists, cards_yellow, cards_red, games_rating, games_position)
                                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                  [p.player_id, p.team_id, 1, year, stats.count, stats.lineups, stats.minutes, stats.goals, stats.assists, stats.yellow, stats.red, (stats.avg_rating || 0).toFixed(2), stats.position || 'Unknown']);
                }
            }
            await db.run("UPDATE v3_league_seasons SET imported_standings = true, imported_players = true WHERE league_id = 1 AND season_year = $1", [year]);
        }

        console.log('--- GLOBAL REBUILD COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Rebuild fail:', err);
        process.exit(1);
    }
}
rebuild();
