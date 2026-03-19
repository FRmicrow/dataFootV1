# V36 ML-Hub Data Contract

## Goal
- Replace the current frontend-side merge of ML-Hub data with a backend-owned foresight contract tied to the same league and fixture truth as the standard league pages.

## Plan
- [x] Confirm scope and API contract with the user
- [x] Design the unified backend foresight endpoint contract
- [x] Implement backend service/controller/route for league-bound foresight fixtures
- [x] Refactor ML-Hub frontend to consume the unified endpoint only
- [x] Add regression coverage for the new backend contract
- [x] Validate behavior against normal league page fixture rendering
- [x] Produce QA notes and review summary

## Files To Touch
- [x] `.claude/project-architecture/backend-swagger.yaml`
- [x] `backend/src/routes/v3/ml_routes.js`
- [x] `backend/src/controllers/v3/mlController.js`
- [x] `backend/src/services/v3/` new ML foresight service
- [x] `frontend/src/services/api.js`
- [x] `frontend/src/components/v3/modules/ml/MLForesightHub.jsx`
- [x] `frontend/src/components/v3/modules/ml/submodules/MLForesightComponents.jsx`
- [x] `frontend/src/components/v3/modules/ml/MLForesightHub.css`
- [x] `docs/features/V36-ML-Hub-Data-Contract/implementation_plan.md`
- [x] backend tests for the new endpoint

## Review
- Implemented:
  - backend-owned foresight contract
  - canonical league coverage for ML-Hub
  - frontend refactor off mixed sources
  - Swagger and API tests
- Validation note:
  - Docker validation completed
  - backend migration recovery fixed for `V3_Forge_Results`
  - backend API contract test passes in `statfoot-backend`
  - frontend production build passes in `statfoot-frontend`
  - `ml-service` health is green
  - current Docker DB is empty for `V3_Leagues`, so live foresight payloads are empty until data import
  - host port `3001` still shows an external/stale routing anomaly; inside the backend container, the V36 endpoints answer correctly
