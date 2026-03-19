OK — je te donne une **spec exacte** (submodels + entraînement + scripts/pipelines) adaptée à **PostgreSQL + ton schéma V3** et à l’approche “par étapes”.
Je reste **concret** : tables touchées, targets, datasets, features, algos, validation walk-forward, artefacts à enregistrer.

> Hypothèse : tu veux une base solide et extensible (pas encore “edge trading”), avec versions/horizons.
> Tout est conçu pour éviter leakage.

---

# 1) Submodels : spec exacte

## 1.1 Submodel A — HT_RESULT (1X2 à la mi-temps)

### Objectif

Prédire `P(HomeHTWin), P(HTDraw), P(AwayHTWin)`.

### Label (ground truth)

Depuis `V3_Fixtures` : `halftime_home` vs `halftime_away`. 

* HomeHTWin si `halftime_home > halftime_away`
* HTDraw si égal
* AwayHTWin si `<`

### Features (pré-match)

From `V3_Team_Features_PreMatch`:

* BASELINE_V1 (elo, rank/points, lineup_strength)
* PROCESS_V1 **1H proxies** (rolling 1H shots/corners/sot_rate_1h5)
  et FT process (shots/corners/discipline/control) comme contexte.

### Dataset row

1 ligne par fixture (match vector home+away), stocké dans `V3_ML_Feature_Store_V2`:

* `feature_set_id = "HT_V1"` (ou "META_V1" si tu veux réutiliser)
* `target = "HT_RESULT"`
* `horizon_type = ...`
* `schema_version = 1`

### Modèle recommandé (baseline robuste)

* `Multinomial Logistic Regression` (softmax), régularisation L2
* Alternative : `XGBoost multiclass` (plus performant mais plus fragile)

### Outputs à stocker

Dans `V3_Submodel_Outputs` (team_id NULL car output match-level):

```json
{
  "p_home": 0.34,
  "p_draw": 0.41,
  "p_away": 0.25
}
```

---

## 1.2 Submodel B — HT_GOAL_O0_5 (But en 1ère mi-temps)

### Objectif

Prédire probabilité qu’il y ait **au moins 1 but en 1H**.

### Label

`(halftime_home + halftime_away) >= 1`

### Features

Même base que HT_RESULT, mais surtout :

* rolling 1H shots, 1H SOT, 1H corners
* discipline (cartons/fautes) = proxy intensité
* control index

### Modèle

* `Binary Logistic Regression` (calibré)
* Alternative : `Poisson regression` sur `goals_1H` puis converti en `P(X>=1)=1-exp(-λ)`.

### Outputs

```json
{
  "p_over_0_5": 0.62,
  "lambda_goals_1h": 0.95
}
```

---

## 1.3 Submodel C — CORNERS_TOTAL (Expected corners FT)

### Objectif

Prédire `λ_corners_total` (corners totaux match FT).
Puis en déduire `P(Over X.5)` pour plusieurs lignes.

### Label

Corners totaux du match = `corners_home_FT + corners_away_FT` depuis `V3_Fixture_Stats` (half=FT). 

### Features

Très efficaces :

* rolling corners_for & corners_against (5/10)
* rolling shots inside box (proxy de pression)
* possession + pass accuracy (control)
* Elo/lineup_strength (context)

**Important** : inclure à la fois “for” et “against” (style + vulnérabilité).

### Modèle recommandé

* `Poisson regression` ou `Negative Binomial` (mieux si variance > moyenne)
* Alternative simple : `XGBoost regressor`

### Outputs

Stocker à minima λ + probas des lignes que tu veux backtester:

```json
{
  "lambda_total": 10.2,
  "p_over_8_5": 0.66,
  "p_over_9_5": 0.58,
  "p_over_10_5": 0.49
}
```

---

## 1.4 Submodel D — CARDS_TOTAL (Expected cards FT)

### Objectif

Prédire `λ_cards_total` (jaunes + rouges pondérées).

### Label

* `cards_total = yellow_home + yellow_away + 2*(red_home + red_away)` (option)
  ou juste jaunes+rouges en brut selon ton usage.
  Données via `V3_Fixture_Stats` FT. 

### Features

* rolling fouls, yellow, red (5/10)
* derby flag / high_stakes
* style proxy (duels won si tu le mets via players)
* si tu ajoutes arbitre plus tard → énorme boost

### Modèle

* `Negative Binomial` recommandé
* ou `Poisson regression` baseline

### Outputs

```json
{
  "lambda_total": 4.6,
  "p_over_3_5": 0.61,
  "p_over_4_5": 0.46
}
```

---

# 2) Meta-model 1N2 : spec exacte

### Objectif

Prédire `P(HomeWin), P(Draw), P(AwayWin)` sur FT.

### Label

Depuis `V3_Fixtures`: `fulltime_home` vs `fulltime_away`. 

### Features “META_V1”

* BASELINE_V1: elo_diff, lineup_strength_diff, rank/points diff
* PROCESS_V1: shot_diff, sot_diff, corners_diff, fouls/cards diff, control index diff
* Submodel outputs (features dérivées) :

  * from HT_RESULT: p_home_ht, p_draw_ht, p_away_ht
  * from CORNERS_TOTAL: lambda_total_corners
  * from CARDS_TOTAL: lambda_total_cards
  * from HT_GOAL: p_over_0_5

**Règle** : ces outputs sont calculés **pré-match** (donc ok).

### Modèle recommandé

* `Multinomial Logistic Regression` + calibration (isotonic / temperature)
* ou `XGBoost multiclass` puis calibration

### Output

Dans `V3_ML_Predictions`:

* `p_home_win`, `p_draw`, `p_away_win`
* plus `model_registry_id`, `feature_set_id=META_V1`, `horizon_type`, `schema_version`

---

# 3) Protocole d’entraînement (obligatoire)

## 3.1 Découpage walk-forward (time series)

Pour chaque league_id :

* Train : saisons ≤ S-1
* Test : saison S
* Avancer S (rolling)

Ou plus fin :

* Train : toutes dates < D
* Test : fenêtre (D, D+90 jours)

**Règle d’or** : jamais de random split.

## 3.2 Horizon FULL / 5Y / 3Y

Tu entraînes **3 modèles par target** :

* horizon_type = FULL_HISTORICAL
* horizon_type = 5Y_ROLLING
* horizon_type = 3Y_ROLLING

Chaque modèle doit être un enregistrement distinct dans `V3_Model_Registry`. 

## 3.3 Métriques à enregistrer

* 1N2 & HT_RESULT : log loss, Brier, calibration error, accuracy (secondaire)
* corners/cards (reg) : MAE, RMSE, Poisson deviance
* si tu backtest odds : ROI, CLV (plus tard)

---

# 4) Scripts : spéc d’exécution (pipelines)

Je te propose une structure de scripts “CLI” (agent peut implémenter en Python).

## 4.1 `00_migrate_db.py`

* applique DDL
* backfill possession_pct

## 4.2 `01_backfill_lineups.py`

* parse `V3_Fixture_Lineups` → `V3_Fixture_Lineup_Players`
* enrichit sub minutes depuis events

## 4.3 `02_build_team_features.py`

* génère `V3_Team_Features_PreMatch` pour :

  * BASELINE_V1
  * PROCESS_V1
* pour tous fixtures, par league_id/season_year, pour chaque horizon_type

## 4.4 `03_build_feature_store.py`

* assemble home/away vectors → `V3_ML_Feature_Store_V2`
* pour chaque target:

  * HT_RESULT (HT_V1)
  * HT_GOAL_O0_5 (HTG_V1)
  * CORNERS_TOTAL (CORN_V1)
  * CARDS_TOTAL (CARD_V1)
  * 1N2 (META_V1) **après** submodels

## 4.5 `04_train_submodels.py`

Entraîne et remplit :

* `V3_Model_Registry` (new row)
* `V3_Submodel_Outputs` pour chaque fixture de la période cible (train+valid? non, uniquement fixtures futurs ou ensemble complet selon usage)
* optionnel : `V3_Forge_Predictions` si tu simules

## 4.6 `05_train_meta_model.py`

* lit feature vectors META_V1 + outputs submodels
* entraîne
* stocke predictions dans `V3_ML_Predictions`

## 4.7 `06_backtest.py` (plus tard)

* utilise odds closing
* produit ROI/CLV
* écrit dans `V3_Forge_Simulations` et `V3_Forge_Predictions`

---

# 5) Pseudocode entraînement générique (classification/regression)

## 5.1 Construire dataset depuis `V3_ML_Feature_Store_V2`

```pseudo
function load_dataset(db, league_id, target, feature_set_id, horizon_type, date_from=null, date_to=null):
  sql = """
    SELECT fs.fixture_id, fs.feature_vector, f.date,
           f.fulltime_home, f.fulltime_away,
           f.halftime_home, f.halftime_away
    FROM V3_ML_Feature_Store_V2 fs
    JOIN V3_Fixtures f ON f.fixture_id = fs.fixture_id
    WHERE fs.league_id=? AND fs.target=? AND fs.feature_set_id=? AND fs.horizon_type=?
  """
  params=[league_id, target, feature_set_id, horizon_type]
  if date_from: sql += " AND f.date >= ?"; params.append(date_from)
  if date_to:   sql += " AND f.date < ?";  params.append(date_to)

  sql += " ORDER BY f.date ASC"
  rows = db.query(sql, params) :contentReference[oaicite:6]{index=6}

  X=[]; y=[]; meta=[]
  for r in rows:
    vec = json_loads(r.feature_vector)
    X.append(vec_to_numeric_array(vec))  # mapping stable via feature schema
    y.append(make_label(target, r))      # HT_RESULT / 1N2 / corners / cards
    meta.append({fixture_id:r.fixture_id, date:r.date})

  return X, y, meta
```

## 5.2 Walk-forward train/validate

```pseudo
function walk_forward_splits(meta, by_season=true):
  # simplest: split by season_year (requires join)
  # returns list of (train_idx, test_idx)
  ...
```

## 5.3 Train + save registry + save outputs

```pseudo
function train_submodel(db, league_id, target, feature_set_id, horizon_type, algo, version_tag, schema_version):
  X, y, meta = load_dataset(...)

  splits = walk_forward_splits(meta)

  metrics=[]
  for (train_idx, test_idx) in splits:
    model = fit(algo, X[train_idx], y[train_idx])
    preds = predict_proba_or_value(model, X[test_idx])
    metrics.append(evaluate(target, y[test_idx], preds))

  avg_metrics = aggregate(metrics)

  # Save to V3_Model_Registry
  model_id = insert_model_registry(db, {
    league_id, target, model_type=algo.name,
    horizon_type, version_tag, schema_version,
    metrics_json=avg_metrics, is_active=1
  }) :contentReference[oaicite:7]{index=7}

  # Fit final model on all data up to last date (or chosen cutoff)
  model_final = fit(algo, X, y)
  save_model_artifact_to_disk(model_final, path="models/{model_id}.bin")

  return model_id
```

## 5.4 Générer outputs submodels (pré-match)

```pseudo
function generate_submodel_outputs(db, model_id, league_id, target, feature_set_id, horizon_type, date_from, date_to):
  model = load_model_artifact(model_id)

  X, y, meta = load_dataset(... date_from, date_to)
  preds = predict(model, X)

  db.exec("BEGIN")
  for i in range(len(meta)):
    fx_id = meta[i].fixture_id

    outputs_json = format_outputs(target, preds[i])  # ex p_home/p_draw/p_away, lambda, p_over...
    db.exec("""
      INSERT INTO V3_Submodel_Outputs(
        fixture_id, team_id, league_id, season_year,
        submodel_name, model_registry_id, horizon_type, feature_set_id, outputs_json
      ) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(...) DO UPDATE SET outputs_json=excluded.outputs_json, created_at=CURRENT_TIMESTAMP
    """, [...])  # season_year via join fixtures
  db.exec("COMMIT")
```

---

# 6) Comment “entraîner correctement” (décisions clés)

## 6.1 Standardiser un “feature schema”

Comme tu stockes `feature_vector` en JSON, tu dois figer :

* ordre des features
* noms
* types
  dans un fichier `feature_schema_META_V1.json`

Sinon : dataset non reproductible.

## 6.2 Calibration obligatoire

Pour 1N2/HT_RESULT :

* log loss & calibration sont plus importants que accuracy.
* Une régression logistique est souvent déjà bien calibrée.

## 6.3 Gestion des matchs incomplets

Exclure fixtures sans :

* stats FT pour corners/cards
* halftime score pour HT models

## 6.4 Entraîner les submodels AVANT le meta-model

Le meta-model attend :

* outputs submodels dans `V3_Submodel_Outputs` pour chaque fixture

---

# 7) Données “legacy” : impact sur entraînement

Tu n’as pas besoin de purger si tu respectes :

* `feature_set_id` ≠ legacy
* `schema_version` > 0
* `V3_Model_Registry.is_active=1`
* `V3_ML_Predictions.is_valid=1`

Tout le pipeline doit filtrer sur ces flags.

---

# 8) Ce que ton agent IA doit livrer (DoD)

1. Scripts `00` à `05` exécutables par league_id + season_year
2. Tables remplies :

* `V3_Fixture_Lineup_Players`
* `V3_Team_Features_PreMatch`
* `V3_ML_Feature_Store_V2`
* `V3_Submodel_Outputs`
* `V3_Model_Registry` mis à jour

3. Walk-forward metrics stockées dans `V3_Model_Registry.metrics_json`
4. Artifacts modèles stockés sur disque (path enregistré si tu ajoutes un champ)

---

Si tu veux, je peux te fournir ensuite :

* le **feature schema exact** (liste de 30–60 features META_V1),
* les **requêtes SQL de sanity checks** (couverture stats/lineups/events),
* et une spec “CLV/ROI backtest” quand tu brancheras odds closing.
