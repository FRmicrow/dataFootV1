# US-434 — Endpoints API V4 : Odds + xG

**En tant que** développeur frontend, **je veux** des endpoints V4 pour les odds et xG **afin de** pouvoir consommer ces données sans passer par les routes V3.

## Skills requis
`[BACKEND]` `[QA]`

## Critères d'acceptation
- [ ] `GET /api/v4/matches/:matchId/odds` → `{ success: true, data: [...] }`
- [ ] `GET /api/v4/competitions/:competitionId/season/:season/xg` → `{ success: true, data: [...] }`
- [ ] Validation Zod sur les paramètres (intégré dès la création)
- [ ] Réponse `{ success: false, error: "..." }` sur erreur

## Scénarios de test
1. **Nominal** : matchId valide avec odds → 200 + données
2. **Not found** : matchId sans odds → 200 + data: []
3. **Invalid param** : matchId = "abc" → 400 + error Zod

## Notes techniques
- Services dans `backend/src/services/v4/`
- Controllers dans `backend/src/controllers/v4/`
- Routes enregistrées dans `backend/src/routes/v4_routes.js`
