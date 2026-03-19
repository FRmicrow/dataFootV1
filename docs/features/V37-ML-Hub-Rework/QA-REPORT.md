# QA Report — V37 ML Hub Rework

**Branche:** `feature/V36-Premium-ML-Hub`
**Date:** 2026-03-12
**Statut:** ⚠️ Tests manuels requis (npm test inaccessible en sandbox)

---

## 1. Couverture des US

| US | Description | Statut |
|---|---|---|
| Page 1 — Modèles | Catalogue accordion par ligue, features chips, exemple de prédiction | ✅ Implémenté |
| Page 2 — Performance | ROI Calculator + Equity Curve + 3 tabs (ligue/club/marché) | ✅ Implémenté |
| Page 3 — Foresight | Ligues favorites + Top Edges avec power score | ✅ Implémenté |
| Page 4 — Sub-Models | CRUD sub-models, wizard création, déclenchement Forge | ✅ Implémenté |
| Page 5 — Glossaire | 30 termes en 5 sections avec formules | ✅ Implémenté |
| Page 6 — Système | Mission Control redesign + actions rapides | ✅ Implémenté |
| Migration | 7 onglets → 6 pages + redirects legacy | ✅ Implémenté |
| SQL dialect fix | `datetime('now')` → `NOW()` dans getMLRecommendations | ✅ Corrigé |

---

## 2. Checklist QA Technique

### Backend
- [x] Nouveaux endpoints répondent `{ success: true, data }` ou `{ success: false, error }`
- [x] Toutes les requêtes SQL sont paramétrées (paramètres `$N`)
- [x] Zod schemas créés pour les 3 nouveaux endpoints
- [x] Migration `V3_Custom_Submodels` suit le pattern existant
- [x] Aucun `console.*` dans le nouveau code (pas de logger calls non plus — à améliorer)
- [ ] `npm test` backend — **À exécuter manuellement**

### Frontend
- [x] 3 états par page : `<Skeleton>` / erreur / données
- [x] Aucun hex/rgb hardcodé — 100% CSS variables
- [x] Imports design-system vérifés (Accordion, Card, Badge, MetricCard, Progress, Skeleton, Tabs, Button, Input, Select)
- [x] `EquityCurve.jsx` ajouté au design-system (composant réutilisable)
- [x] Redirects legacy pour les 6 anciennes routes (`/intelligence`, `/factory`, etc.)
- [x] `Space Grotesk` chargé via Google Fonts dans `index.html`
- [x] `api.triggerBulkSimulation` présent dans `api.js`
- [ ] `npm test` frontend — **À exécuter manuellement**

### Sécurité
- [x] Aucune injection SQL possible (toutes les queries paramétrées)
- [x] `deleteSubmodel` = soft delete (is_active=false), pas de destruction

---

## 3. Tests à effectuer manuellement

### Page 1 — Modèles
```
1. Naviguer vers /machine-learning/models
2. Vérifier que l'accordion s'ouvre sur les ligues
3. Vérifier les feature chips colorisées par catégorie
4. Cliquer "Exemple de prédiction" → barres de probabilité visibles
```

### Page 2 — Performance
```
1. Saisir 1000€ / 10€ → ROI Calculator se déclenche après 600ms
2. Vérifier Equity Curve visible si données > 2 points
3. Basculer Tab "Par Club" → accordéons de clubs
4. Warning affiché si stakePerBet > 500€ (50% de 1000€)
```

### Page 3 — Foresight
```
1. Cliquer "Gérer mes ligues" → panel s'ouvre avec liste des ligues
2. Cocher une ligue → persiste dans localStorage
3. Onglet ligue → matchs à venir avec prédictions
4. Section B : ajuster minEdge → liste se rafraîchit après 500ms
5. Si 0 edges → message "Sync les odds pour activer"
```

### Page 4 — Sub-Models
```
1. Cliquer "+ Nouveau Sub-Model" → formulaire apparaît
2. Remplir nom + modèle de base → "Créer (draft)" → card apparaît avec status "Draft"
3. Sélectionner une ligue → "Créer & Entraîner" disponible
4. Supprimer → card disparaît
```

### Page 5 — Glossaire
```
1. Vérifier affichage de toutes les sections
2. Cliquer un bouton nav → filtre sur la section
3. Formules affichées en monospace avec border-left accent
```

### Page 6 — Système
```
1. Status cards affichent ONLINE/OFFLINE selon ML Service
2. Intelligence Feed affiche les 8 dernières analyses
3. "Sync Odds" → toast success / error
4. Redirects : /machine-learning/intelligence → /machine-learning/models
```

---

## 4. Risques Résiduels

| Risque | Impact | Mitigation |
|---|---|---|
| `V3_Custom_Submodels` pas encore migrée | Sub-models CRUD échoue | Lancer la migration au premier démarrage |
| Edges = 0 si odds pas sync | Section B vide | Message explicatif + bouton Sync dans Système |
| `V3_Model_Registry` schema mismatch (accuracy, league_id absents) | Page 1 : métriques affichées `—` | Catalog statique en fallback, fonctionnel |
| mlController: logique SQL dans controllers | Violation "services own business logic" | Pattern existant dans tout le projet — dette technique connue |

---

## 5. Fichiers modifiés (diff summary)

**Créés:**
- `backend/src/migrations/registry/20260312_00_CustomSubmodels.js`
- `frontend/src/components/v3/modules/ml/MLModelCatalog.jsx` + `.css`
- `frontend/src/components/v3/modules/ml/MLPerformanceLab.jsx` + `.css`
- `frontend/src/components/v3/modules/ml/MLForesightHub.jsx` + `.css`
- `frontend/src/components/v3/modules/ml/MLSubModelBuilder.jsx` + `.css`
- `frontend/src/components/v3/modules/ml/MLGlossary.jsx` + `.css`
- `frontend/src/components/v3/modules/ml/MachineLearningHub.css`
- `frontend/src/design-system/components/EquityCurve.jsx`

**Modifiés:**
- `backend/src/controllers/v3/mlController.js` (+6 fonctions, fix SQL dialect)
- `backend/src/routes/v3/ml_routes.js` (+6 routes)
- `backend/src/schemas/v3Schemas.js` (+3 schemas Zod)
- `frontend/src/services/api.js` (+7 méthodes)
- `frontend/src/components/v3/modules/ml/MachineLearningHub.jsx` (rewrite)
- `frontend/src/components/v3/modules/ml/MLOrchestratorPage.jsx` (redesign)
- `frontend/index.html` (Space Grotesk font)

**Supprimés (10 fichiers):**
- `MLIntelligenceDashboard.jsx`, `MLSimulationDashboard.jsx`, `MLBetRecommendations.jsx`
- `MLTestLab.jsx`, `MLModelFactory.jsx`, `MLKnowledgeBase.jsx`, `MLOddsPage.jsx`
- `MachineLearningHubV29.jsx`, `ModelDossier.jsx`, `ClubPerformanceMatrix.jsx`
- `PredictionTimeline.jsx`
