# V2 Deprecation Plan — Migration to V3-Only Codebase

## 📋 Executive Summary

**Objective:** Remove all V2 code, routes, controllers, frontend components, database config, and cross-dependencies. After this operation, the application will run exclusively on the V3 schema (`database_v3_test.sqlite`) with no V2 remnants.

**Risk Level:** Medium — The V2→V3 coupling is limited to a single code path (countries fallback). The operation is mostly file deletion + route cleanup.

**Estimated Effort:** ~2 hours of careful surgery

---

## 🗺️ Dependency Map

### V3 code that STILL depends on V2:

| File | Line | Dependency | Resolution |
|---|---|---|---|
| `backend/src/server.js` | 6-7, 17 | `import db from './config/database.js'` + `db.init()` | Remove import & init |
| `backend/src/server.js` | 4, 31 | `import apiRoutes` + `app.use('/api', apiRoutes)` | Remove V2 API router |
| `backend/src/server.js` | 5, 32 | `import adminRoutes` + `app.use('/api/admin', adminRoutes)` | Remove V2 admin router |
| `importControllerV3.js` | 2, 664 | `import dbV2` → queries `V2_countries` | Replace with `V3_Countries` query |

### V3_Countries data check: ✅ SAFE TO MIGRATE
- V3_Countries: **243 rows** with `importance_rank`, `flag_url`, `continent` — complete dataset
- V2 fallback can be replaced with V3_Countries query directly

---

## 📁 Files to DELETE

### Backend — V2 Controllers (13 files)
```
backend/src/controllers/adminController.js        (71KB — V2 admin)
backend/src/controllers/cleanupController.js       (V2 data cleanup)
backend/src/controllers/clubController.js          (V2 clubs)
backend/src/controllers/competitionController.js   (V2 competitions)
backend/src/controllers/fixMissingCompetitionsController.js
backend/src/controllers/footballDataController.js  (V2 football data)
backend/src/controllers/importClubsController.js   (V2 import)
backend/src/controllers/importCompetitionsController.js
backend/src/controllers/importLeagueController.js  (V2 league import)
backend/src/controllers/palmaresController.js      (V2 palmares)
backend/src/controllers/playerController.js        (V2 players)
backend/src/controllers/searchController.js        (V2 search)
backend/src/controllers/teamController.js          (V2 teams)
```

### Backend — V2 Routes (2 files)
```
backend/src/routes/api.js           (V2 API routes — entire file is V2)
backend/src/routes/adminRoutes.js   (V2 admin routes — entire file is V2)
```

### Backend — V2 Config (2 files)
```
backend/src/config/database.js      (V2 database connector)
backend/src/config/leagues.js       (V2 hardcoded leagues)
```

### Backend — V2 Services (3 files)
```
backend/src/services/competitionDetectionService.js  (V2-only)
backend/src/services/soccerDataBridge.py             (V2-only, Python)
backend/src/services/soccerDataService.js            (V2-only)
```

### Backend — V2 Utils (1 file)
```
backend/src/utils/clubMappings.js    (V2 club mapping)
```

### Backend — V2 Scripts (10 files in src/scripts/)
```
backend/src/scripts/bulk_import_v2.js
backend/src/scripts/check_consistency.js
backend/src/scripts/create_v3_tables.js        (migration artifact)
backend/src/scripts/delete_null_api_clubs.js
backend/src/scripts/fast_merge_duplicates.js
backend/src/scripts/infer_club_countries.js
backend/src/scripts/migration_fully_imported.js
backend/src/scripts/recover_import_status.js
backend/src/scripts/reset_flags.js
backend/src/scripts/restore_missing_columns.js
```

### Frontend — V2 Components (19 files)
```
frontend/src/components/ClubDetailPage.jsx + .css
frontend/src/components/CompetitionPortal.jsx + .css
frontend/src/components/DatabasePage.jsx + .css
frontend/src/components/FootballDataPage.jsx + .css
frontend/src/components/ImportModal.css
frontend/src/components/LeagueManager.jsx
frontend/src/components/PalmaresPage.jsx + .css
frontend/src/components/PlayerDetail.jsx
frontend/src/components/TeamDetail.jsx + .css
frontend/src/components/TeamDetailModal.jsx + .css
frontend/src/components/TeamsTab.jsx + .css
```

### Frontend — V2 Admin Section (20 files — entire admin/ directory)
```
frontend/src/components/admin/   (entire directory)
```

### Frontend — V2 Services
```
frontend/src/services/api.js     (V2-only service layer)
```

### Root-level V2 artifacts
```
audit_db.js
cleanup_db.js
clean_league15.sql
detailed_audit.js
DATABASE_SCHEMA.md          (V2 schema doc — keep V3 version)
database.sqlite             (root-level, likely dead)
database_v3_test.sqlite     (root-level test copy)
```

### Backend — V2 database files (to archive, not delete)
```
backend/database.sqlite                              (239 MB — V2 DB)
backend/database.sqlite.backup-20260119-110354
backend/database.sqlite.corrupted-20260206-025306
backend/database.sqlite.old
backend/database_corrupted.sqlite
backend/database_v3_test_backup.sqlite               (211 MB — old backup)
backend/football.db
backend/statfoot_v3.db
backend/leagues_dump.json
backend/output.json
```

### Misc backend test files
```
backend/testApiStats.js
backend/testSeasons.js
backend/test_event_data.js
backend/test_fbref.py
backend/check_leagues.js
```

### Frontend — Stale files
```
frontend/src/components/v3/SeasonOverviewPage.jsx.bak
```

---

## ✏️ Files to MODIFY

### 1. `backend/src/server.js` — Remove V2 imports & routes
- Remove: `import db from './config/database.js'`
- Remove: `import apiRoutes from './routes/api.js'`
- Remove: `import adminRoutes from './routes/adminRoutes.js'`
- Remove: `await db.init()`
- Remove: `app.use('/api', apiRoutes)`
- Remove: `app.use('/api/admin', adminRoutes)`
- Rename: `dbV3` → `db` (it's now the only DB)
- Move V3 routes from `/api/v3` to `/api` (optional, depends on desired URL structure)

### 2. `backend/src/controllers/v3/importControllerV3.js` — Remove V2 dependency
- Remove: `import dbV2 from '../../config/database.js'` (line 2)
- Replace `getCountriesV3` function (lines 661-691): change V2_countries query to V3_Countries

### 3. `frontend/src/App.jsx` — Remove V2 routes & imports
- Remove all V2 component imports (lines 3-11)
- Remove all V2 routes (lines 58-67, line 87)  
- Remove V2 nav links (lines 39-50)
- Make V3 routes the primary routes (remove `/v3` prefix or restructure)

### 4. `backend/src/routes/v3_routes.js` — Remove duplicate V3 imports from api.js
- Lines 59-68 of api.js import V3 controllers and register duplicate routes
- These duplicates will be removed when api.js is deleted

---

## 🔄 Execution Order

### Phase 1: Git Safety
1. Commit any uncommitted changes
2. Create a new branch: `git checkout -b V3_deprecate_v2`

### Phase 2: Backend Surgery
3. Modify `server.js` — remove V2 imports, init, and routes
4. Modify `importControllerV3.js` — remove dbV2 dependency
5. Delete V2 backend files (controllers, routes, config, services, utils, scripts)
6. Remove stale backend test files

### Phase 3: Frontend Surgery  
7. Modify `App.jsx` — remove V2 components, routes, and nav
8. Delete V2 frontend components and admin directory
9. Delete V2 `services/api.js`
10. Delete `.bak` files

### Phase 4: Root Cleanup
11. Delete root-level V2 scripts and artifacts
12. Archive (don't delete) V2 database files to a `backend/archive/` folder

### Phase 5: Rename & Normalize
13. Rename `database_v3_test.sqlite` → `database.sqlite` (it's now THE database)
14. Rename `database_v3.js` → `database.js` (it's now THE config)
15. Update all imports throughout V3 controllers
16. Update `package.json` scripts if needed

### Phase 6: Verification
17. Start backend — verify no import errors
18. Start frontend — verify no broken routes  
19. Test key V3 endpoints work
20. Commit: `refactor: deprecate V2 codebase — V3-only architecture`

---

## ⚠️ Risk Assessment

| Risk | Probability | Mitigation |
|---|---|---|
| Breaking V3 import (dbV2 dependency) | Low | Only 1 code path, already mapped |
| Missing route after cleanup | Low | All V3 routes are in `v3_routes.js` |
| Frontend blank page | Low | All V3 components are self-contained |
| Lost V2 database data | None | Database files archived, not deleted |
| Git history loss | None | Operating on a new branch |
