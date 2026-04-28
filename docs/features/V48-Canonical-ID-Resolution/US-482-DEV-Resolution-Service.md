# US-482 — ResolutionServiceV4

**En tant que** développeur, **je veux** un service centralisé de résolution d'identifiants **afin de** garantir que chaque donnée entrante est associée à la bonne entité canonique.

## Skills requis
`[BACKEND]` `[DATABASE]` `[QA]`

## Critères d'acceptation
- [ ] Le service `ResolutionServiceV4` est implémenté dans `backend/src/services/v4/`.
- [ ] Il expose les méthodes `resolveTeam`, `resolvePerson`, `resolveCompetition`, `resolveVenue`.
- [ ] La résolution utilise d'abord le mapping exact `(source, source_id)`.
- [ ] Si non trouvé, une logique heuristique est appliquée (notamment pour People : Nom + Nationalité + Date Naissance).
- [ ] En dernier recours, une nouvelle entité canonique est créée et mappée automatiquement.

## Scénarios de test
1. **Source connue** : Résolution via `mapping_people` -> succès immédiat.
2. **Nouvelle source (ex: Flashscore)** : Matching heuristique par nom/date de naissance sur un joueur existant -> création du nouveau mapping.
3. **Inconnu total** : Création d'une nouvelle ligne dans `v4.people` + mapping.

## Notes techniques
- Utiliser `backend/src/utils/logger.js` pour tracer les résolutions.
- Gérer les transactions pour éviter les mappings orphelins.
