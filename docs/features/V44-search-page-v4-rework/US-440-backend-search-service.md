# US-440 — Backend Search Service

**En tant que** Développeur Backend, **je veux** implémenter un service de recherche V4 **afin de** requêter efficacement les tables de l'écosystème V4 (teams, people, competitions).

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le service `SearchServiceV4` est créé dans `backend/src/services/v4/`.
- [ ] Une méthode `globalSearch(query, options)` est implémentée.
- [ ] Les tables `v4.teams`, `v4.people` et `v4.competitions` sont interrogées via `ILIKE`.
- [ ] Les résultats sont limités pour garantir la performance.

## Scénarios de test
1. **Nominal** : Recherche "Arsenal" retourne l'équipe Arsenal FC de la table `v4.teams`.
2. **Edge case** : Recherche avec un seul caractère ne déclenche pas de requête lourde.
3. **Erreur** : Gestion propre des erreurs SQL.

## Notes techniques
- Utiliser le pool de connexion existant dans le backend.
- S'inspirer de la structure des autres services V4.
