Voici le **pseudo-code complet** pour :

1. `05_train_meta_model.py` (META_V2 = META_V1 + submodel outputs),
2. `06_backtest_multi_market.py` (1N2 + Corners + Cards),
   avec détails concrets sur requêtes, jointures, filtrage, versioning.

---

# 1) `05_train_meta_model.py` — META_V2 (avec submodel outputs)

## 1.1 Spéc : META_V2

### Feature_set

* `feature_set_id = "META_V2"`
* `target = "1N2"`
* `schema_version = 1`
* `horizon_type` identique à celui des submodels utilisés

### Inputs

* `META_V1` vector (depuis `V3_ML_Feature_Store_V2` ou recalcul direct)
* `V3_Submodel_Outputs` pour :

  * `HT_RESULT` → p_home_ht, p_draw_ht, p_away_ht
  * `HT_GOAL_O0_5` → p_goal_1h_over_0_5
  * `CORNERS_TOTAL` → lambda_corners_total
  * `CARDS_TOTAL` → lambda_cards_total

### Extra features ajoutées (6)

* `p_home_ht`
* `p_draw_ht`
* `p_away_ht`
* `p_goal_1h_over_0_5`
* `lambda_corners_total`
* `lambda_cards_total`

---

## 1.2 Mapping attendu `V3_Submodel_Outputs`

Table ajoutée :

* `fixture_id`
* `submodel_name` in {HT_RESULT, HT_GOAL_O0_5, CORNERS_TOTAL, CARDS_TOTAL}
* `model_registry_id` (submodel)
* `horizon_type`
* `feature_set_id` (HT_V1 / HTG_V1 / CORN_V1 / CARD_V1)
* `outputs_json`

---

## 1.3 Pseudo-code : load META_V1 + outputs, build META_V2 vectors

### Charger META_V1

```pseudo
function load_meta_v1_rows(db, league_id, horizon_type, schema_version):
  rows = db.query("""
    SELECT fs.fixture_id, fs.feature_vector, f.date, f.season_year,
           f.fulltime_home, f.fulltime_away
    FROM V3_ML_Feature_Store_V2 fs
    JOIN V3_Fixtures f ON f.fixture_id=fs.fixture_id
    WHERE fs.league_id=?
      AND fs.feature_set_id='META_V1'
      AND fs.target='1N2'
      AND fs.horizon_type=?
      AND fs.schema_version=?
    ORDER BY f.date ASC
  """, [league_id, horizon_type, schema_version])
  return rows
```

### Charger outputs submodels pour un fixture

```pseudo
function load_submodel_outputs_for_fixture(db, fixture_id, horizon_type, submodel_model_ids):
  # submodel_model_ids = dict { "HT_RESULT":id, "HT_GOAL_O0_5":id, "CORNERS_TOTAL":id, "CARDS_TOTAL":id }
  out = {}

  for name, mid in submodel_model_ids.items():
    row = db.query_one("""
      SELECT outputs_json
      FROM V3_Submodel_Outputs
      WHERE fixture_id=?
        AND submodel_name=?
        AND model_registry_id=?
        AND horizon_type=?
      LIMIT 1
    """, [fixture_id, name, mid, horizon_type])

    if row is null:
      out[name] = null
    else:
      out[name] = json_loads(row.outputs_json)

  return out
```

### Construire META_V2 vector

```pseudo
function build_meta_v2_vector(meta_v1_obj, outputs):
  v = copy(meta_v1_obj)

  # HT_RESULT
  ht = outputs["HT_RESULT"]
  v["p_home_ht"] = ht["p_home"] if ht else null
  v["p_draw_ht"] = ht["p_draw"] if ht else null
  v["p_away_ht"] = ht["p_away"] if ht else null

  # HT GOAL
  htg = outputs["HT_GOAL_O0_5"]
  v["p_goal_1h_over_0_5"] = htg["p_over_0_5"] if htg else null

  # corners/cards lambdas
  c = outputs["CORNERS_TOTAL"]
  v["lambda_corners_total"] = c["lambda_total"] if c else null

  cd = outputs["CARDS_TOTAL"]
  v["lambda_cards_total"] = cd["lambda_total"] if cd else null

  return v
```

### Upsert feature store V2 (META_V2)

```pseudo
function upsert_meta_v2_feature_store(db, fixture_id, league_id, horizon_type, schema_version, vec_obj):
  db.exec("""
    INSERT INTO V3_ML_Feature_Store_V2(
      fixture_id, league_id,
      feature_set_id, target, horizon_type, schema_version,
      feature_vector
    ) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(fixture_id, feature_set_id, target, horizon_type, schema_version) DO UPDATE SET
      feature_vector=excluded.feature_vector,
      calculated_at=CURRENT_TIMESTAMP
  """, [fixture_id, league_id, "META_V2", "1N2", horizon_type, schema_version, json_dumps(vec_obj)])
```

---

## 1.4 Générer META_V2 store (avant entraînement)

```pseudo
function generate_meta_v2_feature_store(db, league_id, horizon_type, meta_schema_v1, meta_schema_v2, schema_version, submodel_model_ids):
  rows = load_meta_v1_rows(db, league_id, horizon_type, schema_version)

  db.exec("BEGIN")
  for r in rows:
    meta_v1 = json_loads(r.feature_vector)
    outputs = load_submodel_outputs_for_fixture(db, r.fixture_id, horizon_type, submodel_model_ids)

    vec_v2 = build_meta_v2_vector(meta_v1, outputs)

    # optional: skip if critical outputs missing
    if any_null([vec_v2["p_home_ht"], vec_v2["lambda_corners_total"]]):
      continue

    upsert_meta_v2_feature_store(db, r.fixture_id, league_id, horizon_type, schema_version, vec_v2)
  db.exec("COMMIT")
```

---

## 1.5 Entraîner le meta-model (multiclass)

### Labels 1N2

From fixtures FT score.

```pseudo
function make_label_1n2(row):
  if row.fulltime_home is null or row.fulltime_away is null: return null
  if row.fulltime_home > row.fulltime_away: return "HOME"
  if row.fulltime_home == row.fulltime_away: return "DRAW"
  return "AWAY"
```

### Charger dataset META_V2

```pseudo
function load_meta_v2_dataset(db, league_id, horizon_type, schema, schema_version):
  rows = db.query("""
    SELECT fs.fixture_id, fs.feature_vector, f.date, f.season_year,
           f.fulltime_home, f.fulltime_away
    FROM V3_ML_Feature_Store_V2 fs
    JOIN V3_Fixtures f ON f.fixture_id=fs.fixture_id
    WHERE fs.league_id=?
      AND fs.feature_set_id='META_V2'
      AND fs.target='1N2'
      AND fs.horizon_type=?
      AND fs.schema_version=?
    ORDER BY f.date ASC
  """, [league_id, horizon_type, schema_version])

  X=[]; y=[]; meta=[]
  for r in rows:
    y_i = make_label_1n2(r)
    if y_i is null: continue

    x_i = parse_vector(r.feature_vector, schema)
    if has_too_many_nans(x_i): continue

    X.append(x_i); y.append(y_i)
    meta.append({fixture_id:r.fixture_id, date:r.date, season_year:r.season_year})

  return X, y, meta
```

### Train + register + generate predictions

```pseudo
function train_meta_model(db, league_id, horizon_type, schema_version, meta_schema, version_tag):
  X, y, meta = load_meta_v2_dataset(db, league_id, horizon_type, meta_schema, schema_version)
  splits = make_season_splits(meta)

  metrics=[]
  for (train_idx, test_idx, test_season) in splits:
    model = fit_multiclass_logreg(X[train_idx], y[train_idx], l2=1.0)
    p = predict_proba(model, X[test_idx])
    metrics.append({
      "test_season": test_season,
      "logloss": multiclass_logloss(y[test_idx], p),
      "brier": multiclass_brier(y[test_idx], p)
    })

  avg = aggregate_metrics(metrics)

  model_id = db.insert("""
    INSERT INTO V3_Model_Registry(league_id, model_type, target, horizon_type, version_tag, schema_version, metrics_json, is_active)
    VALUES (?,?,?,?,?,?,?,1)
  """, [league_id, "LOGREG_MULTICLASS", "1N2", horizon_type, version_tag, schema_version, json_dumps(avg)]) :contentReference[oaicite:0]{index=0}

  final_model = fit_multiclass_logreg(X, y, l2=1.0)
  save_artifact_to_disk(final_model, "models/{model_id}.bin")

  return model_id
```

### Générer predictions vers `V3_ML_Predictions`

```pseudo
function upsert_prediction(db, fixture_id, league_id, model_id, horizon_type, schema_version, feature_set_id, p):
  db.exec("""
    INSERT INTO V3_ML_Predictions(
      fixture_id, league_id,
      model_version, p_home_win, p_draw, p_away_win,
      created_at,
      model_registry_id, horizon_type, schema_version, feature_set_id, is_valid, data_completeness_tag
    ) VALUES (?,?,?,?,?, ?,CURRENT_TIMESTAMP,?,?,?,?,?,?)
    ON CONFLICT(fixture_id, model_version) DO UPDATE SET
      p_home_win=excluded.p_home_win,
      p_draw=excluded.p_draw,
      p_away_win=excluded.p_away_win,
      created_at=CURRENT_TIMESTAMP,
      model_registry_id=excluded.model_registry_id,
      horizon_type=excluded.horizon_type,
      schema_version=excluded.schema_version,
      feature_set_id=excluded.feature_set_id,
      is_valid=excluded.is_valid,
      data_completeness_tag=excluded.data_completeness_tag
  """, [
    fixture_id, league_id,
    str(model_id), p["HOME"], p["DRAW"], p["AWAY"],
    model_id, horizon_type, schema_version, feature_set_id, 1, "COMPLETE_2026_02"
  ]) :contentReference[oaicite:1]{index=1}
```

> ⚠️ Le `ON CONFLICT(fixture_id, model_version)` dépend de l’unique key réelle de ta table.
> Si pas d’unique, ton agent doit en ajouter ou gérer par `UPDATE WHERE fixture_id AND model_registry_id`.

---

# 2) `06_backtest_multi_market.py` — 1N2 + Corners + Cards

## 2.1 Normaliser la structure “market adapters”

On définit des fonctions :

* `get_model_prob(market, fixture_id)` : proba du modèle
* `get_odds_snapshot(market, fixture_id, bet_time)` : odds bookmaker
* `implied_probs_norm(market, odds)` : implied sans marge
* `settle_market(market, fixture_id)` : résultat win/lose
* `pick_selection(strategy, model_prob, implied)` : selection + edge

---

## 2.2 Odds snapshots — 1N2, corners, cards

### 1N2 (déjà donné plus haut)

### Corners Over line

Ton odds history doit stocker la line `9.5`, selection `OVER/UNDER` et odds.

```pseudo
function get_odds_snapshot_total_overunder(db, fixture_id, market_name, line, bookmaker, snapshot_time):
  # market_name example: "CORNERS_TOTAL" or "CARDS_TOTAL"
  rows = db.query("""
    SELECT selection, odds
    FROM V3_Odds_History
    WHERE fixture_id=?
      AND market=?
      AND line=?
      AND bookmaker=?
      AND snapshot_time <= ?
    ORDER BY snapshot_time DESC
    LIMIT 2
  """, [fixture_id, market_name, line, bookmaker, snapshot_time])

  map={}
  for r in rows:
    map[r.selection] = r.odds  # "OVER" / "UNDER"
  if not map.has("OVER") or not map.has("UNDER"): return null
  return map

function implied_probs_norm_ou(odds_map):
  pO = 1/odds_map["OVER"]
  pU = 1/odds_map["UNDER"]
  s = pO+pU
  return { "OVER":pO/s, "UNDER":pU/s }
```

---

## 2.3 Modèle → probas pour Over lines (corners/cards)

On lit dans `V3_Submodel_Outputs` :

```pseudo
function get_submodel_over_prob(db, fixture_id, submodel_name, model_registry_id, horizon_type, line):
  row = db.query_one("""
    SELECT outputs_json
    FROM V3_Submodel_Outputs
    WHERE fixture_id=? AND submodel_name=? AND model_registry_id=? AND horizon_type=?
  """, [fixture_id, submodel_name, model_registry_id, horizon_type])

  if row is null: return null
  obj = json_loads(row.outputs_json)

  key = "p_over_" + str(line).replace(".","_")  # 9.5 -> p_over_9_5
  return obj.get(key, null)
```

---

## 2.4 Settlement corners/cards

```pseudo
function settle_corners_over(db, fixture_id, line):
  totals = load_match_totals_from_stats(db, fixture_id)  # from earlier
  if totals is null: return null
  return "OVER" if totals.corners_total > line else "UNDER"

function settle_cards_over(db, fixture_id, line):
  totals = load_match_totals_from_stats(db, fixture_id)
  if totals is null: return null
  return "OVER" if totals.cards_total > line else "UNDER"
```

---

## 2.5 Backtest multi-market loop

```pseudo
function run_backtest_multi(db, league_id, start_date, end_date, strategy_bundle):
  # strategy_bundle example:
  # { bankroll_start, calibration_tag, bookmaker, horizon_type,
  #   markets: [ {market:"1N2", model_id:..., bet_time_rule:"CLOSE", edge_threshold:0.03, stake:1},
  #             {market:"CORNERS_OVER", model_id_sub:..., submodel_name:"CORNERS_TOTAL", line:9.5, bet_time_rule:"CLOSE", edge_threshold:0.03, stake:1},
  #             {market:"CARDS_OVER", model_id_sub:..., submodel_name:"CARDS_TOTAL", line:3.5, ... } ] }

  sim_id = create_simulation(db,
    model_id=strategy_bundle.primary_model_id,  # or null
    league_id=league_id,
    start_date=start_date, end_date=end_date,
    bankroll_start=strategy_bundle.bankroll_start,
    strategy_json=strategy_bundle,
    calibration_tag=strategy_bundle.calibration_tag
  ) :contentReference[oaicite:2]{index=2}

  fixtures = db.query("""
    SELECT fixture_id, date
    FROM V3_Fixtures
    WHERE league_id=? AND date>=? AND date<?
    ORDER BY date ASC
  """, [league_id, start_date, end_date]) :contentReference[oaicite:3]{index=3}

  bankroll=strategy_bundle.bankroll_start
  peak=bankroll
  max_dd=0
  total_stake=0
  total_profit=0

  db.exec("BEGIN")
  for fx in fixtures:
    fixture_time = fx.date

    for strat in strategy_bundle.markets:
      bet_time = compute_bet_time(fixture_time, strat.bet_time_rule)
      close_time = compute_bet_time(fixture_time, "CLOSE")

      if strat.market == "1N2":
        pred = get_prediction_1n2(db, fx.fixture_id, strat.model_id)
        if pred is null: continue
        odds_bet = get_odds_snapshot_1n2(db, fx.fixture_id, strategy_bundle.bookmaker, bet_time)
        odds_close= get_odds_snapshot_1n2(db, fx.fixture_id, strategy_bundle.bookmaker, close_time)
        if odds_bet is null or odds_close is null: continue

        implied = implied_probs_norm_1n2(odds_bet)
        edge_map = {k: pred[k]-implied[k] for k in ["HOME","DRAW","AWAY"]}
        selection = argmax(edge_map)
        edge = edge_map[selection]
        if edge <= strat.edge_threshold: continue

        outcome = settle_1n2(db, fx.fixture_id)
        if outcome is null: continue
        win = (selection==outcome)
        odds_sel = odds_bet[selection]
        profit = strat.stake*(odds_sel-1) if win else -strat.stake
        clv = ln(odds_sel) - ln(odds_close[selection])

        bankroll += profit
        total_stake += strat.stake
        total_profit += profit
        peak = max(peak, bankroll); max_dd = max(max_dd, peak-bankroll)

        insert_bet(db, sim_id, fx.fixture_id, "1N2", selection, strat.stake, odds_sel, odds_close[selection], edge, clv, ("WIN" if win else "LOSE"), profit)

      if strat.market == "CORNERS_OVER":
        p_over = get_submodel_over_prob(db, fx.fixture_id, strat.submodel_name, strat.model_id_sub, strategy_bundle.horizon_type, strat.line)
        if p_over is null: continue
        odds_bet = get_odds_snapshot_total_overunder(db, fx.fixture_id, "CORNERS_TOTAL", strat.line, strategy_bundle.bookmaker, bet_time)
        odds_close= get_odds_snapshot_total_overunder(db, fx.fixture_id, "CORNERS_TOTAL", strat.line, strategy_bundle.bookmaker, close_time)
        if odds_bet is null or odds_close is null: continue

        implied = implied_probs_norm_ou(odds_bet)
        edge = p_over - implied["OVER"]
        if edge <= strat.edge_threshold: continue

        outcome = settle_corners_over(db, fx.fixture_id, strat.line)
        if outcome is null: continue
        win = ("OVER"==outcome)

        odds_sel = odds_bet["OVER"]
        profit = strat.stake*(odds_sel-1) if win else -strat.stake
        clv = ln(odds_sel) - ln(odds_close["OVER"])

        bankroll += profit
        total_stake += strat.stake
        total_profit += profit
        peak = max(peak, bankroll); max_dd = max(max_dd, peak-bankroll)

        insert_bet(db, sim_id, fx.fixture_id, "CORNERS_OVER_"+strat.line, "OVER", strat.stake, odds_sel, odds_close["OVER"], edge, clv, ("WIN" if win else "LOSE"), profit)

      if strat.market == "CARDS_OVER":
        p_over = get_submodel_over_prob(db, fx.fixture_id, strat.submodel_name, strat.model_id_sub, strategy_bundle.horizon_type, strat.line)
        if p_over is null: continue
        odds_bet = get_odds_snapshot_total_overunder(db, fx.fixture_id, "CARDS_TOTAL", strat.line, strategy_bundle.bookmaker, bet_time)
        odds_close= get_odds_snapshot_total_overunder(db, fx.fixture_id, "CARDS_TOTAL", strat.line, strategy_bundle.bookmaker, close_time)
        if odds_bet is null or odds_close is null: continue

        implied = implied_probs_norm_ou(odds_bet)
        edge = p_over - implied["OVER"]
        if edge <= strat.edge_threshold: continue

        outcome = settle_cards_over(db, fx.fixture_id, strat.line)
        if outcome is null: continue
        win = ("OVER"==outcome)

        odds_sel = odds_bet["OVER"]
        profit = strat.stake*(odds_sel-1) if win else -strat.stake
        clv = ln(odds_sel) - ln(odds_close["OVER"])

        bankroll += profit
        total_stake += strat.stake
        total_profit += profit
        peak = max(peak, bankroll); max_dd = max(max_dd, peak-bankroll)

        insert_bet(db, sim_id, fx.fixture_id, "CARDS_OVER_"+strat.line, "OVER", strat.stake, odds_sel, odds_close["OVER"], edge, clv, ("WIN" if win else "LOSE"), profit)

  db.exec("COMMIT")

  roi = total_profit/total_stake if total_stake>0 else null
  db.exec("""UPDATE V3_Forge_Simulations SET bankroll_end=?, roi=?, max_drawdown=? WHERE id=?""",
          [bankroll, roi, max_dd, sim_id]) :contentReference[oaicite:4]{index=4}

  return sim_id
```

---

# 3) Notes importantes pour ton agent IA

## 3.1 Recommended DB evolution: store edge/clv/odds_close

Ta table `V3_Forge_Bets` risque de ne pas avoir `edge`, `clv`, `odds_close`. 
➡️ Deux options :

* ajouter colonnes :

  * `odds_close REAL`, `edge REAL`, `clv REAL`
* ou ajouter `bet_details_json TEXT` et tout mettre dedans.

Je conseille **colonnes** (query-friendly).

## 3.2 Odds market naming

Il faut standardiser :

* `market='1N2'` selections HOME/DRAW/AWAY
* `market='CORNERS_TOTAL'` selections OVER/UNDER + `line`
* `market='CARDS_TOTAL'` selections OVER/UNDER + `line`

---

# 4) Ce que je te conseille comme exécution (ordre)

1. `04_train_submodels.py` → génère outputs pour toute l’historique
2. `05_train_meta_model.py` :

   * build `META_V2` store
   * train model
   * write `V3_ML_Predictions`
3. `06_backtest_multi_market.py` :

   * sim 1N2
   * sim corners
   * sim cards

---

Si tu veux, je peux aussi te donner :

* les **schemas JSON** pour `HT_V1/HTG_V1/CORN_V1/CARD_V1/META_V2` (fichiers complets),
* et une liste de **sanity checks spécifiques odds** (closing snapshot coverage, missing lines, etc.).
