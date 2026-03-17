# ML Training Entrypoint

Date de référence: `2026-03-14`

Ce document est le point d'entrée unique pour les prochains retrainings ML. Il décrit:
- les sources de données réellement branchées
- le contrat de features actif
- les modèles globaux et league-specific
- les résultats d'entraînement et d'expérimentation
- le statut runtime final
- les points d'attention pour la suite

## 1. Statut final à date

### Modèles globaux actifs

| Marché | Nom registre | Version active | Horizon actif | Schéma | Métriques |
|---|---|---|---|---|---|
| `1X2_FT` | `global_1x2` | `catboost_v20260314_051052` | `FULL_HISTORICAL` | `global_1x2_v3` | Accuracy `0.58898`, Log loss `0.89031`, Brier `0.52510`, F1 `0.52988` |
| `1X2_HT` | `global_ht_1x2` | `catboost_ht_full_historical_v20260314_190820_active_active` | `FULL_HISTORICAL` | `global_1x2_v3` | Accuracy `0.48006`, Log loss `1.00592` |
| `GOALS_OU` | `global_goals_ou` | `catboost_goals_5y_rolling_v20260314_193140_active_active` | `5Y_ROLLING` | `global_1x2_v3` | RMSE `1.77356`, Over 2.5 accuracy `0.58871` |
| `CORNERS_OU` | `global_corners_ou` | `catboost_corners_3y_rolling_v20260314_193903_active_active` | `3Y_ROLLING` | `global_1x2_v3` | RMSE `3.40029`, Over 9.5 accuracy `0.54959` |
| `CARDS_OU` | `global_cards_ou` | `catboost_cards_5y_rolling_v20260314_194002_active_active` | `5Y_ROLLING` | `global_1x2_v3` | RMSE `2.30884`, Over 4.5 accuracy `0.59069` |

### Point important sur `1X2_FT`

Le modèle `global_1x2` actuellement actif est `v3 FULL_HISTORICAL`. Historiquement, la meilleure perf observée avant rollback/retests était le `v2` `catboost_v20260313_135225` avec:
- Accuracy `0.59331`
- Log loss `0.88172`
- Brier `0.51960`

Le `v3` actif est donc plus cohérent avec le nouveau socle de données/features, mais pas le meilleur strictement en perf brute sur le comparatif `v2 -> v3`.

## 2. Sources de données réellement utilisées

### Tables runtime principales

- `V3_Fixtures`
- `V3_Fixture_Stats`
- `V3_ML_Feature_Store`
- `V3_Model_Registry`
- `V3_Submodel_Outputs`
- `V3_Risk_Analysis`

### Historique détaillé branché

L'historique détaillé `2015/2016+` a été remonté depuis `ml_matches` vers `V3_Fixture_Stats` pour:
- possession
- tirs
- tirs cadrés
- tirs non cadrés
- corners
- cartons jaunes
- granularité `FT`, `1H`, `2H`

Ce backfill a permis:
- régénération de `PROCESS_V1`
- reconstruction complète de `V3_ML_Feature_Store`
- retrain des modèles globaux

### Limites connues des données historiques

Les signaux suivants ne viennent pas encore de ce backfill détaillé historique:
- `fouls` historiques profonds selon le même pipeline
- `offsides` historiques profonds selon le même pipeline

Ces deux familles restent des candidates d'enrichissement futur.

## 3. Contrat de features actif

Version active du schéma:
- [feature_schema.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/feature_schema.py)
- `GLOBAL_1X2_FEATURE_SCHEMA_VERSION = global_1x2_v3`
- `130` features

### Bloc 1. Momentum résultats et solidité

| Features | Explication |
|---|---|
| `mom_gd_h3`, `mom_gd_h5`, `mom_gd_h10`, `mom_gd_h20` | Différentiel de buts récent de l'équipe à domicile sur les 3, 5, 10 et 20 derniers matchs |
| `mom_pts_h3`, `mom_pts_h5`, `mom_pts_h10`, `mom_pts_h20` | Moyenne de points récents de l'équipe à domicile sur 3, 5, 10 et 20 matchs |
| `win_rate_h5`, `win_rate_h10` | Taux de victoire récent de l'équipe à domicile sur 5 et 10 matchs |
| `cs_rate_h5`, `cs_rate_h10` | Taux de clean sheets récent de l'équipe à domicile sur 5 et 10 matchs |
| `mom_gd_a3`, `mom_gd_a5`, `mom_gd_a10`, `mom_gd_a20` | Différentiel de buts récent de l'équipe à l'extérieur sur les 3, 5, 10 et 20 derniers matchs |
| `mom_pts_a3`, `mom_pts_a5`, `mom_pts_a10`, `mom_pts_a20` | Moyenne de points récents de l'équipe à l'extérieur sur 3, 5, 10 et 20 matchs |
| `win_rate_a5`, `win_rate_a10` | Taux de victoire récent de l'équipe à l'extérieur sur 5 et 10 matchs |
| `cs_rate_a5`, `cs_rate_a10` | Taux de clean sheets récent de l'équipe à l'extérieur sur 5 et 10 matchs |
| `rest_h`, `rest_a` | Nombre de jours de repos avant le match pour chaque équipe |
| `venue_diff_h`, `venue_diff_a` | Différentiel de performance domicile/extérieur pour chaque équipe |
| `def_res_h`, `def_res_a` | Résilience défensive synthétique par équipe |

### Bloc 2. Baseline force intrinsèque

| Features | Explication |
|---|---|
| `home_b_elo`, `away_b_elo`, `diff_elo` | Elo des deux équipes et écart Elo |
| `home_b_rank`, `away_b_rank`, `diff_rank` | Rang des deux équipes et différentiel de rang |
| `home_b_points`, `away_b_points`, `diff_points` | Points au classement et écart de points |
| `home_b_goals_diff`, `away_b_goals_diff`, `diff_goals_diff` | Différentiel de buts cumulé et écart entre équipes |
| `home_b_played`, `away_b_played` | Nombre de matchs déjà joués |
| `home_b_lineup_strength_v1`, `away_b_lineup_strength_v1`, `diff_lineup_strength` | Force de onze de départ estimée et écart entre équipes |
| `home_b_missing_starters_count`, `away_b_missing_starters_count` | Nombre de titulaires manquants estimés |

### Bloc 3. Process/style récents

| Features | Explication |
|---|---|
| `home_p_possession_avg_5`, `away_p_possession_avg_5`, `diff_possession_l5` | Possession moyenne récente sur 5 matchs et écart |
| `home_p_control_index_5`, `away_p_control_index_5`, `diff_control_l5` | Indice de contrôle du jeu récent et écart |
| `home_p_shots_per_match_5`, `away_p_shots_per_match_5`, `diff_shots_l5` | Volume de tirs récents et écart |
| `home_p_sot_per_match_5`, `away_p_sot_per_match_5`, `diff_sot_l5` | Volume de tirs cadrés récents et écart |
| `home_p_corners_per_match_5`, `away_p_corners_per_match_5`, `diff_corners_l5` | Volume de corners récents et écart |
| `home_p_fouls_per_match_5`, `away_p_fouls_per_match_5`, `diff_fouls_l5` | Volume de fautes récentes et écart |
| `home_p_yellow_per_match_5`, `away_p_yellow_per_match_5`, `diff_yellow_l5` | Volume de cartons jaunes récents et écart |
| `home_p_red_per_match_5`, `away_p_red_per_match_5`, `diff_red_l5` | Volume de cartons rouges récents et écart |
| `home_p_pass_acc_rate_5`, `away_p_pass_acc_rate_5` | Qualité moyenne de circulation de balle sur 5 matchs |
| `home_p_sot_rate_5`, `away_p_sot_rate_5` | Ratio tirs cadrés / tirs sur 5 matchs |

### Bloc 4. Ratios de style et profils de 1re mi-temps

| Features | Explication |
|---|---|
| `home_p_shot_volume_1h_share_5`, `away_p_shot_volume_1h_share_5` | Part du volume de tirs produite en 1re mi-temps |
| `home_p_sot_volume_1h_share_5`, `away_p_sot_volume_1h_share_5` | Part du volume de tirs cadrés produite en 1re mi-temps |
| `home_p_corner_volume_1h_share_5`, `away_p_corner_volume_1h_share_5` | Part des corners obtenus en 1re mi-temps |
| `home_p_non_sot_rate_5`, `away_p_non_sot_rate_5` | Ratio tirs non cadrés / tirs |
| `home_p_corner_to_shot_rate_5`, `away_p_corner_to_shot_rate_5` | Ratio corners / tirs |
| `home_p_cards_per_foul_5`, `away_p_cards_per_foul_5` | Conversion fautes -> cartons |
| `home_p_cards_pressure_5`, `away_p_cards_pressure_5` | Pression disciplinaire synthétique |
| `home_p_possession_to_shot_5`, `away_p_possession_to_shot_5` | Efficacité de transformation de la possession en tirs |
| `home_p_xg_per_shot_5`, `away_p_xg_per_shot_5` | Qualité moyenne d’un tir en xG |
| `home_p_xg_per_sot_5`, `away_p_xg_per_sot_5` | Qualité moyenne d’un tir cadré en xG |

### Bloc 5. xG momentum

| Features | Explication |
|---|---|
| `mom_xg_f_h5`, `mom_xg_f_h10` | xG offensif récent de l'équipe à domicile |
| `mom_xg_a_h5`, `mom_xg_a_h10` | xG défensif concédé récemment par l'équipe à domicile |
| `xg_eff_h5` | Efficacité buts / xG de l'équipe à domicile sur 5 matchs |
| `mom_xg_f_a5`, `mom_xg_f_a10` | xG offensif récent de l'équipe à l'extérieur |
| `mom_xg_a_a5`, `mom_xg_a_a10` | xG défensif concédé récemment par l'équipe à l'extérieur |
| `xg_eff_a5` | Efficacité buts / xG de l'équipe à l'extérieur sur 5 matchs |
| `diff_xg_for_l5` | Différentiel d'xG offensif récent entre équipes |
| `diff_xg_against_l5` | Différentiel d'xG concédé récent entre équipes |
| `diff_xg_eff_l5` | Différentiel d'efficacité xG entre équipes |

### Bloc 6. Matchup features

| Features | Explication |
|---|---|
| `matchup_tempo_sum_5` | Indice global de rythme du matchup |
| `matchup_shot_quality_gap_5` | Écart de qualité de tir entre les deux équipes |
| `matchup_possession_gap_5` | Écart de profil de possession |
| `matchup_control_gap_5` | Écart de contrôle du jeu |
| `matchup_corner_pressure_sum_5` | Pression corners cumulée du matchup |
| `matchup_discipline_sum_5` | Intensité disciplinaire cumulée du matchup |
| `matchup_foul_intensity_sum_5` | Intensité fautes cumulée du matchup |
| `matchup_first_half_tempo_sum_5` | Rythme attendu en 1re mi-temps |
| `matchup_first_half_sot_sum_5` | Volume attendu de tirs cadrés en 1re mi-temps |
| `matchup_open_game_index_5` | Indice d'ouverture globale du match |

### Bloc 7. Contexte compétition

| Features | Explication |
|---|---|
| `competition_importance` | Importance relative de la compétition |
| `country_importance` | Poids footballistique du pays/écosystème |
| `is_cup` | 1 si compétition de coupe |
| `is_league` | 1 si championnat |
| `is_international_competition` | 1 si compétition internationale clubs/sélections |
| `is_knockout` | 1 si contexte à élimination directe |
| `stage_weight` | Poids du stade de compétition |
| `is_derby` | 1 si derby détecté |
| `travel_km` | Distance de déplacement estimée |
| `high_stakes` | Indicateur synthétique d'enjeu fort |

## 4. Description des modèles

### `global_1x2`

- Marché: `1N2_FT`
- Type: classification CatBoost multiclasses
- Scope: global
- Entrée: `feature_vector` de `V3_ML_Feature_Store`
- Sortie: probabilités `1`, `N`, `2`
- Usage runtime: `FT_RESULT`

### `global_ht_1x2`

- Marché: `1N2_HT`
- Type: double régression Poisson / CatBoost transformée en distribution `1N2` à la mi-temps
- Scope: global
- Entrée: même feature store `v3`
- Sortie: probabilités `1`, `N`, `2` à la mi-temps
- Usage runtime: `HT_RESULT`

### `global_goals_ou`

- Marché: `GOALS_OU`
- Type: deux régressions CatBoost Poisson-like (`home_goals`, `away_goals`)
- Scope: global
- Sortie: `expected_goals.home`, `expected_goals.away`, `expected_goals.total`, puis lignes `Over/Under`
- Usage runtime: `GOALS_TOTAL`

### `global_corners_ou`

- Marché: `CORNERS_OU`
- Type: deux régressions CatBoost Poisson-like (`home_corners`, `away_corners`)
- Scope: global
- Sortie: `expected_corners`, lignes `Over/Under 7.5 -> 11.5`
- Usage runtime: `CORNERS_TOTAL`

### `global_cards_ou`

- Marché: `CARDS_OU`
- Type: deux régressions CatBoost Poisson-like (`home_cards`, `away_cards`)
- Scope: global
- Sortie: `expected_cards`, lignes `Over/Under 2.5 -> 6.5`
- Usage runtime: `CARDS_TOTAL`

### Modèles `league-specific`

Ils sont entraînés uniquement sur les matchs d'une ligue donnée, comparés au global sur cette même ligue, puis placés en:
- `shadow`
- `rejected`
- `active` si un jour prouvé supérieur en production réelle

Ils sont stockés dans `V3_Model_Registry` sous des noms comme:
- `league_1x2_ft_2`
- `league_goals_ou_32`
- `league_cards_ou_11`

## 5. Résultats d'entraînement globaux

### Comparatif `v2 -> v3`

Source:
- [v3_active_model_metric_comparison.json](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/reports/v3_active_model_metric_comparison.json)

Résumé:

| Marché | Lecture |
|---|---|
| `1X2_FT` | `v3` inférieur au meilleur `v2` |
| `1X2_HT` | `v3` globalement stable |
| `GOALS_OU` | `v3` stable, puis optimisé par choix d'horizon |
| `CORNERS_OU` | fort intérêt pour horizon récent |
| `CARDS_OU` | intérêt clair pour horizon récent |

### Expériences d'horizon

#### `1X2_FT`

Source:
- [global_1x2_horizon_report.json](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/reports/global_1x2_horizon_report.json)

| Horizon | Accuracy | Log loss | Brier | Décision |
|---|---:|---:|---:|---|
| `FULL_HISTORICAL` | `0.59013` | `0.88838` | `0.52397` | Meilleur `FULL v3` |
| `5Y_ROLLING` | `0.59102` | `0.88867` | `0.52349` | Meilleur `v3` si on privilégie accuracy/brier |
| `3Y_ROLLING` | `0.58256` | `0.90079` | `0.53124` | Rejeté |

Décision finale:
- `v3 5Y` est le meilleur challenger `v3`
- le runtime est resté sur `v3 FULL` au registre actif
- historiquement, le meilleur strictement observé reste le `v2`

#### `1X2_HT`, `GOALS_OU`, `CORNERS_OU`, `CARDS_OU`

Source:
- [remaining_horizon_report.json](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/reports/remaining_horizon_report.json)

| Marché | FULL | 5Y | 3Y | Décision finale |
|---|---|---|---|---|
| `1X2_HT` | Accuracy `0.48006`, Log loss `1.00592` | Accuracy `0.47358`, Log loss `1.00819` | Accuracy `0.47228`, Log loss `1.00792` | `FULL_HISTORICAL` |
| `GOALS_OU` | RMSE `1.78933`, Over2.5 `0.59051` | RMSE `1.77356`, Over2.5 `0.58871` | RMSE `1.77862`, Over2.5 `0.58758` | `5Y_ROLLING` |
| `CORNERS_OU` | RMSE `3.54129`, Over9.5 `0.54789` | RMSE `3.40716`, Over9.5 `0.54169` | RMSE `3.40029`, Over9.5 `0.54959` | `3Y_ROLLING` |
| `CARDS_OU` | RMSE `2.31672`, Over4.5 `0.58295` | RMSE `2.30884`, Over4.5 `0.59069` | RMSE `2.30940`, Over4.5 `0.58770` | `5Y_ROLLING` |

## 6. Politique `league-specific`

Source:
- [league_model_policy.json](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/reports/league_model_policy.json)

### `FT 1X2`

Shadow:
- `2` Premier League
- `30` Eredivisie
- `34` Primeira Liga

Rejetées:
- `15` Serie A
- `11` La Liga
- `19` Bundesliga
- `1` Ligue 1
- `32` Jupiler Pro League

Horizons recommandés:
- toutes les ligues `FT shadow` restent en `FULL_HISTORICAL`

### `HT 1X2`

Shadow:
- aucune

Rejetées:
- `2, 15, 11, 19, 1, 30, 32, 34`

### `GOALS_OU`

Shadow:
- `30` Eredivisie -> `FULL_HISTORICAL`
- `32` Jupiler Pro League -> `3Y_ROLLING`

Rejetées:
- `2, 15, 11, 19, 1, 34`

### `CORNERS_OU`

Shadow:
- aucune

Rejetées:
- `2, 15, 11, 19, 1, 30, 32, 34`

### `CARDS_OU`

Shadow:
- `11` La Liga -> `5Y_ROLLING`
- `1` Ligue 1 -> `FULL_HISTORICAL`

Rejetées:
- `2, 15, 19, 30, 32, 34`

### Versions league-specific activées

Source:
- [shadow_league_horizon_recommendations.json](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/reports/shadow_league_horizon_recommendations.json)

Ligues activées en base comme candidates `shadow`:
- `league_1x2_ft_2` -> `FULL_HISTORICAL`
- `league_1x2_ft_30` -> `FULL_HISTORICAL`
- `league_1x2_ft_34` -> `FULL_HISTORICAL`
- `league_goals_ou_30` -> `FULL_HISTORICAL`
- `league_goals_ou_32` -> `3Y_ROLLING`
- `league_cards_ou_11` -> `5Y_ROLLING`
- `league_cards_ou_1` -> `FULL_HISTORICAL`

## 7. Compétitions UEFA testées

Tests effectués:
- `UEFA Champions League (1475)`
- `UEFA Europa League (1476)`

Verdict:
- `FT` UEFA: moins bon que le global
- `GOALS` UEFA: pas assez propre pour passer en `shadow`

Conclusion:
- `UCL` et `UEL` restent `global-only`

## 8. Couche d'ajustement par ligue

Fichiers:
- [build_league_adjustment_factors.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/build_league_adjustment_factors.py)
- [league_adjustments.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/league_adjustments.py)
- [league_adjustment_factors.json](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/reports/league_adjustment_factors.json)

### Objectif

Ajouter une correction légère, bornée et traçable par ligue, sans remplacer les modèles.

### Marchés couverts

- `GOALS_OU`
- `CARDS_OU`
- `CORNERS_OU`

### Couverture

- `47` ligues couvertes
- condition: au moins `120` matchs exploitables sur la fenêtre récente `5Y`

### Indices calculés

#### Pour `GOALS_OU`

- `goal_openness_index`
- `tempo_index`
- `control_index`
- `discipline_index`
- `sample_confidence`

#### Pour `CARDS_OU`

- `discipline_index`
- `tempo_index`
- `control_index`
- `sample_confidence`

#### Pour `CORNERS_OU`

- `corner_pressure_index`
- `tempo_index`
- `control_index`
- `goal_openness_index`
- `sample_confidence`

### Sortie runtime

Dans les payloads `GOALS_TOTAL`, `CARDS_TOTAL`, `CORNERS_TOTAL`, on trouve maintenant:

- `adjustment_evaluation.without_adjustment`
- `adjustment_evaluation.with_league_adjustment`

La correction reste bornée par un cap par ligue:
- `GOALS`: cap typique `0.02 -> 0.03`
- `CARDS`: cap typique `0.025 -> 0.04`
- `CORNERS`: cap typique `0.025 -> 0.035`

### Exemples observés

#### `GOALS_OU`

- Premier League fixture `11927`
  - brut `Over 2.5`: `0.3330`
  - ajusté: `0.3591`

- La Liga fixture `48504`
  - brut `Over 2.5`: `0.4882`
  - ajusté: `0.5090`

#### `CARDS_OU`

- La Liga fixture `48504`
  - brut `Over 4.5`: `0.4301`
  - ajusté: `0.4316`

- Ligue 1 fixture `5865`
  - brut `Over 4.5`: `0.4779`
  - ajusté: `0.4469`

#### `CORNERS_OU`

- La Liga fixture `48504`
  - `recommended_total_corners_delta`: `0.127944`
  - `applied_over_9_5_delta`: `0.00433`

- Premier League fixture `11927`
  - `recommended_total_corners_delta`: `0.222414`
  - `applied_over_9_5_delta`: `0.01497`

## 9. Shadow runtime actuel

### Déjà branché au runtime

- `FT 1X2` league-specific shadow
- `GOALS_OU` league-specific shadow
- `CARDS_OU` league-specific shadow

### Runtime `global-only`

- `HT 1X2`
- `CORNERS_OU` league-specific
- `UCL` / `UEL`

### Coexistence shadow modèles + ajustements

Pour `GOALS` et `CARDS`:
- le modèle global reste primaire
- un éventuel `league_specific_candidate` peut être ajouté en `shadow_evaluation`
- un éventuel `with_league_adjustment` peut être ajouté en `adjustment_evaluation`

Ce sont deux couches différentes:
- `shadow_evaluation`: compare un autre modèle
- `adjustment_evaluation`: corrige légèrement la sortie du global

## 10. Scripts importants

### Reconstruction et retrain

- [features.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/features.py)
- [run_historical_retrain_pipeline.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/run_historical_retrain_pipeline.py)
- [run_v3_post_global_pipeline.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/run_v3_post_global_pipeline.py)

### Expériences d'horizons

- [run_1x2_horizon_experiments.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/run_1x2_horizon_experiments.py)
- [recommend_1x2_horizon.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/recommend_1x2_horizon.py)
- [activate_recommended_horizons.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/activate_recommended_horizons.py)

### League-specific

- [evaluate_league_eligibility.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/evaluate_league_eligibility.py)
- [build_league_model_policy.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/build_league_model_policy.py)
- [apply_shadow_league_horizon_recommendations.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/apply_shadow_league_horizon_recommendations.py)

### Ajustements ligue

- [build_league_adjustment_factors.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/build_league_adjustment_factors.py)
- [league_adjustments.py](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/league_adjustments.py)

## 11. Recommandations pour les prochains entraînements

### À garder

- conserver le schéma `global_1x2_v3` comme source de vérité du feature store
- conserver les horizons actifs actuels:
  - `HT`: `FULL`
  - `GOALS`: `5Y`
  - `CORNERS`: `3Y`
  - `CARDS`: `5Y`

### À surveiller

- la décision finale sur `global_1x2`
  - le runtime actif est `v3 FULL`
  - mais la meilleure perf historique reste `v2`
- la calibration réelle de la couche d'ajustement ligue
- la valeur métier réelle des modèles `league-specific shadow`

### Priorités futures

1. mesurer en conditions réelles les écarts:
   - global brut
   - global ajusté
   - league-specific shadow
2. brancher une couche d'observabilité dédiée sur ces trois vues
3. enrichir encore l'historique détaillé si possible avec:
   - `fouls`
   - `offsides`
   - `touches`
   - `coups francs`
4. préparer un `v4` si de nouvelles données `2013+` plus fines arrivent

## 12. Résumé exécutable

Si un nouveau cycle doit repartir demain:

1. vérifier l'intégrité de `V3_ML_Feature_Store`
2. vérifier les données historiques dans `V3_Fixture_Stats`
3. lancer ou reprendre le retrain global
4. recalculer les horizons si le socle change
5. recalculer la policy `league-specific`
6. régénérer `league_adjustment_factors.json`
7. redémarrer `statfoot-ml-service`
8. valider:
   - payload global
   - `shadow_evaluation`
   - `adjustment_evaluation`

Ce document doit être considéré comme la référence de départ pour tout prochain retraining `V36+`.
