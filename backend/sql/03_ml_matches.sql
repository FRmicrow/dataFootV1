-- Migration V29 : Table ml_matches
-- Import des données historiques pour le Machine Learning
-- Source : fichiers CSV (Odds, Scores, Overview, Attack/Poss, Corners/Cards)
-- Indépendant des tables V3, lié à V3_Fixtures via FK NOT NULL + RESTRICT

CREATE TABLE IF NOT EXISTS ml_matches (
    -- Clé primaire source (id CSV peut se répéter entre ligues)
    source_id          TEXT NOT NULL,
    source_league      TEXT NOT NULL,
    source_country     TEXT NOT NULL,
    source_season      TEXT NOT NULL,
    PRIMARY KEY (source_id, source_league),

    -- Identité du match
    match_date         TIMESTAMPTZ,
    home_team          TEXT NOT NULL,
    away_team          TEXT NOT NULL,
    referee            TEXT,

    -- Lien vers V3 (obligatoire — tout match non retrouvé est ignoré)
    v3_fixture_id      INTEGER NOT NULL REFERENCES v3_fixtures(fixture_id) ON DELETE RESTRICT,

    -- Scores (FT = Full Time, 1H = 1st Half, 2H = 2nd Half)
    fthg               SMALLINT,
    ftag               SMALLINT,
    ftr                CHAR(1),
    hg_1h              SMALLINT,
    ag_1h              SMALLINT,
    hg_2h              SMALLINT,
    ag_2h              SMALLINT,

    -- Odds pré-match (1X2 + Over/Under 0.5→4.5 + BTTS)
    odds_h             NUMERIC(6,3),
    odds_d             NUMERIC(6,3),
    odds_a             NUMERIC(6,3),
    odds_o05           NUMERIC(6,3),
    odds_u05           NUMERIC(6,3),
    odds_o15           NUMERIC(6,3),
    odds_u15           NUMERIC(6,3),
    odds_o25           NUMERIC(6,3),
    odds_u25           NUMERIC(6,3),
    odds_o35           NUMERIC(6,3),
    odds_u35           NUMERIC(6,3),
    odds_o45           NUMERIC(6,3),
    odds_u45           NUMERIC(6,3),
    odds_btts_y        NUMERIC(6,3),
    odds_btts_n        NUMERIC(6,3),

    -- Attack & Possession (BP=Ball Possession%, TS=Total Shots, SON=On Target, SOFF=Off Target)
    h_bp_ft            SMALLINT,  a_bp_ft    SMALLINT,
    h_bp_1h            SMALLINT,  a_bp_1h    SMALLINT,
    h_bp_2h            SMALLINT,  a_bp_2h    SMALLINT,
    h_ts_ft            SMALLINT,  a_ts_ft    SMALLINT,
    h_ts_1h            SMALLINT,  a_ts_1h    SMALLINT,
    h_ts_2h            SMALLINT,  a_ts_2h    SMALLINT,
    h_son_ft           SMALLINT,  a_son_ft   SMALLINT,
    h_son_1h           SMALLINT,  a_son_1h   SMALLINT,
    h_son_2h           SMALLINT,  a_son_2h   SMALLINT,
    h_soff_ft          SMALLINT,  a_soff_ft  SMALLINT,
    h_soff_1h          SMALLINT,  a_soff_1h  SMALLINT,
    h_soff_2h          SMALLINT,  a_soff_2h  SMALLINT,

    -- Corners & Cartons jaunes (FT / 1H / 2H)
    h_corners_ft       SMALLINT,  a_corners_ft  SMALLINT,
    h_corners_1h       SMALLINT,  a_corners_1h  SMALLINT,
    h_corners_2h       SMALLINT,  a_corners_2h  SMALLINT,
    h_yc_ft            SMALLINT,  a_yc_ft       SMALLINT,
    h_yc_1h            SMALLINT,  a_yc_1h       SMALLINT,
    h_yc_2h            SMALLINT,  a_yc_2h       SMALLINT,

    imported_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_matches_v3_fixture
    ON ml_matches(v3_fixture_id);

CREATE INDEX IF NOT EXISTS idx_ml_matches_league_season
    ON ml_matches(source_league, source_season);
