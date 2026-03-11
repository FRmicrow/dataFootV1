# US-320: Schema Migration for xG Data

**Role**: Backend Engineer

## Description
En tant que Backend Engineer, je veux créer une migration de base de données (PostgreSQL) pour ajouter les colonnes nécessaires à la gestion des données xG (Expected Goals) afin de préparer le système à recevoir les imports Understat.

## Critères d'Acceptation (DoD)
1. Ajout de `understat_id` (INTEGER, UNIQUE), `xg_home` (REAL) et `xg_away` (REAL) dans la table `V3_Fixtures`.
2. Création d'une nouvelle table `V3_League_Season_xG` pour les statistiques avancées par équipe et par saison.
3. Le script de migration s'exécute sans erreur sur l'environnement de développement.
4. La table `V3_League_Season_xG` contient une colonne `raw_json` de type `JSONB` pour stocker la donnée source brute.

## Scénarios de Test / Preuves (QA)
- **Scénario 1** : Tester l'exécution de la migration via `npm run migrate` ou appel direct au script.
- **Scénario 2** : Vérifier que les colonnes existent bien dans `V3_Fixtures` (`\d V3_Fixtures`).
- **Scénario 3** : Vérifier la structure de `V3_League_Season_xG` (`\d V3_League_Season_xG`).
