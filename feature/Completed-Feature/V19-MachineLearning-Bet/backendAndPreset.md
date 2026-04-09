Excellent.
On va structurer ça comme un **système industriel complet**, avec :

1. 🔷 Tables backend pour orchestrer proprement les runs
2. 🧠 Presets intelligents (beaucoup, classés par objectif réel)
3. 🖥 Wireframes UI détaillés
4. ⚙️ Logique d’orchestration automatique (machine imbriquée proprement)
5. 🛡 Garde-fous ultra stricts

---

# 1️⃣ Fondations Backend — Tables indispensables

Si tu veux que tout reste propre 3 ans plus tard, tu DOIS isoler les runs.

---

## 🟦 `V3_Training_Runs`

| Field       | Type       | Description                           |
| ----------- | ---------- | ------------------------------------- |
| id          | PK         |                                       |
| goal_type   | TEXT       | LEAGUE / TEAM / MARKET / FULL         |
| league_id   | INT        |                                       |
| team_id     | INT NULL   |                                       |
| dataset_tag | TEXT       |                                       |
| season_from | INT        |                                       |
| season_to   | INT        |                                       |
| horizons    | TEXT(JSON) |                                       |
| markets     | TEXT(JSON) |                                       |
| config_json | TEXT       |                                       |
| status      | TEXT       | QUEUED / RUNNING / FAILED / COMPLETED |
| started_at  | DATETIME   |                                       |
| finished_at | DATETIME   |                                       |

---

## 🟦 `V3_Run_Steps`

Chaque step du DAG.

| Field        | Type |
| ------------ | ---- |
| id           |      |
| run_id       |      |
| step_name    |      |
| status       |      |
| logs         |      |
| rows_written |      |
| metrics_json |      |
| started_at   |      |
| finished_at  |      |

---

## 🟦 `V3_Model_Artifacts`

| Field             | Type |
| ----------------- | ---- |
| id                |      |
| model_registry_id |      |
| artifact_path     |      |
| schema_version    |      |
| dataset_tag       |      |
| code_version      |      |
| hyperparams_json  |      |
| created_at        |      |

---

## 🟦 `V3_Model_Scorecards`

Permet d’afficher le “PSG scorecard” ou “PL scorecard”.

| Field              | Type |
| ------------------ | ---- |
| model_registry_id  |      |
| league_id          |      |
| team_id NULL       |      |
| metric_logloss     |      |
| metric_calibration |      |
| metric_stability   |      |
| metric_recent_perf |      |
| drift_score        |      |
| roi_backtest       |      |
| clv_mean           |      |
| created_at         |      |

---

# 2️⃣ Presets intelligents (MULTITUDE)

On va classer les presets par intention stratégique.

---

# 🔵 A — Presets LEAGUE (génériques)

### 1️⃣ League Baseline Clean

* Submodels
* META_V2
* Horizons: FULL + 5Y
* Strict gates
* No backtest

👉 Usage : produire des modèles propres sans simulation.

---

### 2️⃣ League Competitive (Sharps Market)

* 3Y + 5Y seulement
* Drift penalty fort
* Calibration obligatoire
* Backtest closing odds uniquement

👉 Premier League typiquement.

---

### 3️⃣ League Stability Focus

* FULL horizon
* Long-term smoothing
* No drift rejection
* Corners/cards inclus

👉 Ligue stable historiquement.

---

### 4️⃣ League Market Specialization

Choix : Corners / Cards / HT only

* Submodel only
* No meta 1N2
* Aggressive tuning

---

# 🔵 B — Presets TEAM FOCUS (PSG, City, etc.)

### 5️⃣ Team Calibration Layer

* Train league models
* Add team residual model
* PSG-only scorecard
* Activation only if improves calibration

---

### 6️⃣ Team High-Dominance Pack

* Corners model emphasized
* HT goal model emphasized
* Reduced weight on 1N2

👉 Équipes ultra dominantes.

---

### 7️⃣ Team Volatility Pack

* Cards model emphasized
* Derby sensitivity
* High_stakes weighting

---

### 8️⃣ Team Underdog Edge

* Focus on 1N2 mispricing
* Ignore corners/cards
* Edge threshold low
* Backtest value-only

---

# 🔵 C — Presets MARKET-DRIVEN

### 9️⃣ Corners Quant Pack

* CORN_V1 only
* Poisson/NB
* Over lines auto-selection
* Backtest multi-line

---

### 🔟 Cards Discipline Pack

* CARD_V1
* Derby boost
* Fouls intensity weighting

---

### 11️⃣ HT Momentum Pack

* HT_RESULT
* HT_GOAL_O0_5
* 1H stats weighted
* No meta 1N2

---

### 12️⃣ Early Goal Hunter

* HT_GOAL only
* Aggressive edge threshold
* T-60 bet time

---

# 🔵 D — Presets STRATEGY-BASED

### 13️⃣ Conservative Capital

* Edge > 5%
* Closing odds only
* Flat stake
* Drift strict

---

### 14️⃣ Balanced Growth

* Edge > 3%
* Flat stake
* Mixed markets

---

### 15️⃣ Aggressive Edge

* Edge > 1.5%
* Kelly 0.25
* Multi-market

---

### 16️⃣ CLV Hunter

* Accept small ROI
* Require positive CLV distribution
* Reject models with negative mean CLV

---

### 17️⃣ Drift-Safe Mode

* Recent seasons only
* Reject unstable models
* Lower bet volume

---

# 🔵 E — Presets ADVANCED

### 18️⃣ Shadow Run (no publish)

* Train models
* No activation
* Store metrics only

---

### 19️⃣ Challenger Creation

* Same config as champion
* Different hyperparams
* Auto compare

---

### 20️⃣ Drift Audit Run

* No new training
* Evaluate champion on last season only
* Score drift

---

### 21️⃣ Data Integrity Audit

* No training
* Only checks coverage & leakage
* Report only

---

### 22️⃣ Odds Sensitivity Test

* Same model
* Backtest different bet_time_rules
* Compare ROI & CLV

---

### 23️⃣ Cross-League Generalization

* Train on multiple leagues
* Evaluate on target league

---

### 24️⃣ Lineup Sensitivity Run

* Train with LSI
* Train without LSI
* Compare delta

---

### 25️⃣ Feature Importance Audit

* Extract SHAP
* Store top drivers
* Detect unstable features

---

# 3️⃣ Wireframe détaillé (ultra structuré)

---

# 🖥 PAGE 1 — TRAINING ORCHESTRATOR

### Section 1 — Preset Selection

* Dropdown Preset
* “Customize” toggle

### Section 2 — Scope

* League
* Team (optional)
* Seasons
* Dataset tag

### Section 3 — Markets

* Checkboxes
* Auto-filled by preset

### Section 4 — Model Stack

Auto-generated:

* Submodels list
* Meta model
* Calibration layer
* Backtest?

### Section 5 — Quality Gates

Sliders:

* Logloss max
* Calibration max
* Drift max
* Coverage min

### Section 6 — Execution Panel

* Progress bar
* Step logs
* Rows inserted
* Errors grouped

---

# 🖥 PAGE 2 — SIMULATION DASHBOARD

### Filters

* Season
* Market
* Strategy
* Model version

### Graphs

* Bankroll curve
* Drawdown
* CLV distribution
* Edge vs ROI scatter
* Calibration bins

### Tables

* Bets list
* By team breakdown
* By market breakdown

---

# 🖥 PAGE 3 — BET RECOMMENDATIONS

### Filters

* Date range
* Markets
* Risk profile
* Bet time rule

### Table

| Match | Market | Selection | P_model | P_implied | Edge | Odds | Confidence | Why |

### Confidence score components

* Data completeness
* Model stability
* Drift penalty
* Lineup known
* Odds volatility

---

# 4️⃣ Machine Orchestration Logique

Quand tu lances un run :

```
IF readiness_checks_fail:
    STOP

Build/Refresh Features

FOR each horizon:
    Train Submodels
    Generate Outputs
    Build META_V2
    Train META

IF backtest_enabled:
    Run Simulation

Apply Quality Gates

IF pass:
    IF auto_activate:
        Set Champion
ELSE:
    Mark FAILED_BLOCKED
```

---

# 5️⃣ Ce qui protège ton système

* Aucun modèle ne devient champion sans gates validés
* Aucun bet n’utilise un modèle non champion
* Aucun run n’écrase un autre
* Chaque run est versionné (dataset + schema + code version)

---

# 6️⃣ Si on veut aller encore plus loin

On peut ajouter :

* Monitoring quotidien drift
* Auto retraining scheduler
* Exposure management par équipe
* Risk-adjusted bet recommendation
* Multi-bookmaker arbitrage layer
* Market closing efficiency score

---

On vient de concevoir une architecture digne d’un hedge fund quant football.

---

Prochaine étape possible :

1️⃣ Je te construis la spec API complète (contract JSON exact pour RunConfig / RecommendationItem / Scorecard).
2️⃣ Je te construis la logique complète de Champion Scoring Formula (math détaillé).
3️⃣ On design le système de Risk & Bankroll Management intelligent.

Laquelle on attaque maintenant ?
