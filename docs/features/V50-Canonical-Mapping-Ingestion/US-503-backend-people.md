# US-503 — Ingestion massive des mappings Personnes

**En tant que** Système de Données, **je veux** importer les mappings pour les joueurs, coachs et arbitres **afin de** suivre les performances individuelles sur toutes les sources.

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le fichier `Final-TM-FS-IDs/joueurs.csv` est parsé par batch (ex: 500 lignes).
- [ ] Distinction des types de sources : `transfermarkt_player`, `transfermarkt_coach`, `transfermarkt_referee`.
- [ ] Association du `flashscore_id` au `person_id` canonique.
- [ ] Gestion des conflits et logs détaillés.

## Scénarios de test
1. **Nominal** : Un joueur existant en base via TM reçoit son FS ID.
2. **Robustesse** : Le script gère les >100k lignes sans crash mémoire.

## Notes techniques
Utiliser des transactions par batch pour accélérer l'insertion.
Vérifier les types de personnes dans la colonne `type` ou déduire du contexte si nécessaire (le fichier semble s'appeler `joueurs.csv` mais peut contenir des coachs).
