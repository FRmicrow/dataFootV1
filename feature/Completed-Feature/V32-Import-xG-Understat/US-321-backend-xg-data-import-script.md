# US-321: Data Import Script for xG Data

**Role**: Backend Engineer / Data Engineer

## Description
En tant qu'Ingénieur Data, je veux un script Node.js capable de lire les fichiers JSON fournis par Understat, de réconcilier les équipes/fixtures avec la base de données actuelle (V3), et d'insérer ou mettre à jour les données xG.

## Critères d'Acceptation (DoD)
1. Le script doit parser `xGData/understat/understat_*_all_matches.json`.
2. Le script doit appliquer un algorithme de mapping robuste (ou un dictionnaire de correspondance manuel le cas échéant) pour lier les équipes Understat avec `V3_Teams`.
3. Le script doit mettre à jour `V3_Fixtures` (`understat_id`, `xg_home`, `xg_away`) pour les matchs existants (en se basant sur la date et les équipes à domicile/extérieur).
4. Le script doit parser `xGData/xG-PerYear-League-Player/` et insérer les lignes dans `V3_League_Season_xG`, avec l'objet JSON source stocké dans `raw_json`.
5. Le script génère des logs structurés (logger du projet) pour mesurer le taux de succès du matching et aider au débogage des correspondances non trouvées.

## Scénarios de Test / Preuves (QA)
- **Scénario 1** : Lancer l'import sur une ligue (ex: EPL 2015-2016) et vérifier que les matchs correspondants dans `V3_Fixtures` ont leurs colonnes xG mises à jour.
- **Scénario 2** : Vérifier que `V3_League_Season_xG` contient bien 20 lignes pour la Premier League 2015-2016.
- **Scénario 3** : Les données du `raw_json` doivent refléter correctement la ligne d'origine.
- **Scénario 4** : S'assurer que le script de migration gère bien les conflits (ex: `ON CONFLICT` en PostgreSQL, ou requêtes paramétrées sécurisées) si on l'exécute plusieurs fois (idempotence).
