Voici une version **copier-coller “agent-ready”** (pseudo-code très proche d’un script Python) pour :

* `04_train_submodels.py` (entraîner + enregistrer dans `V3_Model_Registry` + générer `V3_Submodel_Outputs`)
* `06_backtest.py` (CLV/ROI) en s’appuyant sur `V3_Odds_History` + `V3_Forge_*`

Je reste compatible **PostgreSQL** et ton schéma V3 (avec les tables ajoutées). 
⚠️ Les noms exacts de colonnes d’odds/events peuvent varier : j’ajoute une section “Mapping” que ton agent doit adapter une fois en lisant le MDD.

---

# A) `04_train_submodels.py` — Spec + pseudo-code complet

## A1) Mapping attendu (à adapter)

### Tables sources

* `V3_Fixtures`: `fixture_id, league_id, season_year, date, halftime_home, halftime_away, fulltime_home, fulltime_away, home_team_id, away_team_id` 
* `V3_ML_Feature_Store_V2`: `fixture_id, league_id, feature_set_id, target, horizon_type, schema_version, feature_vector` (table ajoutée)
* `V3_Submodel_Outputs`: (table ajoutée)
* `V3_Model_Registry`: `id, league_id, model_type, target, horizon_type, version_tag, schema_version, metrics_json, is_active, created_at` 

### Targets & feature_set_id

* HT_RESULT: feature_set_id `"HT_V1"`, target `"HT_RESULT"`
* HT_GOAL_O0_5: `"HTG_V1"`, target `"HT_GOAL_O0_5"`
* CORNERS_TOTAL_LAMBDA: `"CORN_V1"`, target `"CORNERS_TOTAL_LAMBDA"`
* CARDS_TOTAL_LAMBDA: `"CARD_V1"`, target `"CARDS_TOTAL_LAMBDA"`

---

## A2) Helpers (labels + parsing + metrics)

```pseudo
function load_feature_rows(db, league_id, feature_set_id, target, horizon_type, schema_version):
  rows = db.query("""
    SELECT fs.fixture_id, fs.feature_vector, f.date, f.season_year,
           f.home_team_id, f.away_team_id,
           f.halftime_home, f.halftime_away,
           f.fulltime_home, f.fulltime_away
    FROM V3_ML_Feature_Store_V2 fs
    JOIN V3_Fixtures f ON f.fixture_id = fs.fixture_id
    WHERE fs.league_id=?
      AND fs.feature_set_id=?
      AND fs.target=?
      AND fs.horizon_type=?
      AND fs.schema_version=?
    ORDER BY f.date ASC
  """, [league_id, feature_set_id, target, horizon_type, schema_version]) :contentReference[oaicite:3]{index=3}
  return rows

function parse_vector(feature_vector_json, schema):
  vec_obj = json_loads(feature_vector_json)
  # strict ordering using schema.features_order
  arr=[]
  for name in schema.features_order:
    val = vec_obj.get(name, null)
    arr.append(coerce_to_float_or_nan(val))
  return arr

function make_label(target, row):
  if target == "HT_RESULT":
    if row.halftime_home is null or row.halftime_away is null: return null
    if row.halftime_home > row.halftime_away: return "H"
    if row.halftime_home == row.halftime_away: return "D"
    return "A"

  if target == "HT_GOAL_O0_5":
    if row.halftime_home is null or row.halftime_away is null: return null
    return 1 if (row.halftime_home + row.halftime_away) >= 1 else 0

  if target == "CORNERS_TOTAL_LAMBDA":
    # label comes from stats FT (see below in load_labels_extras)
    return null

  if target == "CARDS_TOTAL_LAMBDA":
    return null

function compute_multiclass_logloss(y_true, p): ...
function compute_brier_multiclass(y_true, p): ...
function compute_binary_logloss(y_true, p): ...
function compute_mae(y_true, y_pred): ...
```

### Labels corners/cards : depuis `V3_Fixture_Stats` FT

```pseudo
function load_match_totals_from_stats(db, fixture_id):
  # expects two rows (home+away) in V3_Fixture_Stats for half='FT'
  rows = db.query("""
    SELECT team_id, corner_kicks, yellow_cards, red_cards
    FROM V3_Fixture_Stats
    WHERE fixture_id=? AND half='FT'
  """, [fixture_id]) :contentReference[oaicite:4]{index=4}

  if len(rows) != 2: return null

  corners_total = sum(r.corner_kicks for r in rows if not null)
  yellow_total  = sum(r.yellow_cards for r in rows if not null)
  red_total     = sum(r.red_cards for r in rows if not null)

  # If any critical null -> return null (or treat null as 0 if you prefer)
  if corners_total is null or yellow_total is null: return null

  cards_total = yellow_total + 2*red_total  # recommended
  return { "corners_total": corners_total, "cards_total": cards_total }
```

---

## A3) Walk-forward split (season-based)

```pseudo
function make_season_splits(rows):
  # rows are sorted by date, each row has season_year
  seasons = unique_in_order([r.season_year for r in rows])

  splits=[]
  for i in range(1, len(seasons)):
    test_season = seasons[i]
    train_seasons = seasons[0:i]
    train_idx = [idx for idx,r in enumerate(rows) if r.season_year in train_seasons]
    test_idx  = [idx for idx,r in enumerate(rows) if r.season_year == test_season]
    if len(train_idx) < 200 or len(test_idx) < 50: continue
    splits.append((train_idx, test_idx, test_season))
  return splits
```

---

## A4) Train one submodel (generic)

```pseudo
function train_submodel_for_league(db, league_id, target, feature_set_id, horizon_type, schema_version, schema, algo_spec, version_tag):
  rows = load_feature_rows(db, league_id, feature_set_id, target, horizon_type, schema_version)

  # Build X,y,meta and filter null labels
  X=[]; y=[]; meta=[]
  for r in rows:
    y_i = make_label(target, r)
    if target in ["CORNERS_TOTAL_LAMBDA","CARDS_TOTAL_LAMBDA"]:
      totals = load_match_totals_from_stats(db, r.fixture_id)
      if totals is null: continue
      y_i = totals.corners_total if target=="CORNERS_TOTAL_LAMBDA" else totals.cards_total

    if y_i is null: continue

    x_i = parse_vector(r.feature_vector, schema)
    if has_too_many_nans(x_i): continue

    X.append(x_i); y.append(y_i)
    meta.append({ "fixture_id": r.fixture_id, "date": r.date, "season_year": r.season_year })

  splits = make_season_splits(meta)  # uses season_year

  metrics_list=[]
  for (train_idx, test_idx, test_season) in splits:
    model = fit_model(algo_spec, X[train_idx], y[train_idx])  # logistic / poisson / nb / xgb
    preds = predict_model(model, X[test_idx])                 # proba or yhat

    m = evaluate(target, y[test_idx], preds)
    m["test_season"] = test_season
    metrics_list.append(m)

  avg_metrics = aggregate_metrics(metrics_list)

  # Insert in V3_Model_Registry
  model_registry_id = db.insert("""
    INSERT INTO V3_Model_Registry(league_id, model_type, target, horizon_type, version_tag, schema_version, metrics_json, is_active)
    VALUES (?,?,?,?,?,?,?,1)
  """, [
    league_id, algo_spec.name, target, horizon_type, version_tag, schema_version, json_dumps(avg_metrics)
  ]) :contentReference[oaicite:5]{index=5}

  # Fit final model on all X,y
  final_model = fit_model(algo_spec, X, y)
  save_artifact_to_disk(final_model, "models/{model_registry_id}.bin")

  return model_registry_id, avg_metrics
```

---

## A5) Generate `V3_Submodel_Outputs` for a date range (pre-match use)

Tu peux générer sur :

* l’ensemble historique (pour alimenter meta-model rétrospectif)
* ou uniquement “futurs fixtures”

```pseudo
function upsert_submodel_output(db, fixture_id, team_id_nullable, league_id, season_year, submodel_name, model_registry_id, horizon_type, feature_set_id, outputs_obj):
  db.exec("""
    INSERT INTO V3_Submodel_Outputs(
      fixture_id, team_id, league_id, season_year,
      submodel_name, model_registry_id, horizon_type, feature_set_id, outputs_json
    ) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(fixture_id, team_id, submodel_name, model_registry_id, feature_set_id) DO UPDATE SET
      outputs_json=excluded.outputs_json,
      created_at=CURRENT_TIMESTAMP
  """, [
    fixture_id, team_id_nullable, league_id, season_year,
    submodel_name, model_registry_id, horizon_type, feature_set_id, json_dumps(outputs_obj)
  ])

function generate_submodel_outputs(db, league_id, target, feature_set_id, horizon_type, schema_version, schema, model_registry_id, date_from, date_to):
  model = load_artifact("models/{model_registry_id}.bin")

  rows = load_feature_rows(db, league_id, feature_set_id, target, horizon_type, schema_version)

  db.exec("BEGIN")
  for r in rows:
    if r.date < date_from or r.date >= date_to: continue

    x = parse_vector(r.feature_vector, schema)
    if has_too_many_nans(x): continue

    if target == "HT_RESULT":
      p = predict_proba(model, x)  # dict or array [pH,pD,pA]
      outputs = { "submodel":"HT_RESULT", "schema_version":1, "p_home":pH, "p_draw":pD, "p_away":pA }
      upsert_submodel_output(db, r.fixture_id, null, league_id, r.season_year, "HT_RESULT", model_registry_id, horizon_type, feature_set_id, outputs)

    if target == "HT_GOAL_O0_5":
      p = predict_proba(model, x)  # p_over_0_5
      # optional: if model is poisson -> output lambda too
      outputs = { "submodel":"HT_GOAL_O0_5", "schema_version":1, "p_over_0_5":p, "lambda_goals_1h": null }
      upsert_submodel_output(db, r.fixture_id, null, league_id, r.season_year, "HT_GOAL_O0_5", model_registry_id, horizon_type, feature_set_id, outputs)

    if target == "CORNERS_TOTAL_LAMBDA":
      lambda_ = predict_value(model, x)
      outputs = build_poisson_over_probs("CORNERS_TOTAL", lambda_, [7.5,8.5,9.5,10.5,11.5])
      upsert_submodel_output(db, r.fixture_id, null, league_id, r.season_year, "CORNERS_TOTAL", model_registry_id, horizon_type, feature_set_id, outputs)

    if target == "CARDS_TOTAL_LAMBDA":
      lambda_ = predict_value(model, x)
      outputs = build_poisson_over_probs("CARDS_TOTAL", lambda_, [2.5,3.5,4.5,5.5])
      upsert_submodel_output(db, r.fixture_id, null, league_id, r.season_year, "CARDS_TOTAL", model_registry_id, horizon_type, feature_set_id, outputs)

  db.exec("COMMIT")

function build_poisson_over_probs(name, lambda_, lines):
  out = { "submodel": name, "schema_version": 1, "lambda_total": lambda_ }
  for line in lines:
    k = int(line - 0.5)               # over 9.5 => k=9
    out["p_over_" + str(line).replace(".","_")] = 1 - poisson_cdf(k, lambda_)
  return out
```

---

## A6) Main script (entraîner + générer outputs)

```pseudo
function main():
  db = connect_postgres(DATABASE_URL)

  league_id = argv.league_id
  horizons = ["FULL_HISTORICAL","5Y_ROLLING","3Y_ROLLING"]

  submodels = [
    { target:"HT_RESULT", feature_set:"HT_V1", algo:LOGREG_MULTICLASS, version_tag:"HT_V1_COMPLETE_2026_02" },
    { target:"HT_GOAL_O0_5", feature_set:"HTG_V1", algo:LOGREG_BINARY, version_tag:"HTG_V1_COMPLETE_2026_02" },
    { target:"CORNERS_TOTAL_LAMBDA", feature_set:"CORN_V1", algo:POISSON_OR_NB, version_tag:"CORN_V1_COMPLETE_2026_02" },
    { target:"CARDS_TOTAL_LAMBDA", feature_set:"CARD_V1", algo:POISSON_OR_NB, version_tag:"CARD_V1_COMPLETE_2026_02" }
  ]

  for horizon in horizons:
    for sm in submodels:
      schema = load_schema_file("schemas/" + sm.feature_set + ".json")

      model_id, metrics = train_submodel_for_league(
        db, league_id,
        sm.target, sm.feature_set,
        horizon, 1, schema,
        sm.algo, sm.version_tag
      )

      # Generate outputs for all historical matches (or for a chosen range)
      generate_submodel_outputs(
        db, league_id,
        sm.target, sm.feature_set,
        horizon, 1, schema,
        model_id,
        date_from="2010-01-01", date_to=NOW()
      )
```

---

# B) `06_backtest.py` — CLV/ROI + Forge tables

## B1) Mapping attendu pour odds (à adapter)

Tu as `V3_Odds` et `V3_Odds_History`. 
Les champs diffèrent selon ton implémentation. L’agent doit identifier :

* `fixture_id`
* `market` (ou bet type)
* `bookmaker`
* `selection` (H/D/A, Over/Under line…)
* `odds` (decimal)
* `snapshot_time` (datetime) pour history

### Convention recommandée

* Market 1N2 : `market='1N2'` avec selections `HOME/DRAW/AWAY`
* Closing snapshot = dernier `snapshot_time < fixture.date`

---

## B2) Récupérer odds snapshot

```pseudo
function get_odds_snapshot_1n2(db, fixture_id, bookmaker, snapshot_time):
  # returns { "HOME":oH, "DRAW":oD, "AWAY":oA } from the last record <= snapshot_time
  rows = db.query("""
    SELECT selection, odds
    FROM V3_Odds_History
    WHERE fixture_id=?
      AND market='1N2'
      AND bookmaker=?
      AND snapshot_time <= ?
    ORDER BY snapshot_time DESC
    LIMIT 3
  """, [fixture_id, bookmaker, snapshot_time])

  # If your table stores all three outcomes per snapshot, adjust query accordingly.
  map={}
  for r in rows:
    map[r.selection] = r.odds
  if not all keys present: return null
  return map

function get_closing_time(db, fixture_id):
  row = db.query_one("SELECT date FROM V3_Fixtures WHERE fixture_id=?", [fixture_id]) :contentReference[oaicite:7]{index=7}
  return row.date
```

### Bet time rule (CLOSE / T-60 / T-24H)

```pseudo
function compute_bet_time(fixture_time, bet_time_rule):
  if bet_time_rule == "CLOSE": return fixture_time - 1 minute
  if bet_time_rule == "T-60": return fixture_time - 60 minutes
  if bet_time_rule == "T-24H": return fixture_time - 24 hours
```

---

## B3) Normaliser implied probs (remove overround)

```pseudo
function implied_probs_norm_1n2(odds_map):
  pH = 1/odds_map["HOME"]
  pD = 1/odds_map["DRAW"]
  pA = 1/odds_map["AWAY"]
  s = pH+pD+pA
  return { "HOME":pH/s, "DRAW":pD/s, "AWAY":pA/s }
```

---

## B4) Lire prediction 1N2 (modèle)

Tu peux backtester sur :

* `V3_ML_Predictions` (prod) 
* ou `V3_Forge_Predictions` (si tu y mets les proba) 

Je te donne une lecture générique “prod”.

```pseudo
function get_prediction_1n2(db, fixture_id, model_registry_id):
  row = db.query_one("""
    SELECT p_home_win, p_draw, p_away_win
    FROM V3_ML_Predictions
    WHERE fixture_id=? AND model_registry_id=? AND is_valid=1
  """, [fixture_id, model_registry_id]) :contentReference[oaicite:10]{index=10}
  if row is null: return null
  return { "HOME":row.p_home_win, "DRAW":row.p_draw, "AWAY":row.p_away_win }
```

---

## B5) Résultat du match (settlement)

```pseudo
function settle_1n2(db, fixture_id):
  r = db.query_one("""
    SELECT fulltime_home, fulltime_away
    FROM V3_Fixtures
    WHERE fixture_id=?
  """, [fixture_id]) :contentReference[oaicite:11]{index=11}
  if r is null or r.fulltime_home is null: return null
  if r.fulltime_home > r.fulltime_away: return "HOME"
  if r.fulltime_home == r.fulltime_away: return "DRAW"
  return "AWAY"
```

---

## B6) Créer une simulation Forge + bets

### Create simulation record

Ta table `V3_Forge_Simulations` a déjà `model_id, league_id, start_date, end_date, bankroll_start, bankroll_end, roi, max_drawdown, strategy_json, calibration_tag`. 

```pseudo
function create_simulation(db, model_id, league_id, start_date, end_date, bankroll_start, strategy_json, calibration_tag):
  sim_id = db.insert("""
    INSERT INTO V3_Forge_Simulations(
      model_id, league_id, start_date, end_date,
      bankroll_start, bankroll_end, roi, max_drawdown,
      strategy_json, calibration_tag
    ) VALUES (?,?,?,?,?,NULL,NULL,NULL,?,?)
  """, [model_id, league_id, start_date, end_date, bankroll_start, json_dumps(strategy_json), calibration_tag]) :contentReference[oaicite:13]{index=13}
  return sim_id
```

### Insert bet

Ta `V3_Forge_Bets` existe. 
Comme je ne connais pas toutes les colonnes, je propose une insertion via champs standard + un `bet_details_json` si tu l’ajoutes.
Sinon l’agent mappe tes colonnes existantes (stake, odds, outcome, profit…).

```pseudo
function insert_bet(db, simulation_id, fixture_id, market, selection, stake, odds_bet, odds_close, edge, clv, result, profit):
  db.exec("""
    INSERT INTO V3_Forge_Bets(
      simulation_id, fixture_id, market, selection,
      stake, odds, result, profit, created_at
    ) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  """, [simulation_id, fixture_id, market, selection, stake, odds_bet, result, profit])
  # If you have columns for clv/edge/odds_close -> store them too (recommended)
```

---

## B7) Backtest core loop

```pseudo
function run_backtest_1n2(db, league_id, model_id, start_date, end_date, strategy):
  bookmaker = strategy.bookmaker or "PINNACLE"
  bet_time_rule = strategy.bet_time_rule  # CLOSE / T-60 / T-24H
  edge_threshold = strategy.edge_threshold
  stake_unit = strategy.stake_rule.unit

  sim_id = create_simulation(db, model_id, league_id, start_date, end_date, bankroll_start=strategy.bankroll_start, strategy_json=strategy, calibration_tag=strategy.calibration_tag)

  fixtures = db.query("""
    SELECT fixture_id, date
    FROM V3_Fixtures
    WHERE league_id=?
      AND date >= ?
      AND date < ?
    ORDER BY date ASC
  """, [league_id, start_date, end_date]) :contentReference[oaicite:15]{index=15}

  bankroll = strategy.bankroll_start
  peak = bankroll
  max_dd = 0
  total_stake = 0
  total_profit = 0

  db.exec("BEGIN")
  for fx in fixtures:
    pred = get_prediction_1n2(db, fx.fixture_id, model_id)
    if pred is null: continue

    fixture_time = fx.date
    bet_time = compute_bet_time(fixture_time, bet_time_rule)
    close_time = compute_bet_time(fixture_time, "CLOSE")

    odds_bet = get_odds_snapshot_1n2(db, fx.fixture_id, bookmaker, bet_time)
    odds_close = get_odds_snapshot_1n2(db, fx.fixture_id, bookmaker, close_time)
    if odds_bet is null or odds_close is null: continue

    implied = implied_probs_norm_1n2(odds_bet)
    edge_map = {
      "HOME": pred["HOME"] - implied["HOME"],
      "DRAW": pred["DRAW"] - implied["DRAW"],
      "AWAY": pred["AWAY"] - implied["AWAY"]
    }
    selection = argmax(edge_map)
    edge = edge_map[selection]
    if edge <= edge_threshold: continue

    stake = stake_unit * 1.0  # flat stake (units)
    result_outcome = settle_1n2(db, fx.fixture_id)
    if result_outcome is null: continue

    win = (selection == result_outcome)
    profit = stake * (odds_bet[selection] - 1) if win else -stake

    # CLV (log)
    clv = ln(odds_bet[selection]) - ln(odds_close[selection])

    bankroll += profit
    total_stake += stake
    total_profit += profit

    peak = max(peak, bankroll)
    dd = (peak - bankroll)
    max_dd = max(max_dd, dd)

    insert_bet(db, sim_id, fx.fixture_id, "1N2", selection, stake, odds_bet[selection], odds_close[selection], edge, clv, ("WIN" if win else "LOSE"), profit)

  db.exec("COMMIT")

  roi = total_profit / total_stake if total_stake > 0 else null

  db.exec("""
    UPDATE V3_Forge_Simulations
    SET bankroll_end=?, roi=?, max_drawdown=?
    WHERE id=?
  """, [bankroll, roi, max_dd, sim_id]) :contentReference[oaicite:16]{index=16}

  return sim_id
```

---

# C) Recommandations pratiques (pour éviter les pièges)

## C1) Toujours “geler” un dataset complet

Ajoute un `calibration_tag`/`data_completeness_tag` commun :

* `COMPLETE_2026_02`
  et ne backtester/entraîner que ça.

## C2) Ne backteste pas sur odds “moyenne” si tu peux éviter

Le plus propre est :

* bookmaker sharp (Pinnacle) + closing

## C3) Logique de “CLOSE”

CLOSE = dernier snapshot **strictement avant** kickoff.
Ne prends jamais un snapshot après kickoff.

---

# D) Ce que ton agent doit adapter en 30 minutes

1. Vérifier colonnes exactes de `V3_Odds_History` (market/selection/odds/timestamp) 
2. Vérifier colonnes exactes de `V3_Forge_Bets` (ajouter `edge`, `clv`, `odds_close` si tu veux) 
3. Vérifier que `V3_ML_Predictions` a bien `p_home_win/p_draw/p_away_win` et `model_registry_id` 

---

Si tu veux, je peux aussi te donner :

* une version “multi-market” de backtest (corners/cards + lignes),
* et le pseudo-code de `05_train_meta_model.py` (META_V2 qui ingère Submodel_Outputs).
