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
- `backend/src/config/database.js` — PostgreSQL pool with `db.all()`, `db.get()`, `db.run()` (parameterized, `?` → `$N` auto-conversion)
- `backend/src/routes/v3_routes.js` → domain routers in `backend/src/routes/v3/`
- `frontend/src/services/api.js` — centralized axios client with response interceptor
- `frontend/src/design-system/tokens.css` — all CSS variables (color, spacing, radius, shadow, animation)
- `frontend/src/design-system/components/` — all reusable UI components

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

## Open Issues
See `docs/AUDIT-REMEDIATION-PLAN.md` — items marked "ACTION REQUIRED BY DEVELOPER" need manual review.
