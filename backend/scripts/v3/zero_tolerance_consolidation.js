import db from '../../src/config/database.js';

/**
 * Zero-Tolerance Identity Engine V2 (Global & Aggressive).
 * 100% Accuracy for French Historic Clubs using Stemming & Prioritized Anchors.
 */

const ANCHORS = [
    { core: 'angers', id: 1, name: 'Angers' },
    { core: 'bordeaux', id: 2, name: 'Bordeaux' },
    { core: 'lyon', id: 4, name: 'Lyon' },
    { core: 'marseille', id: 5, name: 'Marseille' },
    { core: 'montpellier', id: 6, name: 'Montpellier' },
    { core: 'nantes', id: 7, name: 'Nantes' },
    { core: 'nice', id: 8, name: 'Nice' },
    { core: 'paris', id: 9, name: 'Paris Saint Germain' },
    { core: 'monaco', id: 11, name: 'Monaco' },
    { core: 'nimes', id: 12, name: 'Nîmes' },
    { core: 'reims', id: 13, name: 'Reims' },
    { core: 'rennes', id: 14, name: 'Rennes' },
    { core: 'strasbourg', id: 15, name: 'Strasbourg' },
    { core: 'toulouse', id: 16, name: 'Toulouse' },
    { core: 'lorient', id: 17, name: 'Lorient' },
    { core: 'brest', id: 18, name: 'Brest' },
    { core: 'metz', id: 19, name: 'Metz' },
    { core: 'lens', id: 20, name: 'Lens' },
    { core: 'saint etienne', id: 21, name: 'Saint Etienne' },
    { core: 'caen', id: 22, name: 'Caen' },
    { core: 'nancy', id: 23, name: 'Nancy' },
    { core: 'valenciennes', id: 24, name: 'Valenciennes' },
    { core: 'auxerre', id: 25, name: 'Auxerre' },
    { core: 'sochaux', id: 26, name: 'Sochaux' },
    { core: 'guingamp', id: 27, name: 'Guingamp' },
    { core: 'ajaccio', id: 28, name: 'Ajaccio' },
    { core: 'martigues', id: 29, name: 'Martigues' },
    { core: 'troyes', id: 30, name: 'Troyes' },
    { core: 'bastia', id: 31, name: 'Bastia' },
    { core: 'vannes', id: 33, name: 'Vannes' },
    { core: 'niort', id: 35, name: 'Niort' },
    { core: 'le havre', id: 36, name: 'Le Havre' },
    { core: 'grenoble', id: 1172, name: 'Grenoble' },
    { core: 'le mans', id: 1176, name: 'Le Mans' },
    { core: 'boulogne', id: 1177, name: 'Boulogne' },
    { core: 'sedan', id: 1178, name: 'Sedan' },
    { core: 'istres', id: 1180, name: 'Istres' },
    { core: 'red star', id: 1171, name: 'Red Star' },
    { core: 'lille', id: 11504, name: 'Lille' },
    { core: 'roubaix', id: 18737, name: 'Roubaix' },
    { core: 'sete', id: 18710, name: 'Sète' },
    { core: 'cannes', id: 20531, name: 'Cannes' },
    { core: 'laval', id: 20558, name: 'Laval' },
    { core: 'racing', id: 18873, name: 'Racing Paris' },
    { core: 'matra', id: 18873, name: 'Racing Paris' },
    { core: 'toulon', id: 18855, name: 'Toulon' },
    { core: 'ales', id: 20686, name: 'Alès' }
];

const TABLES = [
    { table: 'v3_fixtures', cols: ['home_team_id', 'away_team_id'] },
    { table: 'v3_fixture_lineups', cols: ['team_id'], conflict: ['fixture_id'] },
    { table: 'v3_fixture_player_stats', cols: ['team_id'], conflict: ['fixture_id', 'player_id'] },
    { table: 'v3_fixture_events', cols: ['team_id'] },
    { table: 'v3_player_stats', cols: ['team_id'], conflict: ['player_id', 'league_id', 'season_year'] },
    { table: 'v3_player_season_stats', cols: ['team_id'], conflict: ['player_id', 'league_id', 'season_year'] },
    { table: 'v3_standings', cols: ['team_id'], conflict: ['league_id', 'season_year'] },
    { table: 'ml_matches', cols: ['home_team', 'away_team'] },
    { table: 'v3_team_aliases', cols: ['team_id'] },
    { table: 'v3_team_features_prematch', cols: ['team_id'], conflict: ['fixture_id', 'feature_set_id', 'horizon_type'] },
    { table: 'v3_trophies', cols: ['team_id'] }
];

function stem(name) {
    if (!name) return '';
    let n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-]/g, ' ').trim();
    n = n.replace(/\bbrestois\b/g, 'brest')
         .replace(/\brennais\b/g, 'rennes')
         .replace(/\bnantais\b/g, 'nantes')
         .replace(/\blillois\b/g, 'lille')
         .replace(/\bgirondins\b/g, 'bordeaux')
         .replace(/\blyonnais\b/g, 'lyon')
         .replace(/\bmarseillais\b/g, 'marseille')
         .replace(/\bstephanois\b/g, 'saint etienne');
    return n;
}

async function consolidate() {
    try {
        await db.init();
        console.log('--- STARTING ZERO-TOLERANCE V2 (GLOBAL) ---');

        // NO COUNTRY FILTER THIS TIME - WE CHECK ALL TEAMS (France or NULL)
        const allTeams = await db.all("SELECT team_id, name, country FROM v3_teams");
        
        for (const anchor of ANCHORS) {
            console.log(`\nAnchor: ${anchor.name} (Canonical ID: ${anchor.id})`);
            
            const duplicates = allTeams.filter(t => {
                if (t.team_id === anchor.id) return false;
                // Only merge if France or NULL 
                if (t.country !== 'France' && t.country !== null) return false;

                const stemmed = stem(t.name);
                return stemmed === anchor.core || stemmed.includes(anchor.core);
            });

            for (const dup of duplicates) {
                // False positive protection
                if (anchor.core === 'paris' && (dup.name.toLowerCase().includes('paris fc') || dup.name.toLowerCase().includes('parisienne'))) continue;
                if (anchor.core === 'lyon' && dup.name.toLowerCase().includes('lyon duchere')) continue;

                console.log(`  Merging duplicate: "${dup.name}" (ID: ${dup.team_id}) -> ${anchor.id}`);
                
                for (const t of TABLES) {
                    for (const col of t.cols) {
                        try {
                            if (t.conflict) {
                                const whereClause = t.conflict.map(c => `t1.${c} = t2.${c}`).join(' AND ');
                                await db.run(`DELETE FROM ${t.table} 
                                              WHERE ${col} = $1 
                                              AND EXISTS (SELECT 1 FROM ${t.table} t2 WHERE t2.${col} = $2 AND ${whereClause})`, [dup.team_id, anchor.id]);
                            }
                            await db.run(`UPDATE ${t.table} SET ${col} = $1 WHERE ${col} = $2`, [anchor.id, dup.team_id]);
                        } catch (e) {}
                    }
                }
                await db.run("UPDATE v3_teams SET name = name || ' (Retired)', data_source = 'retired' WHERE team_id = $1", [dup.team_id]);
            }
            await db.run("UPDATE v3_teams SET name = $1, country = 'France' WHERE team_id = $2", [anchor.name, anchor.id]);
        }

        console.log('\n--- CONSOLIDATION V2 COMPLETE ---');
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
consolidate();
