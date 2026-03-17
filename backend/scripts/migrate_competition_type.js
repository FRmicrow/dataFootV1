/**
 * Migration: add competition_type to V3_Leagues
 * Values: 'club' (default) | 'national_team'
 *
 * Detection strategy: a league is national_team if ANY team participating
 * in its fixtures has is_national_team = TRUE.
 *
 * Run: node backend/scripts/migrate_competition_type.js
 */

import db from '../src/config/database_v3.js';

const migrate = async () => {
    try {
        await db.init();
        console.log('📦 Starting competition_type migration...');

        // 1. Add column (idempotent)
        await db.run(`
            ALTER TABLE V3_Leagues ADD COLUMN IF NOT EXISTS competition_type VARCHAR(20) DEFAULT 'club'
        `);
        console.log('✅ Column competition_type added (or already exists).');

        // 2. Mark national_team competitions based on participating teams
        const result = await db.run(`
            UPDATE V3_Leagues
            SET competition_type = 'national_team'
            WHERE league_id IN (
                SELECT DISTINCT f.league_id
                FROM V3_Fixtures f
                JOIN V3_Fixture_Lineups fl ON f.fixture_id = fl.fixture_id
                JOIN V3_Teams t ON fl.team_id = t.team_id
                WHERE t.is_national_team = TRUE
            )
        `);
        console.log(`✅ Marked ${result?.rowCount ?? '?'} leagues as national_team.`);

        // 3. Report what was classified
        const leagues = await db.all(`
            SELECT l.name, l.api_id, l.competition_type, c.name as country_name
            FROM V3_Leagues l
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE c.name = c.continent OR c.name = 'World'
            ORDER BY l.competition_type, c.importance_rank, l.importance_rank
        `);

        const clubs = leagues.filter(l => l.competition_type === 'club');
        const nationals = leagues.filter(l => l.competition_type === 'national_team');

        console.log('\n🏆 Club competitions:');
        clubs.forEach(l => console.log(`  [${l.api_id}] ${l.name} (${l.country_name})`));

        console.log('\n🌍 National team competitions:');
        nationals.forEach(l => console.log(`  [${l.api_id}] ${l.name} (${l.country_name})`));

        console.log('\n✅ Migration complete.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};

migrate();
