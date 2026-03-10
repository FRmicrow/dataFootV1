# statFootV3

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
- `.claude/workflows/implement-feature.md` — end-to-end feature workflow

Skills are located in `.agents/skills/` and follow the [Agent Skills specification](https://agentskills.io/specification). Both Antigravity and Claude should use these:
- `project-context` — master project reference (Read this first)
- `web-dev` — React, Next.js, TS, CSS
- `testing` — Vitest, Playwright, QA battery
- `devops` — Docker, CI/CD
- `docs` — Documentation standards
- `code-quality` — Refactoring and Best Practices
- `design` — UI/UX and Visual Manifesto
- `productivity` — Workflows and Multi-agent coordination
- `data-analyzer` — Match data and xG specialization

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
