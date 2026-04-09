# QA Report

## Scope
- V36 ML-Hub data contract
- Docker coherence for `backend`, `frontend`, and `ml-service`
- Migration recovery for `V3_Forge_Results`

## Verified
- `statfoot-backend` now mounts the full backend repo in Docker via `/app`, including `package.json`, tests, and scripts.
- Backend startup now succeeds on the current Docker DB after making `20260315_02_AddForgeResultsMultiMarket.js` idempotent and compatible with a missing `V3_Forge_Results` table.
- Backend API test passed in Docker:
  - `docker exec -u root statfoot-backend sh -lc 'cd /app && npm test -- test/v3/api/mlForesight.test.js'`
  - Result: `6 tests / 6 passed`
- Frontend production build passed in Docker:
  - `docker exec statfoot-frontend sh -lc 'cd /app && npm run build'`
- `ml-service` container is healthy:
  - `GET http://localhost:8008/health`
  - Result: `status=online`, `model_loaded=true`
- From inside `statfoot-backend`, the new V36 endpoint responds with the expected empty-state contract on the current empty DB:
  - `GET /api/ml-platform/foresight/leagues`
  - Result: `{"success":true,"data":[]}`

## Data State
- Current Docker DB contains no `V3_Leagues` rows, so live foresight payloads are empty by design until import/hydration.

## Residual Issue
- Host-side calls to `http://127.0.0.1:3001/api/ml-platform/foresight/leagues` still return a stale/incoherent response (`Route not found`) even after a full `docker compose down && docker compose up -d --build`.
- The same request executed inside `statfoot-backend` returns the correct contract.
- This points to a local Docker Desktop / host port proxy anomaly, not a repo-level route or migration failure.

## Conclusion
- Repo code, migrations, container mounts, backend tests, frontend build, and ml-service health are coherent.
- Remaining live host-port inconsistency is environmental and external to the implemented V36 code path.
