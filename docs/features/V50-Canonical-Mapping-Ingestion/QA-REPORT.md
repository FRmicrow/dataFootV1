# QA Report — V50-Canonical-Mapping-Ingestion

## Résumé de l'exécution
L'ingestion massive des mappings Transfermarkt (TM) et Flashscore (FS) a été réalisée avec succès pour les quatre entités principales.

| Entité | Fichier | Total Lignes | Mappés | Skippés | Raison Skipped |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Compétitions** | `competitions.csv` | 580 | 60 | 520 | Confiance < 0.8 ou absence de FS ID / Non résolu |
| **Équipes** | `equipes.csv` | 10 597 | 2 458 | 8 138 | Confiance < 0.8 ou non présent en base |
| **Stades** | `venues.csv` | 1 817 | 1 793 | 24 | Quasi-totalité mappée |
| **Personnes** | `joueurs.csv` | 108 508 | 6 276 | 102 230 | Majorité de confiance 0.000 dans la source |

## Validation technique
- **Idempotence** : Le script `ingest_mappings.js` utilise `ON CONFLICT DO NOTHING`. Il peut être relancé sans risque.
- **Performance** : L'ingestion des 100k+ joueurs s'est faite en ~1 minute grâce au batching (500 lignes/transaction).
- **Intégrité** : Aucun ID source n'a été injecté dans les tables métier (`v4.teams`, `v4.people`, etc.). Seules les tables `v4.mapping_*` ont été enrichies.

## État des Tests
- **Tests unitaires** : 14 fichiers passés, 2 échecs constatés dans `InfographicResolverServiceV4`.
- **Note sur les échecs** : Les échecs sont liés à une désynchronisation des mocks dans `InfographicResolverServiceV4.test.js` due à l'intercalage des appels asynchrones (`Promise.all`). Ce problème est pré-existant et indépendant des données de mapping injectées.

## Prochaines étapes
- Relancer les scrapers Flashscore pour vérifier que les matchs sont désormais correctement reliés aux IDs canoniques.
