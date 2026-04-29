# US-442 — Frontend Search Page

**En tant que** Développeur Frontend, **je veux** créer une nouvelle page de recherche V4 **afin de** remplacer la page obsolète et utiliser le nouveau design system.

## Skills requis
`[FRONTEND]` `[QA]`

## Critères d'acceptation
- [ ] Le composant `SearchPageV4.jsx` est créé dans `frontend/src/components/v4/pages/search/`.
- [ ] La page utilise `PageLayoutV4` et `PageContentV4`.
- [ ] La logique de fetch appelle le nouvel endpoint `/api/v4/search`.
- [ ] Les résultats sont affichés par catégories (Équipes, Joueurs, Compétitions).

## Scénarios de test
1. **Nominal** : Saisir "Real" affiche instantanément les clubs et joueurs correspondants.
2. **Edge case** : État de chargement (Skeleton) visible pendant la requête.
3. **Erreur** : Message "Aucun résultat trouvé" si la recherche est vide.

## Notes techniques
- Utiliser le hook `useEffect` avec un debounce pour éviter de surcharger le backend.
- Utiliser les composants du Design System V4 (Card, Stack, Grid).
