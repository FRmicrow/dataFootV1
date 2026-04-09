# V36 ML-Hub Data Contract

## User Stories In Scope

### US-1
- As a user of ML-Hub `Prévisions`, when I select a modeled league, I see the same upcoming fixtures that belong to that league in the application data model.

### US-2
- As a user of ML-Hub `Prévisions`, each upcoming fixture exposes the ML prediction state and the available projected markets without relying on ad hoc frontend merges.

### US-3
- As a developer, I need a stable backend contract that binds application fixture truth and ML prediction truth by `league_id`, `season_year`, and `fixture_id`.

## Architecture Analysis

### Files To Modify
- `backend/src/routes/v3/ml_routes.js`
- `backend/src/controllers/v3/mlController.js`
- `frontend/src/services/api.js`
- `frontend/src/components/v3/modules/ml/MLForesightHub.jsx`
- `frontend/src/components/v3/modules/ml/submodules/MLForesightComponents.jsx`
- `frontend/src/components/v3/modules/ml/MLForesightHub.css`
- `.claude/project-architecture/backend-swagger.yaml`

### Files To Create
- `backend/src/services/v3/mlForesightService.js`
- `backend/test/v3/api/mlForesight.test.js`

### Files That May Break / Dependents
- `frontend/src/components/v3/modules/ml/MachineLearningHub.jsx`
- `frontend/src/components/v3/modules/ml/MLModelCatalog.jsx`
- `backend/src/controllers/v3/liveBetController.js`
- `backend/src/controllers/v3/importControllerV3.js`
- `backend/src/services/v3/liveBetService.js`

## Roles Activated
- Backend Engineer
- FullStack Engineer
- ML Engineer
- Code Quality

## Implementation Strategy

### Phase A — Contract
- Add a new backend endpoint dedicated to ML foresight fixtures by league.
- Make the backend own the join between:
  - `V3_Fixtures` / `V3_League_Seasons`
  - ML persisted outputs (`V3_Submodel_Outputs`, optionally `V3_ML_Predictions`)
- Stop treating `V3_Risk_Analysis` as the primary source for fixture-level foresight UI.

### Phase B — Backend
- Implement `mlForesightService` with:
  - active season resolution per league
  - upcoming fixture retrieval from `V3_Fixtures`
  - prediction enrichment from persisted ML outputs
  - per-fixture prediction status and market coverage
- Keep controller thin and return standard wrapper responses.

### Phase C — Frontend
- Replace the current dual/triple-source fetch in `MLForesightHub` with one endpoint call.
- Preserve loading, error, and success states.
- Render upcoming fixtures even when prediction status is partial or pending.

### Phase D — Verification
- Add backend API tests for:
  - league with upcoming fixtures and predictions
  - league with upcoming fixtures but no predictions yet
  - league with no current upcoming fixtures
- Run targeted frontend and backend verification after implementation.

## Proposed API Surface
- `GET /api/ml-platform/foresight/leagues`
  - returns leagues covered by active models with current season context
- `GET /api/ml-platform/foresight/league/:leagueId`
  - returns canonical upcoming fixtures and ML prediction state for the selected league

## Loop / Validation
- Module 1: backend contract and swagger update
- Module 2: backend implementation and test coverage
- Module 3: frontend refactor to unified contract

Validation requested from the user after this plan, before implementation.
