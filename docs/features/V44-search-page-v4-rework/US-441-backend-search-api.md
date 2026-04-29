# US-441 — Backend Search API

**En tant que** Développeur Backend, **je veux** exposer le service de recherche via une API REST **afin de** permettre au frontend de récupérer les résultats de recherche V4.

## Skills requis
`[BACKEND]` `[QA]`

## Critères d'acceptation
- [ ] Un contrôleur `searchControllerV4.js` est créé dans `backend/src/controllers/v4/`.
- [ ] Un routeur `search_routes_v4.js` est créé et enregistré dans `app.js` sur `/api/v4/search`.
- [ ] L'endpoint supporte les paramètres `q` (query) et `type`.
- [ ] La réponse suit le format standard `{ success: true, data: { ... } }`.

## Scénarios de test
1. **Nominal** : Un GET sur `/api/v4/search?q=Messi` retourne des résultats au format JSON.
2. **Edge case** : Paramètre `type` invalide ou manquant.
3. **Erreur** : Timeout ou erreur serveur retourne un 500 avec message clair.

## Notes techniques
- Utiliser `SearchServiceV4` pour la logique métier.
- Enregistrer la nouvelle route dans `backend/src/app.js`.
