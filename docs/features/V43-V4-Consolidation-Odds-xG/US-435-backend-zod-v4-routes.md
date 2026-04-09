# US-435 — Validation Zod sur toutes les routes V4

**En tant que** développeur, **je veux** que toutes les routes V4 soient validées par Zod **afin d'** assurer la sécurité et la cohérence des paramètres entrants.

## Skills requis
`[BACKEND]` `[SECURITY]` `[QA]`

## Critères d'acceptation
- [ ] `backend/src/schemas/v4Schemas.js` créé avec tous les schémas V4
- [ ] `validateRequest` appliqué sur les 11 routes V4 existantes
- [ ] Routes odds + xG (US-434) validées dès leur création
- [ ] Paramètre invalide → 400 + `{ success: false, error: "..." }`

## Scénarios de test
1. **Param valide** : league/season corrects → passe la validation → 200
2. **Param invalide** : matchId = "abc" → 400
3. **Param manquant** : route sans param requis → 400

## Notes techniques
- Fichier `v4Schemas.js` à créer dans `backend/src/schemas/`
- Importer `validateRequest` de `backend/src/middleware/validateRequest.js`
