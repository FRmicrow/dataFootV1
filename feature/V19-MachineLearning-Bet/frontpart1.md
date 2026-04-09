Parfait. Je te propose une spec “double” : **Produit (UI + endpoints)** et **ML/Ops (gates, champion/challenger, drift, reproductibilité)**. L’objectif est que **chaque run** soit clean, traçable, et qu’aucun modèle douteux n’alimente la page “bets”.

---

## 1) Modèle mental du système

### Concepts indispensables

* **Dataset Snapshot** (tag) : `COMPLETE_2026_02` = périmètre de données figé (couverture + règles).
* **Run** : une exécution orchestrée (features → submodels → outputs → meta → backtest).
* **Artifact** : modèle binaire + schema + metrics + logs.
* **Champion** : modèle actif en prod pour (league, market, horizon, feature_set, schema_version).
* **Challenger** : modèle entraîné mais non activé.

Tu peux tout faire sans créer de nouvelles tables “Run”, mais en pratique c’est plus robuste d’ajouter :

* `V3_Training_Runs`
* `V3_Run_Steps`
* `V3_Model_Artifacts`
* `V3_Quality_Checks`

Sinon, tu vas surcharger `V3_Model_Registry` et perdre la lisibilité.

---

# 2) Backoffice Page 1 — “Training Orchestrator” (UI produit)

## 2.1 Wireframe (sections)

### A) Header : “New Training Run”

* **Goal** (dropdown)

  * League Pack (PL / Ligue 1)
  * Team Focus Pack (PSG)
  * Market Pack (Corners/Cards/HT only)
  * Full Stack (tout)
* **Dataset tag** (dropdown)

  * COMPLETE_2026_02
  * COMPLETE_2025_12
  * …
* **Scope**

  * League (league_id)
  * Season range (2010–2025)
  * Optional: Team focus (team_id = PSG)
* **Horizons**: FULL / 5Y / 3Y (checkbox)
* **Markets**: 1N2 / HT / Corners / Cards (checkbox)

✅ “Generate Plan” (bouton)

---

### B) “Readiness & Integrity” (bloquant)

Table avec feux 🔴🟠🟢 :

* Fixtures count / missing results
* FT stats coverage (2 rows per match)
* 1H/2H stats coverage (si HT activé)
* Lineups parsed coverage (Start XI)
* Player stats coverage (si LSI actif)
* Odds history coverage (si backtest demandé)
* Anti-leakage check (as_of <= kickoff)
* Data drift warning (si horizon FULL demandé)

✅ Boutons :

* “Auto-fix” (run backfill safe)
* “Continue” (désactivé si rouge)

---

### C) “Pipeline DAG Preview”

Graph des étapes, ex :

1. Backfill & Normalize (possession_pct, lineup_players, subst minutes)
2. Build Team_Features_PreMatch (BASELINE_V1, PROCESS_V1)
3. Build Feature Store V2 (HT_V1/HTG_V1/CORN_V1/CARD_V1/META_V1)
4. Train Submodels
5. Generate Submodel Outputs
6. Build META_V2
7. Train Meta 1N2
8. (Optional) Backtest (1N2/corners/cards)
9. Champion selection + Publish

Chaque node affiche :

* Inputs (tables)
* Outputs (tables)
* Expected rows
* Estimation durée (optionnel)
* “Requires” (dépendances)

---

### D) “Training Config”

**Validation**

* Split policy: Walk-forward by season ✅
* Minimum train rows
* Minimum test rows

**Quality gates (bloquants)**

* 1N2 logloss max
* Calibration error max
* Drift constraint (slope)
* Corners/cards deviance max
* “Stability score” min

**Activation policy**

* Auto-pick best horizon (FULL vs 5Y vs 3Y)
* Auto-activate champion (toggle)
* Keep challengers (toggle)

---

### E) “Run Execution”

* Status: queued / running / failed / completed
* Logs stream
* Counters: rows inserted per table
* Failures grouped (missing odds, null labels, etc.)
* “Retry failed steps”
* “Publish champions”

---

## 2.2 “Intelligent training” : PSG vs Premier League

### PSG Focus Pack (Ligue 1 + PSG layer)

Le backoffice doit proposer un preset :

**Pack PSG**

* Train league models (Ligue 1):

  * HT_RESULT (HT_V1)
  * HT_GOAL_O0_5 (HTG_V1)
  * CORNERS_TOTAL (CORN_V1)
  * CARDS_TOTAL (CARD_V1)
  * META_V2 (1N2)
* * option “Team calibration layer (PSG)” :

  - Un modèle de calibration uniquement sur fixtures PSG
  - Input: META_V2 probs + lineup strength + absences + style diff
  - Output: correction Δp (ou recalibration temperature)

**Outputs exploités**

* Pour bets: utiliser **league champion** + calibration PSG (si active)
* Dashboard “PSG scorecard” :

  * logloss PSG-only, calibration PSG-only, stabilité par saison
  * CLV/ROI PSG-only (si odds)

Le backoffice doit **interdire** d’activer une calibration PSG si :

* dataset PSG < seuil (ex: < 200 matches)
* gain de calibration insignifiant
* drift instable

---

### Premier League Pack

Preset PL :

* HT_RESULT, HT_GOAL, CORNERS, CARDS, META_V2
* Par défaut : horizons 3Y + 5Y (FULL optionnel)
* Quality gates plus stricts (marché efficient)

Le backoffice doit mettre une alerte :

* “FULL_HISTORICAL may underperform due to tactical drift”
  et imposer un drift check.

---

# 3) Frontend Page 2 — “Simulation Dashboard” (saison passée)

## 3.1 Wireframe

### A) Controls

* League / Season
* Market
* Model: Champion / Select challenger
* Strategy preset (threshold, bet time, stake rule)
* Bookmaker
* Filter: only Team (PSG), top6, underdogs…

### B) KPIs

* ROI, profit, #bets
* Max drawdown
* CLV mean/median
* Hit rate
* Avg edge, avg odds

### C) Charts

* Bankroll curve
* Drawdown curve
* CLV histogram
* Calibration bins (prob vs outcome)
* Edge buckets vs ROI

### D) Bets table (drill-down)

* Fixture, selection, odds bet/close, edge, CLV, result, profit
* “Explain” button → top drivers (feature deltas + submodel signals)

---

# 4) Frontend Page 3 — “Bet Recommendations” (prochains matchs)

## 4.1 Wireframe

### A) Controls

* League(s), date window
* Markets allowed
* Risk profile
* Stake rule
* “Use pre-lineup only / post-lineup only”
* Bookmaker + bet time

### B) Recommended bets list

Colonnes :

* Match / kickoff
* Market / line
* Selection
* Model P
* Implied P (normalized)
* Edge
* Odds now + odds close estimate (si dispo)
* Confidence score
* “Why” (3 bullets)
* Tags: PRE-LINEUP / POST-LINEUP / LOW-COVERAGE / DRIFT-RISK

### C) Guardrails

* Ne pas afficher si :

  * pas champion actif
  * data completeness < seuil
  * predictions non calibrées
* Limites :

  * max bets/day
  * max exposure per team
  * max exposure per market

---

# 5) API Endpoints (backend) — spec utilisable

### Training

* `POST /runs`
  body: {goal, dataset_tag, league_id, team_id?, seasons, horizons, markets, config}
  → returns run_id
* `GET /runs/:run_id` (status + logs + step results)
* `POST /runs/:run_id/start`
* `POST /runs/:run_id/retry?step=...`
* `POST /runs/:run_id/publish` (champion selection)

### Data checks

* `GET /checks/readiness?league_id&seasons&markets&dataset_tag`
* `POST /checks/autofix?league_id&seasons`

### Models registry

* `GET /models?league_id&market&active_only=true`
* `POST /models/:id/activate`
* `POST /models/:id/deactivate`

### Simulation

* `POST /simulations`
  body: {model_id(s), season, market, strategy_json, bookmaker}
  → simulation_id (writes Forge)
* `GET /simulations/:id/summary`
* `GET /simulations/:id/bets`

### Bets recommendations

* `GET /recommendations?league_id&from&to&market&risk_profile&bookmaker&bet_time_rule`
* `GET /recommendations/:fixture_id/explain`

---

# 6) ML/Ops spec (gates, champion selection, drift)

## 6.1 Quality Gates (bloquants)

**Data gates**

* FT stats coverage >= 99% (PL), >= 97% (ligue moins fiable)
* Lineups coverage >= X% si LSI utilisé
* Anti-leakage: 0 violations
* Feature schema match (no missing keys > threshold)

**Model gates**

* 1N2:

  * logloss < baseline_elo_logloss - delta_min (ou < seuil absolu)
  * calibration error < seuil
  * stability: std(logloss_by_season) < seuil
* Corners/Cards:

  * deviance < seuil, MAE < seuil
  * no “exploding lambda” outliers

**Drift gates**

* Performance sur 2 dernières saisons ne doit pas chuter > X%
* Drift score = slope(metric vs time)

Si un gate échoue → run “FAILED (blocked)”, modèle non activable.

---

## 6.2 Champion/Challenger policy

Pour chaque (league_id, market/target, horizon_type, feature_set_id, schema_version):

* Champion = meilleur score composite :

  * score = w1*logloss + w2*calibration + w3*stability + w4*recent_perf
* Challenger stockés mais non activés.

**Publication**

* “Publish champions” = bascule `is_active=1` et tag `CHAMPION`
* Les pages bets/simulation utilisent uniquement CHAMPION par défaut.

---

## 6.3 Reproductibilité

Chaque run doit stocker :

* dataset_tag
* feature schema version
* model hyperparams
* training window / split policy
* code version (git hash si possible)

Sans ça, impossible de maintenir.

---

## 6.4 “Confidence score” (pour recommendations)

Score composite (0–100) :

* Data completeness (lineups known? odds coverage?)
* Model quality (logloss vs baseline)
* Recent drift penalty
* Market volatility (draw variance, cards variance)
* Lineup uncertainty penalty

Affiché sur la page “bets”.

---

# 7) Très important : “ne pas ruiner la machine”

Les deux règles qui empêchent de tout casser :

1. **Un modèle ne peut pas être utilisé en bets** s’il n’est pas :

   * champion actif
   * dataset_tag “complete”
   * schema_version compatible
   * gates validés

2. **Aucun run ne doit écraser** les artefacts :

   * tout est versionné (feature_set_id, horizon_type, schema_version, version_tag)

---

## Suite (si tu veux que je te le “fige” encore plus)

Je peux te livrer :

* des **wireframes détaillés** (composant par composant, champs exacts, états UI)
* une **spec de “Run tables”** (DDL PostgreSQL) pour tracer tout ça proprement
* un “contract” JSON exact pour `RunConfig`, `StepResult`, `ModelScorecard`, `RecommendationItem`

Tu préfères qu’on commence par :

1. les **tables Run/Steps/Artifacts** (fondation solide),
   ou
2. les **wireframes UI** très détaillés ?
