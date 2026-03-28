---
name: project-context
description: Provides core project knowledge, development commands, and hard rules for the statFootV3 repository. Always consult this skill when starting a new task to understand the environment and standards.
---

# statFootV3 Project Context

This skill serves as the central knowledge base for the `statFootV3` project (currently in `dataFootV1` directory), ensuring consistency across all agent interactions.

## Core Commands
- **Backend Dev**: `cd backend && npm run dev` (Port 3001)
- **Frontend Dev**: `cd frontend && npm run dev` (Port 5173)
- **Backend Tests**: `cd backend && npm test` (Vitest + Supertest)
- **Frontend Tests**: `cd frontend && npm test` (Vitest + jsdom)
- **Infrastructure**: `docker-compose up` (Postgres, Backend, Frontend, ML)

## Project Architecture
- **Backend**: Node.js/Express, PostgreSQL (pg), Winston logger.
- **Frontend**: React (Vite), CSS Modules/Vanilla CSS, Axios, Recharts.
- **ML Service**: Python-based machine learning (CatBoost) for xG and predictions.
- **Data**: Concentrated in `Scrapbyvideo/`, `xGData/`, and `ScreenData/`.

## Hard Rules (CRITICAL)

### Backend Standards
- **Security**: Use `process.env.DATABASE_URL` (no hardcoded credentials).
- **Queries**: Parameterized queries only (`db.all(sql, [params])`, `db.get()`, `db.run()`).
- **Structure**: All endpoints return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
- **Logic**: Controllers validate (Zod), services own business logic. No logic in routes/controllers.
- **Logging**: Use `logger` from `backend/src/utils/logger.js`. Never use `console.*`.

### Frontend Standards
- **Components**: Check `frontend/src/design-system/components/` first.
- **Styling**: Use CSS token variables from `frontend/src/design-system/tokens.css`.
- **States**: Every data-fetching component requires: `<Skeleton>` (Loading), Error Message, and Data view.
- **Clarity**: No inline `style` with >2 properties. Use `className`.

### Process & Quality
- **QA**: Every feature requires a `QA-REPORT.md` in `docs/features/Vxx-Name/`.
- **Regression**: Run `npm test` in both `backend/` and `frontend/` before every commit.

## Agent Cognition & Rules
Refer to `.agents/rules/` for specialized personas:
- `ai-cognition.md`: Core reasoning and search strategies.
- `engineering-standards.md`: Code and testing standards.
- `visual-manifesto.md`: UI/UX excellence.

## Unified Skill Set
This project uses a standardized set of skills located in `.agents/skills/`:
- `web-dev`: React, Vite, TypeScript, CSS.
- `backend`: Node.js, Express, Zod, Winston.
- `database`: PostgreSQL, SQL, Indexing.
- `testing`: Vitest, Playwright, QA battery.
- `devops`: Docker, Docker Compose, CI/CD.
- `machine-learning`: Python, CatBoost, Scikit-learn.
- `data-analyzer`: Match data and xG specialization.
- `security`: OWASP, Sanitization, Secrets.
- `performance`: Profiling, Caching, Bundle optimization.
- `docs`: Documentation, README, API references.
- `code-quality`: Linting, Refactoring, Best Practices.
- `design`: UI/UX, Design System, Visual Manifesto.
- `productivity`: Workflows, Automation, Git.
