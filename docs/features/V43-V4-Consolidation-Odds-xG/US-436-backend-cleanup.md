# US-436 — Nettoyage backend : format réponse + dead code

**En tant que** développeur, **je veux** que tous les controllers utilisent `error` (pas `message`) et que le dead code soit supprimé **afin de** garantir la cohérence du contrat API.

## Skills requis
`[BACKEND]` `[QA]`

## Critères d'acceptation
- [ ] `oddsController.js` lignes 37 et 74 : `message` → `error`
- [ ] `dashboardController.js` ligne 41 : `message` → `error`
- [ ] `liveBetController.js` lignes 80-86 : nested success corrigé → `{ success: false, error: '...' }`
- [ ] `importController.js` supprimé (après vérification 0 import)

## Scénarios de test
1. **Erreur odds** : service lève une exception → réponse contient `error` (pas `message`)
2. **Erreur dashboard** : idem
3. **No odds available** : liveBet → `{ success: false, error: 'No odds available' }`

## Notes techniques
- grep avant suppression : `grep -rn "importController" backend/src/`
