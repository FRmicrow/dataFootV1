# TSD — V29: ML Historical Match Database Import

## Contexte

Import de ~19 300 matchs historiques (2015→2026, 5 grandes ligues) depuis 91 fichiers CSV en 5 catégories :
- **Odds** : cotes 1X2, Over/Under 0.5→4.5, BTTS
- **Scores** : scores FT / 1H / 2H (home/away)
- **Overview** : arbitre, résultat FT
- **Attack & Poss** : possession, tirs, tirs cadrés, tirs hors-cadre (FT/1H/2H)
- **Corners & Cards** : corners, cartons jaunes (FT/1H/2H)

**Clé interne des CSV** : `id` — même valeur à 100% pour les 5 catégories d'une même ligue.
**CS = Current Season** (saison en cours), **LS = Last Seasons** (historique).

> [!IMPORTANT]
> Ces données doivent être **totalement indépendantes** des tables V3 existantes. On utilise un préfixe `ml_` pour toutes les tables. Le lien vers `V3_Fixtures` est **obligatoire** : tout match CSV non retrouvé dans V3 est ignoré avec un warning (jamais inséré avec FK nulle).

> [!NOTE]
> Les noms d'équipes dans les CSV diffèrent légèrement de ceux dans V3 (ex: `Manchester Utd` → `Manchester United`, `Nottingham` → `Nottingham Forest`). Le script embarque une **table de correspondance** par ligue pour résoudre ces écarts.

---

## Proposed Changes

### 1. Nouvelle table PostgreSQL — `ml_matches`

Table unique qui consolide toutes les catégories en une ligne par match.

```sql
CREATE TABLE IF NOT EXISTS ml_matches (
    -- Clé primaire interne source
    source_id          TEXT NOT NULL,
    source_league      TEXT NOT NULL,          -- 'Premier League', 'Ligue 1', etc.
    source_country     TEXT NOT NULL,          -- 'England', 'France', etc.
    source_season      TEXT NOT NULL,          -- '2015/2016', etc.
    PRIMARY KEY (source_id, source_league),    -- id peut se répéter entre ligues

    -- Identité du match
    match_date         TIMESTAMPTZ,
    home_team          TEXT NOT NULL,
    away_team          TEXT NOT NULL,
    referee            TEXT,

    -- Lien vers V3 (obligatoire — tout match non retrouvé est ignoré)
    v3_fixture_id      INTEGER NOT NULL REFERENCES v3_fixtures(fixture_id) ON DELETE RESTRICT,

    -- Overview / Scores
    fthg               SMALLINT,   -- Full Time Home Goals
    ftag               SMALLINT,   -- Full Time Away Goals
    ftr                CHAR(1),    -- H / D / A
    hg_1h              SMALLINT,
    ag_1h              SMALLINT,
    hg_2h              SMALLINT,
    ag_2h              SMALLINT,

    -- Odds pré-match
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

    -- Attack & Possession (BP = Ball Possession %, TS = Total Shots, SON = Shots On, SOFF = Shots Off)
    h_bp_ft            SMALLINT,  a_bp_ft  SMALLINT,
    h_bp_1h            SMALLINT,  a_bp_1h  SMALLINT,
    h_bp_2h            SMALLINT,  a_bp_2h  SMALLINT,
    h_ts_ft            SMALLINT,  a_ts_ft  SMALLINT,
    h_ts_1h            SMALLINT,  a_ts_1h  SMALLINT,
    h_ts_2h            SMALLINT,  a_ts_2h  SMALLINT,
    h_son_ft           SMALLINT,  a_son_ft  SMALLINT,
    h_son_1h           SMALLINT,  a_son_1h  SMALLINT,
    h_son_2h           SMALLINT,  a_son_2h  SMALLINT,
    h_soff_ft          SMALLINT,  a_soff_ft  SMALLINT,
    h_soff_1h          SMALLINT,  a_soff_1h  SMALLINT,
    h_soff_2h          SMALLINT,  a_soff_2h  SMALLINT,

    -- Corners & Cards
    h_corners_ft       SMALLINT,  a_corners_ft  SMALLINT,
    h_corners_1h       SMALLINT,  a_corners_1h  SMALLINT,
    h_corners_2h       SMALLINT,  a_corners_2h  SMALLINT,
    h_yc_ft            SMALLINT,  a_yc_ft  SMALLINT,
    h_yc_1h            SMALLINT,  a_yc_1h  SMALLINT,
    h_yc_2h            SMALLINT,  a_yc_2h  SMALLINT,

    imported_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_matches_league_season ON ml_matches(source_league, source_season);
CREATE INDEX IF NOT EXISTS idx_ml_matches_v3_fixture ON ml_matches(v3_fixture_id) WHERE v3_fixture_id IS NOT NULL;
```

### 2. Script d'import

#### [NEW] [import_ml_matches.js](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/scripts/v3/import_ml_matches.js)

Script Node.js qui :
1. Lit toutes les paires (LS + CS) pour les 5 ligues et 5 catégories
2. Joint en mémoire sur `id` (100% overlap garanti)
3. **Matching V3** : cherche le fixture via `home_team + away_team + date ±2j` avec table de mapping des noms d'équipes
4. Les matchs non retrouvés dans V3 sont **loggés en warning et ignorés** (jamais insérés)
5. Upsert dans `ml_matches` (idempotent via `ON CONFLICT`)

#### [NEW] Migration SQL

Le schéma est créé via une migration dans `backend/sql/` (fichier `03_ml_matches.sql`).

---

## Lignes de données attendues

| Ligue | Total matchs (LS+CS) |
|---|---|
| Premier League | ~4 091 |
| Ligue 1 | ~3 774 |
| Bundesliga | ~3 284 |
| Serie A | ~4 079 |
| La Liga | ~4 070 |
| **Total** | **~19 298** |

---

## Verification Plan

```bash
# Après import
docker exec statfoot-db psql -U statfoot_user -d statfoot -c "
SELECT source_league, source_season, COUNT(*) as matches,
       COUNT(odds_h) AS with_odds, COUNT(v3_fixture_id) AS linked_to_v3
FROM ml_matches
GROUP BY source_league, source_season
ORDER BY source_league, source_season;
"
```

> [!NOTE]
> Le script est **idempotent** (`ON CONFLICT DO UPDATE`) — on peut le relancer sans risque à chaque mise à jour des CSV.
