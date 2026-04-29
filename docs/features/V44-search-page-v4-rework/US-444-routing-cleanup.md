# US-444 — Routing & Cleanup

**En tant que** Développeur, **je veux** brancher la nouvelle page de recherche sur la route principale **afin de** finaliser la migration.

## Skills requis
`[FRONTEND]` `[QA]`

## Critères d'acceptation
- [ ] Dans `App.jsx`, la route `/search` pointe vers `SearchPageV4`.
- [ ] Les liens de navigation dans la sidebar pointent vers la nouvelle page.
- [ ] Les anciens fichiers V3 (`SearchPageV3.jsx`, `SearchPageV3.css`) sont marqués comme dépréciés ou supprimés.
- [ ] Redirection propre des anciens paramètres de recherche si nécessaire.

## Scénarios de test
1. **Nominal** : Cliquer sur l'icône "Search" dans la sidebar ouvre `SearchPageV4`.
2. **Edge case** : Rafraîchir la page `/search` conserve les résultats (si implémenté via URL params).
3. **Erreur** : Erreur 404 si l'ancienne route est accédée (si changée).

## Notes techniques
- Mettre à jour `frontend/src/App.jsx`.
- Vérifier `V4Layout.jsx` pour les liens de la barre latérale.
