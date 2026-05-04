/**
 * Migration: STEP 0 — Complete Phase 1 Schema (dev.*, mapping.*, audit.*, stg.*)
 *
 * Purpose:
 *   Implements the complete schema foundation for Phase 1 data ingestion.
 *   - Creates canonical tables (dev.*) with strict business key constraints
 *   - Creates mapping tables (mapping.*) to isolate external source IDs
 *   - Creates audit tables (audit.*) for change tracking
 *   - Creates staging tables (stg.*) for manual review queues
 *
 * Business Keys:
 *   - dev.countries: name
 *   - dev.teams: (name, country_id)
 *   - dev.people: (first_name, last_name, nationality_id, birth_date)
 *   - dev.competitions: (name, country_id, season_start_year, competition_type)
 *   - dev.venues: (name, city, country_id)
 *   - dev.matches: (competition_id, home_team_id, away_team_id, match_date)
 *   - dev.match_events: (match_id, event_order)
 *   - dev.match_lineups: (match_id, team_id, player_id)
 *   - mapping.teams: (source, source_id)
 *   - mapping.people: (source, source_id)
 *   - mapping.competitions: (source, source_id)
 *   - mapping.venues: (source, source_id)
 *
 * Critical Rules:
 *   @CRITICAL: All FK constraints use explicit ON DELETE strategy (RESTRICT/CASCADE/SET NULL)
 *   @CRITICAL: Business keys enforced at DDL level (UNIQUE constraints)
 *   @CRITICAL: No external source IDs in canonical (dev.*) tables
 *   @CRITICAL: Audit logging integrated for all canonical mutations
 *   @CRITICAL: All indexes on business keys + FK columns (performance)
 *
 * @AUDIT: This migration must pass idempotence test before deploy
 */

exports.up = async (db) => {
  // ==================== PHASE 1 CANONICAL SCHEMA (dev.*) ====================

  // dev.countries — Reference lookup for countries
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.countries (
      country_id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      iso2 VARCHAR(2) UNIQUE,
      iso3 VARCHAR(3) UNIQUE,
      flag_url TEXT,
      importance_rank INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // dev.teams — Clubs/franchises
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.teams (
      team_id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      country_id BIGINT NOT NULL REFERENCES dev.countries(country_id) ON DELETE RESTRICT,
      league_tier INTEGER,
      competition_id BIGINT,
      logo_url TEXT,
      active_from_year INTEGER,
      active_until_year INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name, country_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_teams_country ON dev.teams(country_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_teams_name_country ON dev.teams(name, country_id)`);

  // dev.team_logos — Logo history
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.team_logos (
      logo_id BIGSERIAL PRIMARY KEY,
      team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE CASCADE,
      logo_url TEXT NOT NULL,
      active_from_year INTEGER NOT NULL,
      active_until_year INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_team_logos_team ON dev.team_logos(team_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_team_logos_current ON dev.team_logos(team_id, active_until_year DESC NULLS FIRST)`);

  // dev.people — Players, coaches, referees
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.people (
      person_id BIGSERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
      nationality_id BIGINT REFERENCES dev.countries(country_id) ON DELETE SET NULL,
      birth_date DATE,
      photo_url TEXT,
      height_cm SMALLINT CHECK(height_cm > 100 AND height_cm < 250 OR height_cm IS NULL),
      preferred_foot TEXT CHECK(preferred_foot IN ('left', 'right') OR preferred_foot IS NULL),
      position_code VARCHAR(3),
      person_role TEXT CHECK(person_role IN ('player', 'coach', 'referee')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE NULLS NOT DISTINCT(first_name, last_name, nationality_id, birth_date)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_people_name ON dev.people(first_name, last_name)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_people_nationality ON dev.people(nationality_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_people_role ON dev.people(person_role)`);

  // dev.competitions — Leagues, cups, tournaments
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.competitions (
      competition_id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      country_id BIGINT NOT NULL REFERENCES dev.countries(country_id) ON DELETE RESTRICT,
      competition_type TEXT NOT NULL CHECK(competition_type IN ('league', 'cup', 'international', 'super_cup')),
      season_start_year INTEGER NOT NULL,
      season_end_year INTEGER,
      league_tier INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name, country_id, season_start_year, competition_type)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_competitions_country ON dev.competitions(country_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_competitions_season ON dev.competitions(season_start_year, season_end_year)`);

  // dev.competition_aliases — Historical names (e.g., "Première Division" → "Ligue 1")
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.competition_aliases (
      alias_id BIGSERIAL PRIMARY KEY,
      competition_id BIGINT NOT NULL REFERENCES dev.competitions(competition_id) ON DELETE CASCADE,
      alias_name TEXT NOT NULL,
      active_from_year INTEGER NOT NULL,
      active_until_year INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_comp_aliases_comp ON dev.competition_aliases(competition_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_comp_aliases_name ON dev.competition_aliases(alias_name)`);

  // dev.competition_logos — Logo history
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.competition_logos (
      logo_id BIGSERIAL PRIMARY KEY,
      competition_id BIGINT NOT NULL REFERENCES dev.competitions(competition_id) ON DELETE CASCADE,
      logo_url TEXT NOT NULL,
      active_from_year INTEGER NOT NULL,
      active_until_year INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_comp_logos_comp ON dev.competition_logos(competition_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_comp_logos_current ON dev.competition_logos(competition_id, active_until_year DESC NULLS FIRST)`);

  // dev.venues — Stadiums
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.venues (
      venue_id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      country_id BIGINT NOT NULL REFERENCES dev.countries(country_id) ON DELETE RESTRICT,
      city TEXT NOT NULL,
      capacity INTEGER CHECK(capacity > 0 OR capacity IS NULL),
      home_team_id BIGINT REFERENCES dev.teams(team_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name, city, country_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_venues_country ON dev.venues(country_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_venues_home_team ON dev.venues(home_team_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_venues_name ON dev.venues(name)`);

  // dev.matches — Fixtures
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.matches (
      match_id BIGSERIAL PRIMARY KEY,
      competition_id BIGINT NOT NULL REFERENCES dev.competitions(competition_id) ON DELETE RESTRICT,
      season_start_year INTEGER NOT NULL,
      home_team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE RESTRICT,
      away_team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE RESTRICT,
      match_date TIMESTAMPTZ,
      match_date_precision TEXT CHECK(match_date_precision IN ('year_only', 'month_only', 'full')) DEFAULT 'full',
      match_status TEXT NOT NULL DEFAULT 'scheduled' CHECK(match_status IN ('scheduled', 'live', 'finished', 'cancelled')),
      home_score SMALLINT CHECK(home_score >= 0 OR home_score IS NULL),
      away_score SMALLINT CHECK(away_score >= 0 OR away_score IS NULL),
      round_label TEXT,
      kickoff_time TIME,
      venue_id BIGINT REFERENCES dev.venues(venue_id) ON DELETE SET NULL,
      attendance INTEGER CHECK(attendance >= 0 OR attendance IS NULL),
      referee_person_id BIGINT REFERENCES dev.people(person_id) ON DELETE SET NULL,
      home_composition TEXT,
      away_composition TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(competition_id, home_team_id, away_team_id, match_date),
      CONSTRAINT teams_different CHECK(home_team_id != away_team_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_matches_competition ON dev.matches(competition_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_matches_teams ON dev.matches(home_team_id, away_team_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_matches_date ON dev.matches(match_date)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_matches_status ON dev.matches(match_status) WHERE match_status = 'finished'`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_matches_season ON dev.matches(season_start_year)`);

  // dev.match_xg — Expected goals (separate table)
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.match_xg (
      xg_id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL UNIQUE REFERENCES dev.matches(match_id) ON DELETE CASCADE,
      xg_home NUMERIC(5,2) CHECK(xg_home >= 0),
      xg_away NUMERIC(5,2) CHECK(xg_away >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_xg_match ON dev.match_xg(match_id)`);

  // dev.match_events — Goals, cards, substitutions
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.match_events (
      event_id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL REFERENCES dev.matches(match_id) ON DELETE CASCADE,
      event_order SMALLINT NOT NULL CHECK(event_order > 0),
      minute_event TEXT NOT NULL,
      half_time TEXT NOT NULL CHECK(half_time IN ('1H', '2H', 'ET1', 'ET2', 'P')) DEFAULT '1H',
      side TEXT NOT NULL CHECK(side IN ('home', 'away')),
      event_type TEXT NOT NULL CHECK(event_type IN ('goal', 'card', 'substitution', 'own_goal')),
      player_id BIGINT REFERENCES dev.people(person_id) ON DELETE SET NULL,
      player_name TEXT,
      related_player_id BIGINT REFERENCES dev.people(person_id) ON DELETE SET NULL,
      related_player_name TEXT,
      team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE RESTRICT,
      goal_type TEXT CHECK(goal_type IN ('normal', 'own', 'penalty') OR goal_type IS NULL),
      card_type TEXT CHECK(card_type IN ('yellow', 'red', 'yellow_red') OR card_type IS NULL),
      detail TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(match_id, event_order),
      CONSTRAINT goal_requires_player CHECK(
        (event_type IN ('goal', 'own_goal') AND (player_id IS NOT NULL OR player_name IS NOT NULL))
        OR event_type NOT IN ('goal', 'own_goal')
      ),
      CONSTRAINT sub_requires_both CHECK(
        (event_type = 'substitution' AND (player_id IS NOT NULL OR player_name IS NOT NULL)
         AND (related_player_id IS NOT NULL OR related_player_name IS NOT NULL))
        OR event_type != 'substitution'
      )
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_events_match ON dev.match_events(match_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_events_type ON dev.match_events(event_type)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_events_player ON dev.match_events(player_id) WHERE player_id IS NOT NULL`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_events_half ON dev.match_events(match_id, half_time)`);

  // dev.match_lineups — Team sheets
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.match_lineups (
      lineup_id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL REFERENCES dev.matches(match_id) ON DELETE CASCADE,
      team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE RESTRICT,
      player_id BIGINT REFERENCES dev.people(person_id) ON DELETE SET NULL,
      player_name TEXT,
      side TEXT NOT NULL CHECK(side IN ('home', 'away')),
      is_starter BOOLEAN NOT NULL DEFAULT FALSE,
      position_code VARCHAR(3),
      jersey_number SMALLINT CHECK(jersey_number > 0 AND jersey_number <= 99),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(match_id, team_id, COALESCE(player_id, 0))
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_lineups_match ON dev.match_lineups(match_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_lineups_player ON dev.match_lineups(player_id) WHERE player_id IS NOT NULL`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_lineups_team_match ON dev.match_lineups(team_id, match_id)`);

  // dev.match_statistics — All stats: FT + 1H + 2H
  await db.run(`
    CREATE TABLE IF NOT EXISTS dev.match_statistics (
      stat_id BIGSERIAL PRIMARY KEY,
      match_id BIGINT NOT NULL UNIQUE REFERENCES dev.matches(match_id) ON DELETE CASCADE,
      home_possession_pct_ft NUMERIC(5,2) CHECK(home_possession_pct_ft >= 0 AND home_possession_pct_ft <= 100),
      away_possession_pct_ft NUMERIC(5,2) CHECK(away_possession_pct_ft >= 0 AND away_possession_pct_ft <= 100),
      home_shots_total_ft SMALLINT CHECK(home_shots_total_ft >= 0),
      away_shots_total_ft SMALLINT CHECK(away_shots_total_ft >= 0),
      home_shots_on_target_ft SMALLINT CHECK(home_shots_on_target_ft >= 0),
      away_shots_on_target_ft SMALLINT CHECK(away_shots_on_target_ft >= 0),
      home_shots_off_target_ft SMALLINT CHECK(home_shots_off_target_ft >= 0),
      away_shots_off_target_ft SMALLINT CHECK(away_shots_off_target_ft >= 0),
      home_corners_ft SMALLINT CHECK(home_corners_ft >= 0),
      away_corners_ft SMALLINT CHECK(away_corners_ft >= 0),
      home_fouls_ft SMALLINT CHECK(home_fouls_ft >= 0),
      away_fouls_ft SMALLINT CHECK(away_fouls_ft >= 0),
      home_yellow_cards_ft SMALLINT CHECK(home_yellow_cards_ft >= 0),
      away_yellow_cards_ft SMALLINT CHECK(away_yellow_cards_ft >= 0),
      home_red_cards_ft SMALLINT CHECK(home_red_cards_ft >= 0),
      away_red_cards_ft SMALLINT CHECK(away_red_cards_ft >= 0),
      home_possession_pct_1h NUMERIC(5,2),
      away_possession_pct_1h NUMERIC(5,2),
      home_shots_total_1h SMALLINT,
      away_shots_total_1h SMALLINT,
      home_shots_on_target_1h SMALLINT,
      away_shots_on_target_1h SMALLINT,
      home_shots_off_target_1h SMALLINT,
      away_shots_off_target_1h SMALLINT,
      home_corners_1h SMALLINT,
      away_corners_1h SMALLINT,
      home_fouls_1h SMALLINT,
      away_fouls_1h SMALLINT,
      home_yellow_cards_1h SMALLINT,
      away_yellow_cards_1h SMALLINT,
      home_red_cards_1h SMALLINT,
      away_red_cards_1h SMALLINT,
      home_possession_pct_2h NUMERIC(5,2),
      away_possession_pct_2h NUMERIC(5,2),
      home_shots_total_2h SMALLINT,
      away_shots_total_2h SMALLINT,
      home_shots_on_target_2h SMALLINT,
      away_shots_on_target_2h SMALLINT,
      home_shots_off_target_2h SMALLINT,
      away_shots_off_target_2h SMALLINT,
      home_corners_2h SMALLINT,
      away_corners_2h SMALLINT,
      home_fouls_2h SMALLINT,
      away_fouls_2h SMALLINT,
      home_yellow_cards_2h SMALLINT,
      away_yellow_cards_2h SMALLINT,
      home_red_cards_2h SMALLINT,
      away_red_cards_2h SMALLINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_dev_match_statistics_match ON dev.match_statistics(match_id)`);

  // ==================== PHASE 1 MAPPING SCHEMA (mapping.*) ====================

  // mapping.teams — External source ID mapping
  await db.run(`
    CREATE TABLE IF NOT EXISTS mapping.teams (
      mapping_id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL CHECK(source IN ('flashscore', 'transfermarkt', 'whoscored', 'espn')),
      source_id TEXT NOT NULL,
      team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE CASCADE,
      source_name TEXT,
      source_country TEXT,
      confidence_score NUMERIC(4,3) CHECK(confidence_score >= 0 AND confidence_score <= 1),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source, source_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_teams_source ON mapping.teams(source, source_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_teams_team ON mapping.teams(team_id)`);

  // mapping.people — External source ID mapping
  await db.run(`
    CREATE TABLE IF NOT EXISTS mapping.people (
      mapping_id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL CHECK(source IN ('flashscore', 'transfermarkt', 'whoscored', 'espn')),
      source_id TEXT NOT NULL,
      person_id BIGINT NOT NULL REFERENCES dev.people(person_id) ON DELETE CASCADE,
      source_first_name TEXT,
      source_last_name TEXT,
      source_nationality TEXT,
      source_birth_date TEXT,
      confidence_score NUMERIC(4,3),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source, source_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_people_source ON mapping.people(source, source_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_people_person ON mapping.people(person_id)`);

  // mapping.competitions — External source ID mapping
  await db.run(`
    CREATE TABLE IF NOT EXISTS mapping.competitions (
      mapping_id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL CHECK(source IN ('flashscore', 'transfermarkt', 'whoscored', 'espn')),
      source_id TEXT NOT NULL,
      competition_id BIGINT NOT NULL REFERENCES dev.competitions(competition_id) ON DELETE CASCADE,
      source_name TEXT,
      source_country TEXT,
      confidence_score NUMERIC(4,3),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source, source_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_competitions_source ON mapping.competitions(source, source_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_competitions_comp ON mapping.competitions(competition_id)`);

  // mapping.venues — External source ID mapping
  await db.run(`
    CREATE TABLE IF NOT EXISTS mapping.venues (
      mapping_id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL CHECK(source IN ('flashscore', 'transfermarkt', 'whoscored', 'espn')),
      source_id TEXT NOT NULL,
      venue_id BIGINT NOT NULL REFERENCES dev.venues(venue_id) ON DELETE CASCADE,
      source_name TEXT,
      source_country TEXT,
      confidence_score NUMERIC(4,3),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source, source_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_venues_source ON mapping.venues(source, source_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_venues_venue ON mapping.venues(venue_id)`);

  // ==================== AUDIT & STAGING SCHEMA ====================

  // audit.canonical_changes — Immutable audit log
  await db.run(`
    CREATE TABLE IF NOT EXISTS audit.canonical_changes (
      change_id BIGSERIAL PRIMARY KEY,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
      table_name TEXT NOT NULL,
      record_id BIGINT NOT NULL,
      old_values JSONB,
      new_values JSONB,
      changed_by TEXT DEFAULT 'system',
      reason TEXT,
      import_batch_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_changes_batch ON audit.canonical_changes(import_batch_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_changes_date ON audit.canonical_changes(created_at)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_changes_record ON audit.canonical_changes(table_name, record_id)`);

  // stg.mapping_candidates — Manual review queue
  await db.run(`
    CREATE TABLE IF NOT EXISTS stg.mapping_candidates (
      candidate_id BIGSERIAL PRIMARY KEY,
      import_batch_id UUID NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('team', 'person', 'competition', 'venue')),
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      confidence_score NUMERIC(4,3),
      matching_evidence JSONB,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'manual_review')),
      canonical_id BIGINT,
      approved_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_stg_candidates_status ON stg.mapping_candidates(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_stg_candidates_batch ON stg.mapping_candidates(import_batch_id)`);

  console.log('✅ STEP 0 Migration: All Phase 1 schemas created successfully');
};

exports.down = async (db) => {
  // Rollback: Drop all Phase 1 tables (reverse order of creation)
  const tables = [
    'stg.mapping_candidates',
    'audit.canonical_changes',
    'mapping.venues',
    'mapping.competitions',
    'mapping.people',
    'mapping.teams',
    'dev.match_statistics',
    'dev.match_lineups',
    'dev.match_events',
    'dev.match_xg',
    'dev.matches',
    'dev.venues',
    'dev.competition_logos',
    'dev.competition_aliases',
    'dev.competitions',
    'dev.people',
    'dev.team_logos',
    'dev.teams',
    'dev.countries'
  ];

  for (const table of tables) {
    await db.run(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  console.log('✅ STEP 0 Rollback: All Phase 1 schemas dropped');
};
