# Implementation Plan : V28 Closure & ML Hub UI Refinement

Ce plan détaille la finalisation de la fonctionnalité **V28-ImportOdds** (merge et archive) ainsi que la refonte visuelle complète du **ML Hub** pour aligner les modules existants avec le **Design System V3**.

## User Review Required

> [!IMPORTANT]
> - **Fusion Git** : Conformément à la règle `git-engineer.md`, j'ai besoin de votre accord pour fusionner `feature/V28-ImportOdds` dans `main` une fois le plan validé.
> - **Impact UI** : Les pages `MLOrchestratorPage`, `MLSimulationDashboard` et `MLBetRecommendations` vont être restructurées pour utiliser les composants `MetricCard`, `Stack`, `Grid` et `FixtureRow` du Design System.

## Proposed Changes

### 1. Finalisation Feature V28 (Git Engineer)
- **Merge** : Fusion de la branche de travail vers `main`.
- **Archives** : Déplacement des documents de conception internes vers `docs/features/V28-ImportOdds/`.
- **Nettoyage** : Suppression de la branche locale après fusion.

---

### 2. Refonte ML Hub (Frontend Engineer)

#### [MODIFY] [MLOrchestratorPage.jsx](file:///Users/dominiqueparsis/statFootV3/frontend/src/components/v3/modules/ml/MLOrchestratorPage.jsx)
- Remplacement du tableau de bord "Status" par des `MetricCard` (Service Status, Version, DB Rows).
- Utilisation de `Stack` pour la barre latérale.
- Harmonisation du tableau des analyses avec les standards V3.

#### [MODIFY] [MLSimulationDashboard.jsx](file:///Users/dominiqueparsis/statFootV3/frontend/src/components/v3/modules/ml/MLSimulationDashboard.jsx)
- Refonte de la liste des simulations pour utiliser `MetricCard` pour les KPIs globaux (Hit Rate, Brier Score).
- Amélioration de la vue étendue (backtesting log) avec `Stack` et `Badge`.

#### [MODIFY] [MLBetRecommendations.jsx](file:///Users/dominiqueparsis/statFootV3/frontend/src/components/v3/modules/ml/MLBetRecommendations.jsx)
- Redesign du "Pick of the Day" pour utiliser un format de carte premium.
- Intégration de `FixtureRow` pour les recommandations individuelles dans le tableau.

## Verification Plan

### Manual Verification
- **Lancement Bulk** : Exécution de `node backend/src/scripts/oddsCatchupBulk.js` pour valider le remplissage de la DB sur les ligues déjà importées.
- **Revue Visuelle** : Vérification de la cohérence visuelle sur les 4 onglets du ML Hub (Orchestrator, Simulations, Betting, Odds).
- **Navigation** : Validation du routing et de la fluidité entre les onglets.
