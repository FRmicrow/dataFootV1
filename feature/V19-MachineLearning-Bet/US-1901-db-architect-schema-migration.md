# US-1901 - Schéma de Base de Données pour le ML

**Rôle :** Database Architect
**Objectif :** Mettre en œuvre le nouveau schéma de base de données nécessaire au pipeline ML V3.

## Contexte
Le pipeline ML nécessite de stocker des features calculées, des outputs de sous-modèles, des métriques de runs et des fichiers de modèles binaires. Le schéma doit être idempotent et compatible avec PostgreSQL.

## Tâches
- [ ] Créer la table `V3_Fixture_Lineup_Players` (fixture_id, team_id, player_id, is_starting, shirt_number, player_name, position, grid, sub_in_minute, sub_out_minute).
- [ ] Créer la table `V3_Team_Features_PreMatch` (fixture_id, team_id, league_id, season_year, feature_set_id, horizon_type, as_of, features_json).
- [ ] Créer la table `V3_ML_Feature_Store_V2` (fixture_id, league_id, feature_set_id, target, horizon_type, schema_version, feature_vector).
- [ ] Créer la table `V3_Submodel_Outputs` (fixture_id, team_id, submodel_name, model_registry_id, outputs_json).
- [ ] Créer la table `V3_Training_Runs` pour l'orchestration (goal_type, status, config_json, started_at, finished_at).
- [ ] Ajouter les colonnes manquantes à `V3_Fixture_Stats` (`ball_possession_pct`).
- [ ] Ajouter les colonnes manquantes à `V3_ML_Predictions` (`model_registry_id`, `feature_set_id`, `horizon_type`, `schema_version`, `is_valid`, `data_completeness_tag`).
- [ ] Définir les index sur (fixture_id, team_id) et (league_id, date) pour optimiser les calculs de rolling stats.

## Expertise Requise
- **Agents & Rules :**
    - `database-architect.md` : Pour la conception rigoureuse des schémas et index.
    - `global-coding-standards.md` : Pour le respect des conventions de nommage.
- **Skills :**
    - `prisma-mcp-server` : Utiliser les outils de migration si applicable ou s'en inspirer pour l'idempotence.

## Critères d'Acceptation
- Le script de migration SQL est idempotent (CREATE TABLE IF NOT EXISTS).
- Les contraintes de clés étrangères sont définies.
- Les index sont créés pour assurer des performances de lecture lors des batchs d'entraînement.
- La structure permet le stockage de données JSON pour la flexibilité des features.
