> Obsolete Note (2026-03-18): Historical SQLite-era document kept for archive only. The active stack now uses PostgreSQL via `statfoot-db`.

# US-1901 - Schéma de Base de Données pour le ML

**Rôle :** Database Architect
**Objectif :** Mettre en œuvre le nouveau schéma de base de données nécessaire au pipeline ML V3.

## Contexte
Le pipeline ML nécessite de stocker des features calculées, des outputs de sous-modèles, des métriques de runs et des fichiers de modèles binaires. Le schéma doit être idempotent et compatible avec SQLite.

> [!IMPORTANT]
> **Indépendance Totale** : Cette feature est 100% isolée. Aucune modification ne doit impacter les tables existantes de manière disruptive. Les nouvelles tables (`V3_...`) servent uniquement au pipeline ML.

## Tâches
- [ ] Créer la table `V3_Fixture_Lineup_Players`. (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Créer la table `V3_Team_Features_PreMatch`. (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Créer la table `V3_ML_Feature_Store_V2`. (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Créer la table `V3_Submodel_Outputs`. (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Créer la table `V3_Training_Runs`. (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Ajouter les colonnes manquantes à `V3_Fixture_Stats` (`ball_possession_pct`). (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Ajouter les colonnes manquantes à `V3_ML_Predictions`. (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Définir les index sur (`fixture_id`, `team_id`) et (`league_id`, `date`). (Agent: `Database Architect`, Skill: `prisma-mcp-server`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `database-architect.md` : Pour la conception rigoureuse des schémas et index.
    - `global-coding-standards.md` : Pour le respect des conventions de nommage.
- **Skills :**
    - `prisma-mcp-server` : Utiliser les outils de migration si applicable ou s'en inspirer pour l'idempotence.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour valider l'intégrité du schéma.
    - **Analyse des Logs Docker** : Vérifier l'absence d'erreurs de migration au démarrage des services.
    - **Validation 100%** : Ne pas passer à la tâche suivante sans succès total.

## Critères d'Acceptation
- Le script de migration SQL est idempotent (CREATE TABLE IF NOT EXISTS).
- Les contraintes de clés étrangères sont définies.
- Les index sont créés pour assurer des performances de lecture lors des batchs d'entraînement.
- La structure permet le stockage de données JSON pour la flexibilité des features.
