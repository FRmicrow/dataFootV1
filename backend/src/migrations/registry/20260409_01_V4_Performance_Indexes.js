import logger from '../../utils/logger.js';

async function v4IndexExists(db, indexName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'v4' AND indexname = ?
        ) AS exists`,
        [indexName]
    );
    return Boolean(row?.exists);
}

const INDEXES = [
    // ── v4.matches ─────────────────────────────────────────────────────────────
    // Primary filter for all league/season queries. Without this, every query
    // does a full table scan on v4.matches.
    {
        name: 'idx_v4_matches_comp_season',
        ddl: `CREATE INDEX idx_v4_matches_comp_season
              ON v4.matches(competition_id, season_label)`,
    },
    // match_date ordering used in getFixtures
    {
        name: 'idx_v4_matches_comp_season_date',
        ddl: `CREATE INDEX idx_v4_matches_comp_season_date
              ON v4.matches(competition_id, season_label, match_date ASC NULLS LAST)`,
    },

    // NOTE: indexes on v4.match_events and v4.match_lineups are created in
    // migration 20260413_01_V4_Match_Events_Lineups.js (those tables did not
    // exist when this migration was originally written).

    // ── v4.club_logos ──────────────────────────────────────────────────────────
    // Supports DISTINCT ON (club_id) ORDER BY end_year DESC — replaces N+1 LATERAL
    {
        name: 'idx_v4_club_logos_club_end',
        ddl: `CREATE INDEX idx_v4_club_logos_club_end
              ON v4.club_logos(club_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST)`,
    },

    // ── v4.competition_logos ───────────────────────────────────────────────────
    // Same pattern for competition logos
    {
        name: 'idx_v4_comp_logos_comp_end',
        ddl: `CREATE INDEX idx_v4_comp_logos_comp_end
              ON v4.competition_logos(competition_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST)`,
    },

    // ── v4.competitions ────────────────────────────────────────────────────────
    // getCompetitionByName filters by name — currently a full table scan
    {
        name: 'idx_v4_competitions_name',
        ddl: `CREATE INDEX idx_v4_competitions_name ON v4.competitions(name)`,
    },

    // ── v4.player_season_xg ────────────────────────────────────────────────────
    // Top scorers / top assists / season players all join on (competition_id, season_label, person_id)
    {
        name: 'idx_v4_player_season_xg_lookup',
        ddl: `CREATE INDEX idx_v4_player_season_xg_lookup
              ON v4.player_season_xg(competition_id, season_label, person_id)`,
    },

    // ── v4.matches functional index ────────────────────────────────────────────
    // Queries currently do: WHERE m.competition_id::text = ? which defeats the btree index.
    // This functional index makes the cast-based filter indexable (fallback while
    // SQL is being migrated to use ?::BIGINT casts on the param side).
    {
        name: 'idx_v4_matches_comp_text',
        ddl: `CREATE INDEX idx_v4_matches_comp_text
              ON v4.matches((competition_id::text), season_label)`,
    },
];

export const up = async (db) => {
    logger.info('Creating V4 performance indexes...');

    for (const idx of INDEXES) {
        if (await v4IndexExists(db, idx.name)) {
            logger.info(`Index ${idx.name} already exists — skipping`);
            continue;
        }
        await db.run(idx.ddl);
        logger.info(`Created index ${idx.name}`);
    }

    logger.info('V4 performance indexes done');
};

export const down = async (db) => {
    for (const idx of INDEXES) {
        await db.run(`DROP INDEX IF EXISTS v4.${idx.name}`);
    }
    logger.info('V4 performance indexes dropped');
};
