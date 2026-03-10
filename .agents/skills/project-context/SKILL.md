---
name: project-context
description: Provides core project knowledge, development commands, and hard rules for the statFootV3 repository. Always consult this skill when starting a new task to understand the environment and standards.
---

# statFootV3 Project Context

This skill serves as the central knowledge base for the `statFootV3` project, ensuring consistency across all agent interactions.

## Core Commands
- **Backend Dev**: `cd backend && npm run dev` (Port 3001)
- **Frontend Dev**: `cd frontend && npm run dev` (Port 5173)
- **Backend Tests**: `cd backend && npm test` (Vitest + Supertest)
- **Frontend Tests**: `cd frontend && npm test` (Vitest + jsdom)
- **Infrastructure**: `docker-compose up` (Postgres, Backend, Frontend, ML)

## Project Architecture
- **Backend**: Node.js/Express, PostgreSQL (Prisma), Winston logger.
- **Frontend**: React (Vite), CSS Modules/Vanilla CSS, Axios.
- **ML Service**: Python-based machine learning (likely for xG and predictions).
- **Data**: Concentrated in `Scrapbyvideo/`, `xGData/`, and `ScreenData/`.

## Hard Rules

### Backend Standards
- **Security**: Use `process.env.DATABASE_URL` (no hardcoded credentials).
- **Queries**: Parameterized queries only (use `db.all(sql, [params])`).
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
- **Regression**: Run `npm test` in both `backend/` and `frontend/` before Every commit.

## Agent Cognition
- Avoid redundant research if paths are clearly documented in `CLAUDE.md` or this skill.
- Prioritize visual excellence in UI tasks.
- Follow the `implement-feature` workflow for consistent delivery.

## Unified Skill Set
This project uses a standardized set of skills located in `.agents/skills/`:
- `web-dev`: React, Next.js, TypeScript, CSS.
- `testing`: Vitest, Playwright, QA battery.
- `devops`: Docker, CI/CD, Deployment.
- `docs`: Documentation, README, API references.
- `code-quality`: Linting, Refactoring, Best Practices.
- `design`: UI/UX, Design System, Visual Manifesto.
- `productivity`: Workflows, Automation, Git.
- `data-analyzer`: Match data and xG specialization.
