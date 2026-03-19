Parfait — je te donne :

1. un **feature schema exact (META_V1)** prêt à figer (≈55 features),
2. des **SQL sanity checks** (couverture + cohérence + anti-leakage),
3. une **spec CLV/ROI backtest** (avec tables V3_Forge_* + odds history).

Je reste compatible PostgreSQL + ton MDD. 

---

## 1) Feature schema exact — `META_V1` (v1, stable)

### Principes

* Toujours stocker **levels + diffs** (H, A, diff) pour les blocs qui comptent.
* Tout doit être calculé **pré-match** (as_of = fixture.date).
* Tu figes un JSON schema (ordre + types) : `feature_schema_META_V1.json`.

### META_V1 — Liste de features (55)

#### A) Structure (Elo / classement / lineup)

1. `elo_h` (float)

2. `elo_a` (float)

3. `elo_diff` (float)

4. `rank_h` (int|null)

5. `rank_a` (int|null)

6. `rank_diff` (int|null)  *(rank_a - rank_h)*

7. `points_h` (int|null)

8. `points_a` (int|null)

9. `points_diff` (int|null)

10. `goals_diff_h` (int|null)

11. `goals_diff_a` (int|null)

12. `goals_diff_diff` (int|null)

13. `lsi_h` (float|null)  *(lineup_strength_v1)*

14. `lsi_a` (float|null)

15. `lsi_diff` (float|null)

16. `missing_starters_h` (int|null)

17. `missing_starters_a` (int|null)

18. `missing_starters_diff` (int|null)

#### B) Process FT — rolling last5 (levels + diff)

19. `shots_pm_5_h` (float|null)

20. `shots_pm_5_a`

21. `shots_pm_5_diff`

22. `sot_pm_5_h` (float|null)

23. `sot_pm_5_a`

24. `sot_pm_5_diff`

25. `corners_pm_5_h` (float|null)

26. `corners_pm_5_a`

27. `corners_pm_5_diff`

28. `fouls_pm_5_h` (float|null)

29. `fouls_pm_5_a`

30. `fouls_pm_5_diff`

31. `yellow_pm_5_h` (float|null)

32. `yellow_pm_5_a`

33. `yellow_pm_5_diff`

34. `red_pm_5_h` (float|null)

35. `red_pm_5_a`

36. `red_pm_5_diff`

37. `possession_avg_5_h` (float|null)

38. `possession_avg_5_a`

39. `possession_avg_5_diff`

40. `pass_acc_rate_5_h` (float|null) *(passes_accurate / total_passes)*

41. `pass_acc_rate_5_a`

42. `pass_acc_rate_5_diff`

43. `sot_rate_5_h` (float|null) *(shots_on_goal / total_shots)*

44. `sot_rate_5_a`

45. `sot_rate_5_diff`

46. `control_index_5_h` (float|null) *(composite)*

47. `control_index_5_a`

48. `control_index_5_diff`

#### C) Process FT — rolling last10 (diff only, pour limiter colinéarité)

49. `sot_pm_10_diff` (float|null)
50. `corners_pm_10_diff` (float|null)
51. `sot_rate_10_diff` (float|null)

#### D) Process 1H — rolling last5 (diff only)

52. `sot_pm_1h5_diff` (float|null)
53. `corners_pm_1h5_diff` (float|null)
54. `sot_rate_1h5_diff` (float|null)

#### E) Contexte (v1)

55. `is_derby` (int: 0/1)
56. `high_stakes` (int: 0/1)
57. `travel_km` (float)

➡️ Si tu veux strictement 55, tu peux retirer `travel_km` (faible en PL).
Mais je conseille de garder ces 3-là, donc META_V1 peut être **57** features.

### Format du fichier schema (exemple)

```json
{
  "feature_set_id": "META_V1",
  "schema_version": 1,
  "features_order": [
    "elo_h","elo_a","elo_diff",
    "rank_h","rank_a","rank_diff",
    "points_h","points_a","points_diff",
    "goals_diff_h","goals_diff_a","goals_diff_diff",
    "lsi_h","lsi_a","lsi_diff",
    "missing_starters_h","missing_starters_a","missing_starters_diff",
    "shots_pm_5_h","shots_pm_5_a","shots_pm_5_diff",
    "sot_pm_5_h","sot_pm_5_a","sot_pm_5_diff",
    "corners_pm_5_h","corners_pm_5_a","corners_pm_5_diff",
    "fouls_pm_5_h","fouls_pm_5_a","fouls_pm_5_diff",
    "yellow_pm_5_h","yellow_pm_5_a","yellow_pm_5_diff",
    "red_pm_5_h","red_pm_5_a","red_pm_5_diff",
    "possession_avg_5_h","possession_avg_5_a","possession_avg_5_diff",
    "pass_acc_rate_5_h","pass_acc_rate_5_a","pass_acc_rate_5_diff",
    "sot_rate_5_h","sot_rate_5_a","sot_rate_5_diff",
    "control_index_5_h","control_index_5_a","control_index_5_diff",
    "sot_pm_10_diff","corners_pm_10_diff","sot_rate_10_diff",
    "sot_pm_1h5_diff","corners_pm_1h5_diff","sot_rate_1h5_diff",
    "is_derby","high_stakes","travel_km"
  ],
  "types": {
    "elo_h": "float",
    "rank_h": "int_or_null",
    "...": "..."
  }
}
```

---

## 2) SQL sanity checks (à exécuter régulièrement)

### 2.1 Fixtures sans 2 équipes de stats FT

```sql
SELECT f.fixture_id, f.date, f.home_team_id, f.away_team_id
FROM V3_Fixtures f
LEFT JOIN (
  SELECT fixture_id, COUNT(*) AS cnt
  FROM V3_Fixture_Stats
  WHERE half='FT'
  GROUP BY fixture_id
) s ON s.fixture_id = f.fixture_id
WHERE s.cnt IS NULL OR s.cnt <> 2;
```

 

### 2.2 Fixtures sans stats 1H/2H (si tu en as besoin)

```sql
SELECT f.fixture_id
FROM V3_Fixtures f
LEFT JOIN (
  SELECT fixture_id,
         SUM(CASE WHEN half='1H' THEN 1 ELSE 0 END) AS c1,
         SUM(CASE WHEN half='2H' THEN 1 ELSE 0 END) AS c2
  FROM V3_Fixture_Stats
  GROUP BY fixture_id
) s ON s.fixture_id = f.fixture_id
WHERE s.c1 <> 2 OR s.c2 <> 2;
```

### 2.3 Lineups manquantes ou incomplètes

```sql
SELECT f.fixture_id, f.date
FROM V3_Fixtures f
LEFT JOIN (
  SELECT fixture_id, COUNT(*) AS teams_with_lineup
  FROM V3_Fixture_Lineups
  GROUP BY fixture_id
) lu ON lu.fixture_id = f.fixture_id
WHERE lu.teams_with_lineup IS NULL OR lu.teams_with_lineup <> 2;
```



### 2.4 Start XI absent après normalisation

```sql
SELECT f.fixture_id, p.team_id, COUNT(*) AS starters
FROM V3_Fixtures f
JOIN V3_Fixture_Lineup_Players p ON p.fixture_id = f.fixture_id
WHERE p.is_starting=1
GROUP BY f.fixture_id, p.team_id
HAVING starters < 7;  -- seuil tolérant (au cas où)
```

### 2.5 Vérifier que `as_of` est bien pré-match (anti-leakage)

```sql
SELECT tf.id, tf.fixture_id, tf.team_id, tf.as_of, f.date
FROM V3_Team_Features_PreMatch tf
JOIN V3_Fixtures f ON f.fixture_id=tf.fixture_id
WHERE tf.as_of > f.date;
```

### 2.6 Feature store complet pour un target/version

```sql
SELECT league_id, COUNT(*) AS rows
FROM V3_ML_Feature_Store_V2
WHERE feature_set_id='META_V1'
  AND target='1N2'
  AND horizon_type='5Y_ROLLING'
  AND schema_version=1
GROUP BY league_id;
```

### 2.7 Valeurs suspectes (possession, pass accuracy)

```sql
SELECT *
FROM V3_Fixture_Stats
WHERE (ball_possession_pct < 0 OR ball_possession_pct > 100)
   OR (pass_accuracy_pct < 0 OR pass_accuracy_pct > 100);
```



### 2.8 Cohérence corners/discipline (sanity simple)

```sql
SELECT fixture_id, team_id, corner_kicks, yellow_cards, red_cards
FROM V3_Fixture_Stats
WHERE half='FT'
  AND (corner_kicks < 0 OR yellow_cards < 0 OR red_cards < 0);
```

---

## 3) Spec CLV/ROI Backtest (avec V3_Forge_*)

### 3.1 Définitions

#### Implied probability (avec marge)

Pour odds décimales `o` :

* `p_raw = 1/o`

#### Normalisation sans marge (recommended)

Pour 1N2 :

* `pN_home = (1/o_home) / (1/o_home + 1/o_draw + 1/o_away)`
  idem pour draw/away.

#### Value / Edge

* `edge = p_model - pN_implied`

#### CLV (Closing Line Value)

Tu compares l’odd au moment où tu “pari” vs la closing odd :

* en log-odds (plus stable) :

  * `clv = ln(o_bet) - ln(o_close)`
* ou en implied prob :

  * `clv_prob = p_close - p_bet` (où p=1/o)

Si `clv > 0`, tu as battu la closing line (bon signe).

#### ROI

Pour mise `stake` :

* si win : profit = `stake*(o-1)`
* si lose : profit = `-stake`
* ROI = `sum(profit)/sum(stake)`

---

### 3.2 Données nécessaires (tables)

* Predictions :

  * `V3_ML_Predictions` (ou `V3_Forge_Predictions` si tu simules)  
* Odds :

  * `V3_Odds` + `V3_Odds_History` (timestamped) 
* Résultats :

  * `V3_Fixtures` fulltime scores 
* Simulations :

  * `V3_Forge_Simulations` + `V3_Forge_Bets` (tu les as)

---

### 3.3 Règles de backtest (très importantes)

1. **No leakage** : odds utilisées doivent être timestampées **avant match**.
2. Choisir un “bet time rule” :

   * “closing” (minimiser effet timing) ou
   * “T-60 minutes”, “T-24h”
3. Toujours stocker :

   * odds_bet (au moment de décision)
   * odds_close (closing snapshot)
4. Filtrer sur `is_valid=1` et modèle actif/version_tag.

---

### 3.4 Politique de sélection des bets (simple et solide)

#### 1N2

* implied prob sans marge `p_implied_norm`
* bet si `edge > threshold` (ex 0.03)
* stake fixe (ex 1u) ou Kelly fractionné (plus tard)

**Choix du side** :

* side = argmax over {home,draw,away} de `edge`

#### Corners / Cards totals

* prendre `p_over_X` de ton submodel
* comparer à `p_implied_norm` du bookmaker

---

### 3.5 Écriture dans V3_Forge_* (spec)

#### 3.5.1 Créer une simulation

Insert `V3_Forge_Simulations` :

* `model_id` (V3_Model_Registry.id)
* `league_id`
* `start_date`, `end_date`
* `bankroll_start`
* `strategy_json` (threshold, bet_time_rule, market, stake_rule)
* `calibration_tag` (ex: COMPLETE_2026_02) 

#### 3.5.2 Générer des bets

Pour chaque fixture dans range :

1. lire prediction
2. lire odds (bet_time) + odds close
3. calcul edge
4. si bet : insert dans `V3_Forge_Bets` :

   * `simulation_id`
   * `fixture_id`
   * `market` (1N2 / corners / cards)
   * `selection` (H/D/A ou OverX)
   * `odds_bet`
   * `odds_close`
   * `stake`
   * `edge`
   * `clv`
   * `result` (win/lose/push)
   * `profit`

*(si ta table n’a pas tous ces champs, tu peux packer dans `bet_details_json` ou ajouter colonnes plus tard)* 

---

### 3.6 Pseudocode backtest (résumé)

```pseudo
for fixture in fixtures_in_range:
  pred = load_prediction(fixture, model_id)
  odds_bet = load_odds_snapshot(fixture, market, bet_time_rule)
  odds_close = load_odds_snapshot(fixture, market, "CLOSE")

  implied = normalize_probs(odds_bet)
  edge_vec = pred - implied
  side = argmax(edge_vec)

  if edge_vec[side] > threshold:
     stake = fixed_stake
     result = compute_result(fixture, side)
     profit = compute_profit(stake, odds_bet[side], result)
     clv = ln(odds_bet[side]) - ln(odds_close[side])
     insert_bet(simulation_id, fixture_id, side, stake, odds_bet, odds_close, edge, clv, profit)
```

---

## 4) Ce que je te conseille d’implémenter en premier

1. `META_V1` + `HT_RESULT` (simple, propre, utile)
2. ensuite `CORNERS_TOTAL` (poisson/nb)
3. puis `CARDS_TOTAL`
4. enfin backtest CLV/ROI

---

Si tu veux, prochaine étape : je te fournis aussi un **pack “feature schema” pour HT_RESULT / CORNERS / CARDS** (les targets submodels) + la spec exacte de `outputs_json` pour chaque submodel, et des templates `strategy_json` pour V3_Forge_Simulations.
