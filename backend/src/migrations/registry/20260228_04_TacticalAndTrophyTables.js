export const up = async (db) => {
    // 1. FIXTURE STATS (Team Level)
    await db.run(`CREATE TABLE IF NOT EXISTS V3_Fixture_Stats (
        fixture_stats_id SERIAL PRIMARY KEY,
        fixture_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        half TEXT NOT NULL,
        shots_on_goal INTEGER DEFAULT 0,
        shots_off_goal INTEGER DEFAULT 0,
        shots_inside_box INTEGER DEFAULT 0,
        shots_outside_box INTEGER DEFAULT 0,
        shots_total INTEGER DEFAULT 0,
        shots_blocked INTEGER DEFAULT 0,
        fouls INTEGER DEFAULT 0,
        corner_kicks INTEGER DEFAULT 0,
        offsides INTEGER DEFAULT 0,
        ball_possession TEXT,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        goalkeeper_saves INTEGER DEFAULT 0,
        passes_total INTEGER DEFAULT 0,
        passes_accurate INTEGER DEFAULT 0,
        pass_accuracy_pct INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(fixture_id, team_id, half)
    )`);


    // 2. FIXTURE PLAYER STATS
    await db.run(`CREATE TABLE IF NOT EXISTS V3_Fixture_Player_Stats (
        fixture_player_stats_id SERIAL PRIMARY KEY,
        fixture_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        is_start_xi BOOLEAN DEFAULT TRUE,
        minutes_played INTEGER DEFAULT 0,
        position TEXT,
        rating TEXT,
        goals_total INTEGER DEFAULT 0,
        goals_conceded INTEGER DEFAULT 0,
        goals_assists INTEGER DEFAULT 0,
        goals_saves INTEGER DEFAULT 0,
        shots_total INTEGER DEFAULT 0,
        shots_on INTEGER DEFAULT 0,
        passes_total INTEGER DEFAULT 0,
        passes_key INTEGER DEFAULT 0,
        passes_accuracy INTEGER DEFAULT 0,
        tackles_total INTEGER DEFAULT 0,
        tackles_blocks INTEGER DEFAULT 0,
        tackles_interceptions INTEGER DEFAULT 0,
        duels_total INTEGER DEFAULT 0,
        duels_won INTEGER DEFAULT 0,
        dribbles_attempts INTEGER DEFAULT 0,
        dribbles_success INTEGER DEFAULT 0,
        fouls_drawn INTEGER DEFAULT 0,
        fouls_committed INTEGER DEFAULT 0,
        cards_yellow INTEGER DEFAULT 0,
        cards_red INTEGER DEFAULT 0,
        penalty_won INTEGER DEFAULT 0,
        penalty_commited INTEGER DEFAULT 0,
        penalty_scored INTEGER DEFAULT 0,
        penalty_missed INTEGER DEFAULT 0,
        penalty_saved INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(fixture_id, player_id)
    )`);


    // 3. PLAYER TROPHIES
    await db.run(`CREATE TABLE IF NOT EXISTS V3_Player_Trophies (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL,
        league_id INTEGER,
        season_year INTEGER NOT NULL,
        team_name TEXT,
        country TEXT,
        league_name TEXT,
        trophy_name TEXT NOT NULL,
        place TEXT, -- 'Winner', 'Runner-up'
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. INDEXES
    await db.run('CREATE INDEX IF NOT EXISTS idx_v3_fixture_stats_fixture ON V3_Fixture_Stats(fixture_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v3_fixture_player_stats_fixture ON V3_Fixture_Player_Stats(fixture_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v3_player_trophies_player ON V3_Player_Trophies(player_id)');
};
