> Obsolete Note (2026-03-18): Historical SQLite-era document kept for archive only. The active stack now uses PostgreSQL via `statfoot-db`.

Voici le **pack complet** :

1. feature schemas exacts pour **HT_RESULT / HT_GOAL_O0_5 / CORNERS_TOTAL / CARDS_TOTAL**,
2. spec exacte de `outputs_json` pour chaque submodel,
3. templates `strategy_json` pour `V3_Forge_Simulations`,
4. règles de construction des datasets (anti-leakage + exclusions) + checks.

---

# 1) Feature schemas exacts (submodels)

## 1.1 `HT_V1` — target `HT_RESULT` (multiclass)

### Features (32)

**Structure**

1. `elo_diff`
2. `rank_diff`
3. `points_diff`
4. `goals_diff_diff`
5. `lsi_diff`
6. `missing_starters_diff`

**Process 1H (diff)**
7. `sot_pm_1h5_diff`
8. `corners_pm_1h5_diff`
9. `sot_rate_1h5_diff`

**Process FT (diff)**
10. `sot_pm_5_diff`
11. `shots_pm_5_diff`
12. `corners_pm_5_diff`
13. `fouls_pm_5_diff`
14. `yellow_pm_5_diff`
15. `possession_avg_5_diff`
16. `pass_acc_rate_5_diff`
17. `sot_rate_5_diff`
18. `control_index_5_diff`

**Short-term stability (diff last10)**
19. `sot_pm_10_diff`
20. `corners_pm_10_diff`
21. `sot_rate_10_diff`

**Levels (pour asymétrie domicile)**
22. `elo_h`
23. `elo_a`
24. `possession_avg_5_h`
25. `possession_avg_5_a`
26. `control_index_5_h`
27. `control_index_5_a`

**Context**
28. `is_derby`
29. `high_stakes`
30. `travel_km`

**Sanity**
31. `missing_starters_h`
32. `missing_starters_a`

✅ Stockage :

* `V3_ML_Feature_Store_V2` :

  * `feature_set_id="HT_V1"`
  * `target="HT_RESULT"`
  * `schema_version=1`

---

## 1.2 `HTG_V1` — target `HT_GOAL_O0_5` (binary)

### Features (18)

1. `elo_diff`
2. `lsi_diff`
3. `sot_pm_1h5_diff`
4. `sot_pm_1h5_h`
5. `sot_pm_1h5_a`
6. `shots_pm_1h5_h`
7. `shots_pm_1h5_a`
8. `corners_pm_1h5_h`
9. `corners_pm_1h5_a`
10. `sot_rate_1h5_h`
11. `sot_rate_1h5_a`
12. `control_index_5_h`
13. `control_index_5_a`
14. `fouls_pm_5_h`
15. `fouls_pm_5_a`
16. `yellow_pm_5_h`
17. `yellow_pm_5_a`
18. `is_derby`

✅ Storage:

* `feature_set_id="HTG_V1"`
* `target="HT_GOAL_O0_5"`
* `schema_version=1`

---

## 1.3 `CORN_V1` — target `CORNERS_TOTAL_LAMBDA` (regression)

### Label

`y = corners_home_FT + corners_away_FT`

### Features (24)

**Corners production/vulnerability**

1. `corners_pm_5_h`
2. `corners_pm_5_a`
3. `corners_pm_5_diff`
4. `corners_pm_10_diff`

**Pressure proxies**
5. `shots_pm_5_h`
6. `shots_pm_5_a`
7. `shots_pm_5_diff`
8. `sot_pm_5_h`
9. `sot_pm_5_a`
10. `sot_pm_5_diff`
11. `sot_rate_5_h`
12. `sot_rate_5_a`

**Control/style**
13. `possession_avg_5_h`
14. `possession_avg_5_a`
15. `pass_acc_rate_5_h`
16. `pass_acc_rate_5_a`
17. `control_index_5_h`
18. `control_index_5_a`

**Context**
19. `elo_h`
20. `elo_a`
21. `elo_diff`
22. `is_derby`
23. `high_stakes`
24. `travel_km`

✅ Storage:

* `feature_set_id="CORN_V1"`
* `target="CORNERS_TOTAL_LAMBDA"`
* `schema_version=1`

---

## 1.4 `CARD_V1` — target `CARDS_TOTAL_LAMBDA` (regression)

### Label

Option A (recommandé) :
`y = yellow_total + 2*red_total` (plus sensible)
Option B : `y = yellow_total + red_total`

### Features (22)

**Discipline**

1. `fouls_pm_5_h`
2. `fouls_pm_5_a`
3. `fouls_pm_5_diff`
4. `yellow_pm_5_h`
5. `yellow_pm_5_a`
6. `yellow_pm_5_diff`
7. `red_pm_5_h`
8. `red_pm_5_a`
9. `red_pm_5_diff`

**Intensity proxies**
10. `corners_pm_5_h`
11. `corners_pm_5_a`
12. `shots_pm_5_h`
13. `shots_pm_5_a`

**Control**
14. `possession_avg_5_h`
15. `possession_avg_5_a`
16. `pass_acc_rate_5_h`
17. `pass_acc_rate_5_a`

**Context**
18. `elo_diff`
19. `is_derby`
20. `high_stakes`
21. `travel_km`
22. `rank_diff`

✅ Storage:

* `feature_set_id="CARD_V1"`
* `target="CARDS_TOTAL_LAMBDA"`
* `schema_version=1`

---

# 2) Spec exacte des `outputs_json` (submodels)

## 2.1 HT_RESULT

```json
{
  "submodel": "HT_RESULT",
  "schema_version": 1,
  "p_home": 0.34,
  "p_draw": 0.41,
  "p_away": 0.25
}
```

## 2.2 HT_GOAL_O0_5

```json
{
  "submodel": "HT_GOAL_O0_5",
  "schema_version": 1,
  "p_over_0_5": 0.62,
  "lambda_goals_1h": 0.95
}
```

## 2.3 CORNERS_TOTAL_LAMBDA

```json
{
  "submodel": "CORNERS_TOTAL",
  "schema_version": 1,
  "lambda_total": 10.2,
  "p_over_7_5": 0.75,
  "p_over_8_5": 0.66,
  "p_over_9_5": 0.58,
  "p_over_10_5": 0.49,
  "p_over_11_5": 0.40
}
```

Calcul des probas via Poisson/NB :

* `P(Over k+0.5) = 1 - CDF(k, λ)`.

## 2.4 CARDS_TOTAL_LAMBDA

```json
{
  "submodel": "CARDS_TOTAL",
  "schema_version": 1,
  "lambda_total": 4.6,
  "p_over_2_5": 0.78,
  "p_over_3_5": 0.61,
  "p_over_4_5": 0.46,
  "p_over_5_5": 0.33
}
```

---

# 3) Templates `strategy_json` pour V3_Forge_Simulations

## 3.1 1N2 Value (simple threshold)

```json
{
  "market": "1N2",
  "bet_time_rule": "CLOSE",
  "prob_source": "MODEL",
  "implied_prob_norm": true,
  "selection_rule": "ARGMAX_EDGE",
  "edge_threshold": 0.03,
  "max_bets_per_round": 10,
  "stake_rule": {
    "type": "FLAT",
    "unit": 1.0
  }
}
```

## 3.2 HT_RESULT Value

```json
{
  "market": "HT_RESULT",
  "bet_time_rule": "T-60",
  "selection_rule": "ARGMAX_EDGE",
  "edge_threshold": 0.04,
  "stake_rule": { "type": "FLAT", "unit": 1.0 }
}
```

## 3.3 Corners Over X (line fixed)

```json
{
  "market": "CORNERS_OVER",
  "line": 9.5,
  "bet_time_rule": "CLOSE",
  "selection_rule": "EDGE_OVER_LINE",
  "edge_threshold": 0.03,
  "stake_rule": { "type": "FLAT", "unit": 1.0 }
}
```

## 3.4 Cards Over X (line fixed)

```json
{
  "market": "CARDS_OVER",
  "line": 3.5,
  "bet_time_rule": "CLOSE",
  "selection_rule": "EDGE_OVER_LINE",
  "edge_threshold": 0.03,
  "stake_rule": { "type": "FLAT", "unit": 1.0 }
}
```

---

# 4) Règles dataset (anti-leakage + exclusions)

## 4.1 Exclusions par target

### HT_RESULT / HT_GOAL

Exclure fixtures où :

* `halftime_home IS NULL OR halftime_away IS NULL`
* ou `status != 'FT'` (si tu l’as)
* ou pas de features (BASELINE/PROCESS) pour les deux équipes

### Corners / Cards

Exclure fixtures où :

* pas de lignes `V3_Fixture_Stats` half='FT' pour home+away
* corners/cards NULL

## 4.2 Anti-leakage

Les features doivent être calculées avec :

* uniquement des matches `date < as_of`

Sanity SQL (déjà donné) :

* `Team_Features_PreMatch.as_of <= Fixtures.date`

---

# 5) Checks supplémentaires (spécifiques submodels)

## 5.1 Label corners/cards dispo

```sql
SELECT f.fixture_id
FROM V3_Fixtures f
LEFT JOIN (
  SELECT fixture_id,
         SUM(CASE WHEN half='FT' THEN 1 ELSE 0 END) AS ft_rows,
         SUM(CASE WHEN half='FT' AND corner_kicks IS NOT NULL THEN 1 ELSE 0 END) AS ft_corners,
         SUM(CASE WHEN half='FT' AND yellow_cards IS NOT NULL THEN 1 ELSE 0 END) AS ft_yellows
  FROM V3_Fixture_Stats
  GROUP BY fixture_id
) s ON s.fixture_id=f.fixture_id
WHERE s.ft_rows <> 2 OR s.ft_corners <> 2 OR s.ft_yellows <> 2;
```

## 5.2 Probabilités HT_RESULT qui ne somment pas à 1 (après génération)

```sql
-- Si tu stockes outputs_json, vérifie côté script, sinon extraction JSON dans SQLite est possible si JSON1 activé.
```

---

# 6) Comment brancher les submodel outputs dans META_V1

### Règle

Pour un fixture_id, tu récupères :

* `HT_RESULT` : p_home/p_draw/p_away
* `HT_GOAL_O0_5` : p_over_0_5
* `CORNERS_TOTAL` : lambda_total
* `CARDS_TOTAL` : lambda_total

Et tu ajoutes au feature vector META_V1 (META_V2 si tu veux garder META_V1 pur).

👉 Reco :

* garde `META_V1` sans outputs
* crée `META_V2` = META_V1 + submodel outputs (meilleur, plus propre)

**META_V2 extra features (6)**

* `p_home_ht`
* `p_draw_ht`
* `p_away_ht`
* `p_goal_1h_over_0_5`
* `lambda_corners_total`
* `lambda_cards_total`

---

# 7) “Exact training recipes” (par submodel)

## HT_RESULT

* algo: multinomial logistic regression (L2)
* scaling: standard scaler
* evaluation: log loss + Brier + calibration error
* store: `V3_Model_Registry.metrics_json`

## HT_GOAL_O0_5

* algo: logistic regression
* eval: log loss, AUC (secondaire), calibration
* optional: Poisson on goals_1h

## CORNERS_TOTAL

* algo: negative binomial si possible, sinon poisson
* eval: MAE + deviance
* generate probas over 7.5…11.5

## CARDS_TOTAL

* algo: negative binomial si possible, sinon poisson
* eval: MAE + deviance
* generate probas over 2.5…5.5

---

Si tu veux la prochaine brique : je peux te donner le **pseudo-code complet** de `04_train_submodels.py` et `06_backtest.py` (avec lecture odds bet-time / closing dans `V3_Odds_History`), en mode “copier-coller” pour ton agent.
