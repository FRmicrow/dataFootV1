# statFootV3
### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons. md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items  
2. **Verify Plan**: Check in before starting implementation  
3. **Track Progress**: Mark items complete as you go  
4. **Explain Changes**: High-level summary at each step  
5. **Document Results**: Add review section to `tasks/todo. md`  
6. **Capture Lessons**: Update `tasks/lessons. md` after corrections  

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

## Commands
```bash
cd backend && npm run dev          # backend dev server (port 3001)
cd frontend && npm run dev         # frontend dev server (port 5173)
cd backend && npm test             # backend tests (Vitest + Supertest)
cd frontend && npm test            # frontend tests (Vitest + jsdom)
docker-compose up                  # full stack (Postgres + backend + frontend + ML)
```

## Agent System
Read these before implementing any feature:
- `.claude/rules/ai-cognition.md` — how to reason and search the codebase
- `.claude/rules/development-best-practices.md` — code and testing standards
- `.claude/rules/visual-manifesto.md` — UI design standards (UI features)
- `.claude/rules/data-ingestion-standards.md` — CRITICAL: data validation, deduplication, surgical inserts

## Slash Commands
- `/project:create-new-feature` — feature de A à Z (TSD → US → impl → tests → doc → merge)
- `/project:implement-feature [US]` — implémenter une US de bout en bout
- `/project:run-tests` — batterie complète (Docker + backend + frontend)
- `/project:gitflow` — commit + push + merge vers main
- `/project:deploy` — déploiement Docker Compose

## Agents spécialisés (déclenchement auto)
- `code-reviewer` — revue de code avant merge
- `security-auditor` — audit sécurité (SQL injection, XSS, secrets)
- `qa-runner` — exécution tests + QA Reports
- `doc-writer` — génération QA-REPORT, Swagger, technical-spec

Skills are located in `.claude/skills/` and follow the [Agent Skills specification](https://agentskills.io/specification).

## Project Structure

### Backend
- `backend/src/config/database.js` — PostgreSQL pool with `db.all()`, `db.get()`, `db.run()` (parameterized, `?` → `$N` auto-conversion)
- `backend/src/routes/v3_routes.js` → domain routers in `backend/src/routes/v3/`
- **V4 routes:** `backend/src/routes/v4/v4_routes.js` → domain routers in `backend/src/routes/v4/` (e.g., `league_routes.js`, `club_routes.js`, `ml_routes_v4.js`)
- **V4 controllers:** `backend/src/controllers/v4/` (e.g., `leagueControllerV4.js`, `clubControllerV4.js`)
- **V4 services:** `backend/src/services/v4/` (NO repository layer in V4 — services query DB directly)
- `backend/src/config/mediaConstants.js` — centralized CDN constants (DEFAULT_LOGO, DEFAULT_PHOTO)

### Frontend
- `frontend/src/services/api.js` — centralized axios client with response interceptor
- `frontend/src/design-system/tokens.css` — all CSS variables (color, spacing, radius, shadow, animation)
- `frontend/src/design-system/components/` — all reusable UI components
- **V3 components:** `frontend/src/components/v3/` (being phased out → V4)
- **V4 components:** `frontend/src/components/v4/` (new pages, modules for V4 routes)

### Database
- Schema: PostgreSQL v4.* namespace for all V4 tables
- Migrations: `backend/src/migrations/registry/` (timestamped JS files, e.g., `20260418_02_V4_Match_Events_Unique_Constraint.js`)
- **Swagger (API Reference):** `.claude/project-architecture/backend-swagger.yaml` (canonical location — NOT root)

## Inline Markers (Code Annotations)

Use these markers to signal intent and maintain knowledge:

| Marker | Usage | Example |
|--------|-------|---------|
| `// @STUB` | Method not yet implemented; returns placeholder data | `// @STUB V5: Implement player tactical stats` |
| `// @AUDIT: desc` | Known debt or issue; fix outside this commit | `// @AUDIT: no transaction here — race condition` |
| `// @CRITICAL: desc` | Business logic invariant; do not modify without TSD | `// @CRITICAL: order of MAJ important for FK` |
| `// @RACE-CONDITION` | Section requires atomic transaction | `// @RACE-CONDITION: SELECT+INSERT not atomic` |
| `// @NO-AUTH` | Route is intentionally public (no auth check) | `// @NO-AUTH: public health check endpoint` |
| `// @V3-COMPAT` | Temporary code for V3↔V4 compatibility | `// @V3-COMPAT: backward compat route, remove in V5` |

## V4 Route Pattern

When adding a new V4 API endpoint, follow this structure:

```
1. Create/update route file: backend/src/routes/v4/<domain>_routes.js
   - Import controller from backend/src/controllers/v4/<domain>ControllerV4.js
   - Mount routes under express.Router()
   - Wire Zod validation via validateRequest middleware

2. Create controller: backend/src/controllers/v4/<domain>ControllerV4.js
   - Import service from backend/src/services/v4/<Domain>ServiceV4.js
   - Parse request params/query with Zod schema
   - Call service, handle errors (return { success: false, error: "..." })
   - Return { success: true, data: ... } on success
   - Always log errors with logger.error({ err: error }, 'context')

3. Create service: backend/src/services/v4/<Domain>ServiceV4.js
   - Import db from backend/src/config/database.js
   - Own all business logic (filtering, aggregation, transformation)
   - Query v4.* schema tables directly (no repository layer in V4)
   - Use mediaConstants for DEFAULT_LOGO, DEFAULT_PHOTO
   - Return transformed data objects

4. Update Swagger: .claude/project-architecture/backend-swagger.yaml
   - Document endpoint path, method, parameters, response schema
   - Include error cases (400, 404, 500)

5. Test: backend/src/controllers/v4/<domain>ControllerV4.test.js
   - Mock service with vi.mock()
   - Test happy path + error cases
   - Verify response shape matches { success: true, data: ... }
```

## Hard Rules

**Backend:**
- Always use `process.env.DATABASE_URL` — never hardcode credentials
- Parameterized queries only — `db.all(sql, [params])`, never string interpolation in SQL
- All endpoints return `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- Controllers validate input (Zod), services own business logic — no logic in controllers
- Logging: import `logger` from `backend/src/utils/logger.js` — never use `console.*` in new backend code. Use `logger.info()`, `logger.warn()`, `logger.error({ err }, 'message')` for structured logs.

**Frontend:**
- Check `frontend/src/design-system/components/` before creating any new component
- Use CSS token variables — never hardcode hex, rgb, or pixel values in JSX
- Every data-fetching component needs three states: `<Skeleton>` (loading) / error message / data
- No `style={{...}}` with more than 2 properties — use className + CSS variables

**Process:**
- Every new feature needs `docs/features/Vxx-Name/QA-REPORT.md` before merge
- Run `npm test` in both `backend/` and `frontend/` before any commit — zero regressions

## Data Ingestion Standards (CRITICAL)

**All data insertion/import operations MUST follow these rules:**

### Core Rules
1. **Schema Validation First:** Every record must pass Zod validation BEFORE touching the database
2. **Deduplication Always:** Check for existing records using business keys (not just technical IDs)
3. **Business Key Definition:** Every entity has a unique constraint on its business key (name+country for leagues, etc.)
4. **Idempotent Operations:** Running import 2x = same result as 1x (no duplicates created)
5. **Transactional Safety:** Bulk operations in BEGIN...COMMIT; rollback on error
6. **FK Verification:** Verify parent records exist BEFORE inserting child records
7. **Audit Logging:** Every insert/update logged with: operation, table, user, old/new values, timestamp
8. **Error Communication:** All import endpoints return: `{ inserted: X, updated: Y, skipped: Z, errors: 0 }`

### Patterns to Use
- **Single Insert:** Check exists → Insert new → Log result
- **Bulk Upsert:** Validate batch → Partition insert/update → Execute in transaction → Rollback on error
- **Merge Duplicates:** Find dupes → Keep oldest → Redirect FKs → Delete newer → Verify integrity

### Patterns to NEVER Use
- ❌ Insert without checking duplicates
- ❌ String interpolation in SQL (`INSERT INTO ... VALUES ('${name}')`)
- ❌ Bulk operations without transactions
- ❌ Missing FK validation before linking records
- ❌ Skipping audit logs on data changes

**See:** `.claude/rules/data-ingestion-standards.md` for full implementation guide with code examples.

## Open Issues
See `docs/AUDIT-REMEDIATION-PLAN.md` — items marked "ACTION REQUIRED BY DEVELOPER" need manual review.
