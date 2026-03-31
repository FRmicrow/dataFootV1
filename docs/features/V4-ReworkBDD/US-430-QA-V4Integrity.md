# US-430 — V4 Data Integrity Validation & QA Report

**En tant que** responsable QA, **je veux** valider les données migrées **afin de** garantir que le rework V4 est prêt pour la production.

## Skills requis
`[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le script `QA-REPORT.js` (ou similaire) génère un rapport de statistiques (nb de matches, événements par match, joueurs uniques).
- [ ] Vérification qu'aucune donnée V3 n'a été corrompue ou mélangée.
- [ ] Les tests de performance sur les index sont validés.
- [ ] Le document `docs/features/V4-ReworkBDD/QA-REPORT.md` est généré avec les résultats.

## Scénarios de test
1. **Nominal** : Lancer une requête SQL complexe qui compare le dump original et les nouvelles tables V4.
2. **Edge case** : Vérifier que les dates sont au bon format `TIMESTAMPTZ`.
3. **Erreur** : Si des orphelins sont trouvés, le test échoue.

## Notes techniques
- Suivre le template `QA-REPORT.md` habituel du projet.
