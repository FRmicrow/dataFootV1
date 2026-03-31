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

## Available Domain Specialized Skills
This project uses a standardized set of skills located in `.agents/skills/`. Each skill represents a specialized agent capability:

| Skill | Scope & Utility | Key Technologies |
| :--- | :--- | :--- |
| **[web-dev](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/web-dev/SKILL.md)** | Building components, pages, and handling logic integration. | React, Vite, TS, CSS |
| **[backend](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/backend/SKILL.md)** | Node.js API development, business logic, and services. | Express, Zod, Winston |
| **[database](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/database/SKILL.md)** | PostgreSQL schema management and optimized queries. | PG, SQL, Indexing |
| **[testing](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/testing/SKILL.md)** | Writing unit/E2E tests and performing QA validation. | Vitest, Supertest, Playwright |
| **[devops](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/devops/SKILL.md)** | Managing infrastructure, Docker, and CI/CD pipelines. | Docker, Docker Compose |
| **[machine-learning](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/machine-learning/SKILL.md)** | Predictive models and data science for football stats. | Python, CatBoost, Scikit-learn |
| **[data-analyzer](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/data-analyzer/SKILL.md)** | Match data and xG statistics processing. | JSON, CSV, OCR |
| **[security](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/security/SKILL.md)** | Security audits and vulnerability remediation. | OWASP, Sanitization |
| **[performance](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/performance/SKILL.md)** | Optimization of queries, bundles, and execution time. | Profiling, Caching |
| **[design](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/design/SKILL.md)** | UI/UX design, visual manifesto, and design system. | CSS Tokens, Figma |
| **[docs](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/docs/SKILL.md)** | Documenting features, READMEs, and API references. | Markdown, JSDoc |
| **[code-quality](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/code-quality/SKILL.md)** | Code review, linting, and architectural best practices. | ESLint, Clean Code |
| **[productivity](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/productivity/SKILL.md)** | Workflow automation and multi-agent coordination. | Git, Workflows |

---

## 📚 Historical Data Pipeline (V3)
For agents working on historical football data (1950–2010), refer to the **[V3 Historical Import SOP](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/docs/v3_historical_import_sop.md)**.
This document contains the A-Z process for ingestion, resolution, deduplication, and harmonization across all major leagues.
