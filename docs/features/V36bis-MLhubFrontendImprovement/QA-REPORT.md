# QA Report — V36bis-MLhubFrontendImprovement

**Date**: 2026-03-19
**Branche**: `feature/V36bis-MLhubFrontendImprovement`
**Auteur**: Claude Code

---

## Objectifs de la feature

Consolidation du ML Hub (10 pages → 7 pages) + exposition des données backend non affichées.

| Avant | Après |
|---|---|
| 10 pages isolées | 7 pages structurées |
| Edges/Reco/ClubEval non affichés | Intégrés dans les pages appropriées |
| NavBar avec 8 onglets | NavBar avec 5 onglets + 2 secondaires |

---

## Pages fusionnées

| Nouvelles pages | Pages supprimées |
|---|---|
| `MLPerformanceAnalyticsPage` (tabs: ROI Lab / Simulations / Error Lab) | `MLPerformanceLab`, `MLSimulationAnalyticsPage`, `MLErrorLabPage` |
| `MLPremiumIntelPage` (tabs: Match Premium / League Command) | `MLMatchPremiumPage`, `MLLeaguePremiumPage` |

---

## Données nouvellement exposées

| Endpoint | Intégration |
|---|---|
| `GET /ml-platform/edges/top` | Section collapsible "Top Edges" dans MLForesightHub |
| `GET /ml-platform/recommendations` | Section collapsible "Recommandations ML" dans MLForesightHub |

---

## Redirections legacy vérifiées

| Ancienne route | Nouvelle route |
|---|---|
| `/machine-learning/analytics` | `/machine-learning/performance` |
| `/machine-learning/error-lab` | `/machine-learning/performance` |
| `/machine-learning/match-premium` | `/machine-learning/premium` |
| `/machine-learning/league-premium` | `/machine-learning/premium` |

---

## Checklist QA

### Tests automatisés
- [ ] `cd frontend && npm test` — zéro régression

### Navigation
- [ ] `/machine-learning` → redirige vers `models`
- [ ] `/machine-learning/performance` → charge `MLPerformanceAnalyticsPage` avec 3 onglets (ROI Lab / Simulations / Error Lab)
- [ ] `/machine-learning/premium` → charge `MLPremiumIntelPage` avec switcher Match / League
- [ ] `/machine-learning/analytics` → redirige vers `/machine-learning/performance`
- [ ] `/machine-learning/error-lab` → redirige vers `/machine-learning/performance`
- [ ] `/machine-learning/match-premium` → redirige vers `/machine-learning/premium`
- [ ] `/machine-learning/league-premium` → redirige vers `/machine-learning/premium`

### MLPerformanceAnalyticsPage
- [ ] Onglet ROI Lab : Skeleton → sélection ligue/saison → tableau ROI
- [ ] Onglet Simulations : filtre marché, leaderboard, pattern d'erreurs
- [ ] Onglet Error Lab : filtre run/marché/type, tableau erreurs triées par sévérité
- [ ] Les 3 onglets gèrent l'état vide proprement (`MLHubEmptyState`)

### MLPremiumIntelPage
- [ ] Onglet Match Premium : sélection run → fixture → marché → lecture détaillée
- [ ] Onglet League Command : sélection ligue/saison → tableau runs par marché
- [ ] Switcher Match/League fonctionne sans rechargement des données

### MLForesightHub (enrichi)
- [ ] Section "Top Edges" : Skeleton → EdgeCards avec PowerLevel badge
- [ ] Section "Top Edges" : bouton "Réduire/Afficher" fonctionne
- [ ] Section "Recommandations ML" : masquée par défaut (recosOpen=false), s'affiche au clic
- [ ] Si pas de données : `MLHubEmptyState` propre (pas d'erreur JS)
- [ ] Sections existantes (ligues, saisons, fixtures) non affectées

### États obligatoires (Visual Manifesto)
- [ ] Skeleton visible pendant le chargement sur toutes les nouvelles pages
- [ ] Aucun `style={{...}}` avec plus de 2 propriétés
- [ ] Aucune valeur hex/rgb hardcodée — CSS variables uniquement

---

## Résultat des tests

> À remplir après exécution.

```
npm test (frontend): PENDING
```

---

## Notes

- Les fichiers supprimés (`MLPerformanceLab.jsx`, etc.) sont retirés du bundle — réduction du code mort.
- L'API `getAllSimulationJobs` est partagée entre les 2 nouvelles pages composite — un seul fetch au montage.
- `getTopEdges` et `getMLRecommendations` sont appelés une seule fois au montage de `MLForesightHub` (pas de re-fetch par ligue).
