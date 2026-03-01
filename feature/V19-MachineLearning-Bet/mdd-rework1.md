Voici du **pseudo-code “agent-ready”** (SQLite) pour :

1. appliquer les migrations,
2. backfill lineups normalisés + substitutions,
3. backfill possession numérique,
4. calculer les features pré-match (BASELINE_V1 + PROCESS_V1) **sans leakage**,
5. remplir `V3_ML_Feature_Store_V2` pour le dataset final (home/away vector).

Je te le donne en style “Python-like” (facile à porter en Python/Node/Go).
Hypothèse : dates en UTC dans `V3_Fixtures.date`. 

---

# 0) Conventions & utilitaires

### Conventions

* `as_of = fixture.date_utc`
* “pré-match” = utiliser uniquement des fixtures où `date_utc < as_of` (strict)
* `feature_set_id ∈ {BASELINE_V1, PROCESS_V1, META_V1}`
* `horizon_type ∈ {FULL_HISTORICAL, 5Y_ROLLING, 3Y_ROLLING}`

### Fonctions utilitaires

```pseudo
function parse_pct(text):
  # "55%" -> 55 ; null -> null
  if text is null: return null
  return int(replace(text, "%", "").trim())

function safe_div(a, b):
  if b is null or b == 0: return null
  return a / b

function json_dumps(obj): ...
function json_loads(text): ...
```

---

# 1) Migrations (idempotent)

```pseudo
function apply_migrations(db):
  db.exec("BEGIN")

  db.exec(SQL_CREATE_V3_FIXTURE_LINEUP_PLAYERS)
  db.exec(SQL_CREATE_V3_TEAM_FEATURES_PREMATCH)
  db.exec(SQL_CREATE_V3_SUBMODEL_OUTPUTS)
  db.exec(SQL_CREATE_V3_ML_FEATURE_STORE_V2)

  # ALTER TABLE: ignore errors if column exists (SQLite workaround)
  try db.exec("ALTER TABLE V3_Fixture_Stats ADD COLUMN ball_possession_pct INTEGER")
  catch: pass

  try db.exec("ALTER TABLE V3_ML_Predictions ADD COLUMN model_registry_id INTEGER")
  catch: pass
  try db.exec("ALTER TABLE V3_ML_Predictions ADD COLUMN feature_set_id TEXT")
  catch: pass
  try db.exec("ALTER TABLE V3_ML_Predictions ADD COLUMN horizon_type TEXT")
  catch: pass
  try db.exec("ALTER TABLE V3_ML_Predictions ADD COLUMN schema_version INTEGER DEFAULT 1")
  catch: pass
  try db.exec("ALTER TABLE V3_ML_Predictions ADD COLUMN is_valid INTEGER DEFAULT 1")
  catch: pass
  try db.exec("ALTER TABLE V3_ML_Predictions ADD COLUMN data_completeness_tag TEXT")
  catch: pass

  db.exec("COMMIT")
```

---

# 2) Backfill `ball_possession_pct`

```pseudo
function backfill_possession_pct(db):
  rows = db.query("""
    SELECT id, ball_possession
    FROM V3_Fixture_Stats
    WHERE ball_possession IS NOT NULL
      AND (ball_possession_pct IS NULL)
  """) :contentReference[oaicite:1]{index=1}

  db.exec("BEGIN")
  for r in rows:
    pct = parse_pct(r.ball_possession)
    db.exec("UPDATE V3_Fixture_Stats SET ball_possession_pct=? WHERE id=?", [pct, r.id])
  db.exec("COMMIT")
```

---

# 3) Backfill lineups normalisés → `V3_Fixture_Lineup_Players`

## 3.1 Parse lineups JSON

```pseudo
function upsert_lineup_player(db, fixture_id, team_id, player_id, is_starting, meta):
  # meta: {player_name, shirt_number, position, grid}
  db.exec("""
    INSERT INTO V3_Fixture_Lineup_Players(
      fixture_id, team_id, player_id,
      is_starting, shirt_number, player_name, position, grid
    ) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(fixture_id, team_id, player_id) DO UPDATE SET
      is_starting=excluded.is_starting,
      shirt_number=COALESCE(excluded.shirt_number, V3_Fixture_Lineup_Players.shirt_number),
      player_name=COALESCE(excluded.player_name, V3_Fixture_Lineup_Players.player_name),
      position=COALESCE(excluded.position, V3_Fixture_Lineup_Players.position),
      grid=COALESCE(excluded.grid, V3_Fixture_Lineup_Players.grid)
  """, [
    fixture_id, team_id, player_id,
    is_starting, meta.shirt_number, meta.player_name, meta.position, meta.grid
  ])
```

> SQLite supporte `ON CONFLICT DO UPDATE` si version récente (>= 3.24).
> Sinon fallback: try/except insert then update.

### Pipeline lineup

```pseudo
function backfill_lineup_players_from_json(db, league_id=null, season_year=null):
  # On peut filtrer par league/season pour batcher
  query = """
    SELECT fixture_id, home_team_id, away_team_id, date
    FROM V3_Fixtures
    WHERE 1=1
  """
  params=[]
  if league_id: query += " AND league_id=?"; params.append(league_id)
  if season_year: query += " AND season_year=?"; params.append(season_year)

  fixtures = db.query(query, params) :contentReference[oaicite:2]{index=2}

  db.exec("BEGIN")
  for fx in fixtures:
    lineups = db.query("""
      SELECT team_id, formation, coach_id, starting_xi, substitutes
      FROM V3_Fixture_Lineups
      WHERE fixture_id=?
    """, [fx.fixture_id]) :contentReference[oaicite:3]{index=3}

    for lu in lineups:
      # starting_xi JSON array
      if lu.starting_xi not null:
        arr = json_loads(lu.starting_xi)
        for p in arr:
          # adapter aux champs exacts de ton JSON (API-Football: player.id, player.name, number, pos, grid)
          meta = {
            player_name: p.player.name,
            shirt_number: p.player.number,
            position: p.player.pos,
            grid: p.player.grid
          }
          upsert_lineup_player(db, fx.fixture_id, lu.team_id, p.player.id, 1, meta)

      # substitutes JSON array
      if lu.substitutes not null:
        arr = json_loads(lu.substitutes)
        for p in arr:
          meta = {...}
          upsert_lineup_player(db, fx.fixture_id, lu.team_id, p.player.id, 0, meta)

  db.exec("COMMIT")
```

## 3.2 Enrichir sub_in/sub_out via events “Subst”

On utilise `V3_Fixture_Events` (type `Subst`) pour remplir minutes. 

```pseudo
function backfill_substitution_minutes(db, league_id=null, season_year=null):
  # Events substitutions : il faut identifier player_out & player_in selon ton schema events
  # Suppose columns: fixture_id, team_id, type, minute, player_id, assist_id/details...
  # Si tu as des champs séparés "player_in_id" / "player_out_id", adapte.

  query = """
    SELECT e.fixture_id, e.team_id, e.minute,
           e.player_id as player_out_id,
           e.assist_id as player_in_id
    FROM V3_Fixture_Events e
    JOIN V3_Fixtures f ON f.fixture_id = e.fixture_id
    WHERE e.type='Subst'
  """
  params=[]
  if league_id: query += " AND f.league_id=?"; params.append(league_id)
  if season_year: query += " AND f.season_year=?"; params.append(season_year)

  subs = db.query(query, params)

  db.exec("BEGIN")
  for s in subs:
    # player out
    if s.player_out_id not null:
      db.exec("""
        UPDATE V3_Fixture_Lineup_Players
        SET sub_out_minute=COALESCE(sub_out_minute, ?)
        WHERE fixture_id=? AND team_id=? AND player_id=?
      """, [s.minute, s.fixture_id, s.team_id, s.player_out_id])

    # player in
    if s.player_in_id not null:
      db.exec("""
        UPDATE V3_Fixture_Lineup_Players
        SET sub_in_minute=COALESCE(sub_in_minute, ?)
        WHERE fixture_id=? AND team_id=? AND player_id=?
      """, [s.minute, s.fixture_id, s.team_id, s.player_in_id])

  db.exec("COMMIT")
```

> ⚠️ Tu devras ajuster selon ton vrai schéma `V3_Fixture_Events` (colonnes exactes).
> L’agent IA doit mapper “player out” et “player in” depuis le JSON ou champs.

---

# 4) Génération features pré-match (Team_Features_PreMatch)

## 4.1 Sélection de l’historique selon horizon

```pseudo
function horizon_cutoff(as_of_date, horizon_type):
  if horizon_type == "FULL_HISTORICAL": return null  # no cutoff
  if horizon_type == "5Y_ROLLING": return as_of_date - 5 years
  if horizon_type == "3Y_ROLLING": return as_of_date - 3 years
```

## 4.2 Récupérer les matches précédents d’une équipe (home+away)

On veut les stats d’équipe (FT ou 1H) associées à l’équipe dans le match.

```pseudo
function get_team_past_fixtures(db, team_id, league_id, as_of_date, cutoff_date=null, limit=null):
  sql = """
    SELECT f.fixture_id, f.date, 
           CASE WHEN f.home_team_id=? THEN 1 ELSE 0 END as is_home,
           CASE WHEN f.away_team_id=? THEN 1 ELSE 0 END as is_away
    FROM V3_Fixtures f
    WHERE f.league_id=?
      AND (f.home_team_id=? OR f.away_team_id=?)
      AND f.date < ?
  """
  params = [team_id, team_id, league_id, team_id, team_id, as_of_date]

  if cutoff_date not null:
    sql += " AND f.date >= ?"
    params.append(cutoff_date)

  sql += " ORDER BY f.date DESC"
  if limit: sql += " LIMIT " + limit

  return db.query(sql, params) :contentReference[oaicite:5]{index=5}
```

## 4.3 Lire les stats d’équipe du match (FT/1H/2H)

```pseudo
function get_team_fixture_stats(db, fixture_id, team_id, half):
  return db.query_one("""
    SELECT *
    FROM V3_Fixture_Stats
    WHERE fixture_id=? AND team_id=? AND half=?
  """, [fixture_id, team_id, half]) :contentReference[oaicite:6]{index=6}
```

---

## 4.4 Calcul PROCESS_V1 : rolling stats + ratios

```pseudo
function compute_process_features(db, team_id, league_id, as_of_date, horizon_type):
  cutoff = horizon_cutoff(as_of_date, horizon_type)

  last5 = get_team_past_fixtures(db, team_id, league_id, as_of_date, cutoff, limit=5)
  last10 = get_team_past_fixtures(db, team_id, league_id, as_of_date, cutoff, limit=10)

  # helper: sum a stat over fixtures for FT only (or also 1H)
  function sum_stat(fixtures, stat_name, half="FT"):
    total=0; count=0
    for fx in fixtures:
      st = get_team_fixture_stats(db, fx.fixture_id, team_id, half)
      if st is null: continue
      if st[stat_name] is null: continue
      total += st[stat_name]
      count += 1
    return (total, count)

  # Core rolling (FT)
  sot5, n5 = sum_stat(last5, "shots_on_goal", "FT")
  shots5, _ = sum_stat(last5, "total_shots", "FT")
  corners5, _ = sum_stat(last5, "corner_kicks", "FT")
  fouls5, _ = sum_stat(last5, "fouls", "FT")
  y5, _ = sum_stat(last5, "yellow_cards", "FT")
  red5, _ = sum_stat(last5, "red_cards", "FT")
  passes5, _ = sum_stat(last5, "total_passes", "FT")
  passAcc5, _ = sum_stat(last5, "passes_accurate", "FT")

  # Possession: moyenne (FT)
  poss_total=0; poss_count=0
  for fx in last5:
    st = get_team_fixture_stats(db, fx.fixture_id, team_id, "FT")
    if st is null: continue
    if st.ball_possession_pct is null: continue
    poss_total += st.ball_possession_pct
    poss_count += 1
  poss5_avg = safe_div(poss_total, poss_count)

  # Ratios
  sot_rate_5 = safe_div(sot5, shots5)           # tir cadré / tirs
  pass_acc_rate_5 = safe_div(passAcc5, passes5) # passes réussies / total

  # Idem last10
  sot10, n10 = sum_stat(last10, "shots_on_goal", "FT")
  shots10, _ = sum_stat(last10, "total_shots", "FT")
  corners10, _ = sum_stat(last10, "corner_kicks", "FT")
  sot_rate_10 = safe_div(sot10, shots10)

  # 1H intensity (optionnel si tu veux HT model)
  sot1h5, _ = sum_stat(last5, "shots_on_goal", "1H")
  shots1h5, _ = sum_stat(last5, "total_shots", "1H")
  corners1h5, _ = sum_stat(last5, "corner_kicks", "1H")
  sot_rate_1h5 = safe_div(sot1h5, shots1h5)

  # Indices composites simples (process)
  control_index_5 = weighted_sum([
    (poss5_avg, 0.4),
    (pass_acc_rate_5, 0.3),
    (safe_div(sot5, n5), 0.3)   # SOT/match
  ])

  return {
    "sot_per_match_5": safe_div(sot5, n5),
    "shots_per_match_5": safe_div(shots5, n5),
    "corners_per_match_5": safe_div(corners5, n5),
    "fouls_per_match_5": safe_div(fouls5, n5),
    "yellow_per_match_5": safe_div(y5, n5),
    "red_per_match_5": safe_div(red5, n5),
    "possession_avg_5": poss5_avg,
    "pass_acc_rate_5": pass_acc_rate_5,
    "sot_rate_5": sot_rate_5,

    "sot_per_match_10": safe_div(sot10, n10),
    "shots_per_match_10": safe_div(shots10, n10),
    "corners_per_match_10": safe_div(corners10, n10),
    "sot_rate_10": sot_rate_10,

    "sot_per_match_1h5": safe_div(sot1h5, n5),
    "shots_per_match_1h5": safe_div(shots1h5, n5),
    "corners_per_match_1h5": safe_div(corners1h5, n5),
    "sot_rate_1h5": sot_rate_1h5,

    "control_index_5": control_index_5
  }
```

---

## 4.5 Calcul BASELINE_V1 : Elo + standings + lineup strength (v1)

### Elo

Tu as `V3_Team_Ratings` (elo_score par team & fixture/date). 
On prend le dernier Elo < as_of.

```pseudo
function get_elo_asof(db, team_id, league_id, as_of_date):
  row = db.query_one("""
    SELECT elo_score
    FROM V3_Team_Ratings
    WHERE team_id=? AND league_id=? AND rating_date < ?
    ORDER BY rating_date DESC
    LIMIT 1
  """, [team_id, league_id, as_of_date])
  if row is null: return null
  return row.elo_score
```

### Standings snapshot

On prend le dernier snapshot < as_of.

```pseudo
function get_standings_asof(db, team_id, league_id, season_year, as_of_date):
  row = db.query_one("""
    SELECT rank, points, goals_diff, played, goals_for, goals_against
    FROM V3_Standings
    WHERE team_id=? AND league_id=? AND season_year=?
      AND update_date < ?
    ORDER BY update_date DESC
    LIMIT 1
  """, [team_id, league_id, season_year, as_of_date]) :contentReference[oaicite:8]{index=8}
  return row  # may be null early season
```

### Lineup strength (simple v1)

Version simple : somme des minutes historiques ou “rating” si dispo.
Comme tu as `V3_Fixture_Player_Stats`, on peut approx via : goals+assists, shots on, key passes, duels won etc. 

Pour rester “agent-ready” : on fait un score simple par joueur basé sur stats saison (si tu l’as) sinon stats récentes.

```pseudo
function compute_lineup_strength_v1(db, fixture_id, team_id, league_id, as_of_date, horizon_type):
  # Récupère les titulaires pour ce fixture
  starters = db.query("""
    SELECT player_id
    FROM V3_Fixture_Lineup_Players
    WHERE fixture_id=? AND team_id=? AND is_starting=1
  """, [fixture_id, team_id])

  if starters is empty:
    return {"lineup_strength_v1": null, "missing_starters_count": null}

  cutoff = horizon_cutoff(as_of_date, horizon_type)

  # Pour chaque joueur, on calcule une contribution récente (ex: 20 derniers matchs avant as_of)
  # (fallback si pas de table player_season_stats)
  total_score = 0
  count = 0

  for p in starters:
    rows = db.query("""
      SELECT fps.*
      FROM V3_Fixture_Player_Stats fps
      JOIN V3_Fixtures f ON f.fixture_id = fps.fixture_id
      WHERE fps.player_id=? AND fps.team_id=? AND f.league_id=?
        AND f.date < ?
        {AND f.date >= cutoff if cutoff}
      ORDER BY f.date DESC
      LIMIT 20
    """, [p.player_id, team_id, league_id, as_of_date, cutoff?])

    if rows is empty: continue

    # score simple (à affiner ensuite)
    s = 0
    for r in rows:
      s += 2*r.goals_total + 1.5*r.assists + 0.05*r.passes_key + 0.03*r.duels_won
      s += 0.04*r.shots_on + 0.02*r.tackles_total
      s -= 0.5*r.cards_yellow + 2.0*r.cards_red
    s = s / len(rows)

    total_score += s
    count += 1

  return {
    "lineup_strength_v1": safe_div(total_score, count),
    "missing_starters_count": len(starters) - count
  }
```

### BASELINE assembler

```pseudo
function compute_baseline_features(db, fixture_id, team_id, league_id, season_year, as_of_date, horizon_type):
  elo = get_elo_asof(db, team_id, league_id, as_of_date)
  st = get_standings_asof(db, team_id, league_id, season_year, as_of_date)
  lsi = compute_lineup_strength_v1(db, fixture_id, team_id, league_id, as_of_date, horizon_type)

  return {
    "elo": elo,
    "rank": st.rank if st else null,
    "points": st.points if st else null,
    "goals_diff": st.goals_diff if st else null,
    "played": st.played if st else null,
    "lineup_strength_v1": lsi.lineup_strength_v1,
    "missing_starters_count": lsi.missing_starters_count
  }
```

---

## 4.6 Écriture dans `V3_Team_Features_PreMatch`

```pseudo
function upsert_team_features_prematch(db, fixture_id, team_id, league_id, season_year, as_of_date,
                                       feature_set_id, horizon_type, features_obj):

  db.exec("""
    INSERT INTO V3_Team_Features_PreMatch(
      fixture_id, team_id, league_id, season_year,
      feature_set_id, horizon_type, as_of,
      features_json
    ) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(fixture_id, team_id, feature_set_id, horizon_type) DO UPDATE SET
      features_json=excluded.features_json,
      as_of=excluded.as_of,
      calculated_at=CURRENT_TIMESTAMP
  """, [
    fixture_id, team_id, league_id, season_year,
    feature_set_id, horizon_type, as_of_date,
    json_dumps(features_obj)
  ])
```

---

# 5) Batch job : générer BASELINE_V1 + PROCESS_V1 sur un périmètre

```pseudo
function generate_prematch_features_for_league_season(db, league_id, season_year, horizon_types):
  fixtures = db.query("""
    SELECT fixture_id, league_id, season_year, date, home_team_id, away_team_id
    FROM V3_Fixtures
    WHERE league_id=? AND season_year=?
    ORDER BY date ASC
  """, [league_id, season_year]) :contentReference[oaicite:10]{index=10}

  db.exec("BEGIN")
  for fx in fixtures:
    as_of = fx.date

    for horizon in horizon_types:
      # HOME
      base_h = compute_baseline_features(db, fx.fixture_id, fx.home_team_id, fx.league_id, fx.season_year, as_of, horizon)
      proc_h = compute_process_features(db, fx.home_team_id, fx.league_id, as_of, horizon)

      upsert_team_features_prematch(db, fx.fixture_id, fx.home_team_id, fx.league_id, fx.season_year, as_of,
                                    "BASELINE_V1", horizon, base_h)

      upsert_team_features_prematch(db, fx.fixture_id, fx.home_team_id, fx.league_id, fx.season_year, as_of,
                                    "PROCESS_V1", horizon, proc_h)

      # AWAY
      base_a = compute_baseline_features(db, fx.fixture_id, fx.away_team_id, fx.league_id, fx.season_year, as_of, horizon)
      proc_a = compute_process_features(db, fx.away_team_id, fx.league_id, as_of, horizon)

      upsert_team_features_prematch(db, fx.fixture_id, fx.away_team_id, fx.league_id, fx.season_year, as_of,
                                    "BASELINE_V1", horizon, base_a)

      upsert_team_features_prematch(db, fx.fixture_id, fx.away_team_id, fx.league_id, fx.season_year, as_of,
                                    "PROCESS_V1", horizon, proc_a)

  db.exec("COMMIT")
```

---

# 6) Construire le feature vector final match (home vs away) → `V3_ML_Feature_Store_V2`

On veut une ligne par match, mais versionnée par feature_set/target/horizon.

### Récupérer features JSON home/away

```pseudo
function get_team_features(db, fixture_id, team_id, feature_set_id, horizon_type):
  row = db.query_one("""
    SELECT features_json
    FROM V3_Team_Features_PreMatch
    WHERE fixture_id=? AND team_id=? AND feature_set_id=? AND horizon_type=?
  """, [fixture_id, team_id, feature_set_id, horizon_type])
  if row is null: return null
  return json_loads(row.features_json)
```

### Assembler un vecteur “diff + levels”

```pseudo
function build_match_vector(fx, base_h, base_a, proc_h, proc_a):
  # niveaux
  v = {}
  v["elo_h"] = base_h.elo
  v["elo_a"] = base_a.elo
  v["elo_diff"] = (base_h.elo - base_a.elo) if both non-null

  v["rank_h"] = base_h.rank
  v["rank_a"] = base_a.rank
  v["rank_diff"] = (base_a.rank - base_h.rank) if both non-null  # rank lower is better

  v["lsi_h"] = base_h.lineup_strength_v1
  v["lsi_a"] = base_a.lineup_strength_v1
  v["lsi_diff"] = (base_h.lineup_strength_v1 - base_a.lineup_strength_v1) if both non-null

  # process diffs
  for key in ["sot_per_match_5","shots_per_match_5","corners_per_match_5","fouls_per_match_5",
              "yellow_per_match_5","possession_avg_5","pass_acc_rate_5","sot_rate_5","control_index_5",
              "sot_per_match_10","corners_per_match_10","sot_rate_10",
              "sot_per_match_1h5","corners_per_match_1h5","sot_rate_1h5"]:
    v[key + "_h"] = proc_h[key]
    v[key + "_a"] = proc_a[key]
    if proc_h[key] not null and proc_a[key] not null:
      v[key + "_diff"] = proc_h[key] - proc_a[key]

  # context: derby/high_stakes/travel_km si tu as ces champs dans fixtures ou table dédiée
  v["is_derby"] = 0
  v["high_stakes"] = 0
  v["travel_km"] = 0

  return v
```

### Upsert dans Feature Store V2

```pseudo
function upsert_ml_feature_store_v2(db, fixture_id, league_id, feature_set_id, target, horizon_type, schema_version, vector_obj):
  db.exec("""
    INSERT INTO V3_ML_Feature_Store_V2(
      fixture_id, league_id, feature_set_id, target, horizon_type, schema_version, feature_vector
    ) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(fixture_id, feature_set_id, target, horizon_type, schema_version) DO UPDATE SET
      feature_vector=excluded.feature_vector,
      calculated_at=CURRENT_TIMESTAMP
  """, [fixture_id, league_id, feature_set_id, target, horizon_type, schema_version, json_dumps(vector_obj)])
```

### Batch build

```pseudo
function build_match_vectors_for_league_season(db, league_id, season_year, horizon_types):
  fixtures = db.query("""
    SELECT fixture_id, league_id, season_year, date, home_team_id, away_team_id
    FROM V3_Fixtures
    WHERE league_id=? AND season_year=?
    ORDER BY date ASC
  """, [league_id, season_year]) :contentReference[oaicite:11]{index=11}

  db.exec("BEGIN")
  for fx in fixtures:
    for horizon in horizon_types:
      base_h = get_team_features(db, fx.fixture_id, fx.home_team_id, "BASELINE_V1", horizon)
      base_a = get_team_features(db, fx.fixture_id, fx.away_team_id, "BASELINE_V1", horizon)
      proc_h = get_team_features(db, fx.fixture_id, fx.home_team_id, "PROCESS_V1", horizon)
      proc_a = get_team_features(db, fx.fixture_id, fx.away_team_id, "PROCESS_V1", horizon)

      if any null: continue  # or allow partial

      vec = build_match_vector(fx, base_h, base_a, proc_h, proc_a)

      # target 1N2 baseline meta feature set
      upsert_ml_feature_store_v2(db, fx.fixture_id, fx.league_id,
                                "META_V1", "1N2", horizon, 1, vec)

  db.exec("COMMIT")
```

---

# 7) Déprécier l’existant (sans purge)

Comme conseillé : ne supprime pas, **taggue**.

```pseudo
function deprecate_legacy_predictions(db, completeness_tag="LEGACY_INCOMPLETE"):
  db.exec("BEGIN")
  db.exec("""
    UPDATE V3_ML_Predictions
    SET is_valid=0,
        data_completeness_tag=?
    WHERE data_completeness_tag IS NULL
  """, [completeness_tag]) :contentReference[oaicite:12]{index=12}
  db.exec("COMMIT")
```

Optionnel : rendre inactifs les modèles legacy :

```pseudo
function deactivate_legacy_models(db):
  db.exec("BEGIN")
  db.exec("""
    UPDATE V3_Model_Registry
    SET is_active=0
    WHERE version_tag LIKE '%LEGACY%' OR data_scope='INCOMPLETE'
  """) :contentReference[oaicite:13]{index=13}
  db.exec("COMMIT")
```

*(tu adapteras aux champs réels ; dans ton MDD `is_active` existe).*

---

# 8) Ordre d’exécution recommandé (pipeline)

```pseudo
apply_migrations(db)

backfill_possession_pct(db)

backfill_lineup_players_from_json(db, league_id=..., season_year=...)
backfill_substitution_minutes(db, league_id=..., season_year=...)

generate_prematch_features_for_league_season(db, league_id=..., season_year=..., horizon_types=["FULL_HISTORICAL","5Y_ROLLING","3Y_ROLLING"])

build_match_vectors_for_league_season(db, league_id=..., season_year=..., horizon_types=[...])

deprecate_legacy_predictions(db)
```

---

# Notes importantes pour ton agent IA

* **Idempotent** : toutes les écritures doivent être `INSERT ... ON CONFLICT DO UPDATE`
* **Anti-leakage** : toujours `fixture.date < as_of` pour les historiques
* **Performance** : éviter de requêter 1 fixture → N queries sans index

  * index déjà proposés dans DDL (team/date, fixture_id)
  * batcher par league+season

---

Si tu veux, je peux aussi fournir :

* les **requêtes SQL** pour vérifier la complétude (2 équipes FT/1H/2H par fixture),
* un script “sanity checks” (fixtures sans stats, lineups manquantes, etc.),
* et la spéc exacte de `submodel outputs` pour mi-temps/corners/cartons.
