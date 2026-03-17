# QA Report: Routes Front + Back

Date: 2026-03-16
Scope: backend v3 active routes, ML Hub support routes, frontend build/runtime access

## Objective

Validate the active frontend/backend route surface end-to-end, fix runtime failures, and leave a repeatable smoke-test entrypoint.

## What Was Tested

### Backend smoke test

Script:
- [backend/scripts/smoke_v3_routes.mjs](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/scripts/smoke_v3_routes.mjs)

Command:
```bash
docker cp backend/scripts/smoke_v3_routes.mjs statfoot-backend:/app/scripts/smoke_v3_routes.mjs
docker exec statfoot-backend node /app/scripts/smoke_v3_routes.mjs
```

Coverage:
- 97 active GET/POST/PUT routes
- league, fixture, player, club, live-bet, studio, odds, ML, simulation, resolution, health, import, intelligence

Final result:
- `success: true`
- `checked: 97`

### Frontend validation

Commands:
```bash
docker exec statfoot-frontend npm run build
curl -I http://localhost:5173
```

Final result:
- Vite production build: OK
- frontend runtime entry: `200 OK`

## Issues Fixed

### SQL / PostgreSQL compatibility

- [FixtureRepository.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/repositories/v3/FixtureRepository.js)
  - fixed `missing_events` aggregation query

- [lineupController.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/lineupController.js)
  - fixed `missing_lineups` aggregation query

- [studioController.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/studioController.js)
  - fixed `GROUP BY` contract for studio queries

- [mlController.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/mlController.js)
  - fixed simulation evaluation grouping using `r.id` instead of invalid `r.risk_id`

- [bulkOddsService.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/services/v3/bulkOddsService.js)
  - fixed PostgreSQL date filtering using `date::date = ?::date`

- [HealthPrescriptionService.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/services/v3/HealthPrescriptionService.js)
  - fixed multiple PostgreSQL issues in season-gap and inconsistency queries

### Missing backend methods / async errors

- [simulationService.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/services/v3/simulationService.js)
  - added `runBacktest`
  - added `runCalibrationAudit`

- [intelligenceController.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/intelligenceController.js)
  - added missing `await`

- [resolutionController.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/resolutionController.js)
  - fixed missing `await`
  - blocked self-merge requests with clean `400`

### Runtime fallbacks / resilience

- [importControllerV3.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/importControllerV3.js)
  - added local DB fallback for `/league/:apiId/available-seasons`
  - route no longer collapses when API-Football is rate-limited

- [liveBetService.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/services/v3/liveBetService.js)
  - fixed upcoming fetch to use supported API method
  - hardened momentum parsing

- [liveBetController.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/liveBetController.js)
  - converts missing odds case into a clean `200` business response instead of `500`

### Resolution merge stability

- [ResolutionService.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/services/v3/ResolutionService.js)
  - fixed trophy remap to current schema
  - remaps `V3_Fixture_Player_Stats` before deleting ghost player
  - added merge safety guard for same-id merge
  - added configurable duplicate scan limit

### Preferences parsing stability

- [preferencesService.js](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/services/v3/preferencesService.js)
  - fixed empty-string JSON parsing failures on `PUT /preferences`

## Operational Notes

- Some routes depend on external API-Football quotas.
- The local fallback on `available-seasons` is now the expected resilience path.
- `forge/*` routes intentionally return `410 Gone` because the legacy Forge layer is disabled.
- `GET /live-bet/match/:id` may legitimately return `404` depending on fixture availability.

## Repeatable Entry Points

Backend package script:
```bash
cd backend
npm run smoke:v3-routes
```

Container-safe execution in current stack:
```bash
docker cp backend/scripts/smoke_v3_routes.mjs statfoot-backend:/app/scripts/smoke_v3_routes.mjs
docker exec statfoot-backend node /app/scripts/smoke_v3_routes.mjs
```

Frontend:
```bash
docker exec statfoot-frontend npm run build
curl -I http://localhost:5173
```

## Final Status

- Backend active route surface: validated
- Frontend build/runtime: validated
- ML Hub support routes: validated
- No blocking front/back route failure remains on the tested active surface
