# Agent Skills Overview

This document summarizes the specialized agents (Skills) available for both **Antigravity** and **Claude** within the `statFootV3` project. These skills are located in `.agents/skills/`.

## Master Reference

### [project-context](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/project-context/SKILL.md)
The primary entry point for any task. It contains core project knowledge, hard rules for backend/frontend development, and environmental commands. **Read this first.**

---

## Domain Specialized Agents

| Agent | Scope & Utility | Key Technologies |
| :--- | :--- | :--- |
| **[web-dev](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/web-dev/SKILL.md)** | Building components, pages, and handling logic integration. | React, Vite, TS, CSS |
| **[backend](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/backend/SKILL.md)** | Node.js API development, business logic, and services. | Express, Zod, Winston |
| **[database](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/database/SKILL.md)** | PostgreSQL schema management and optimized queries. | PG, SQL, Indexing |
| **[testing](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/testing/SKILL.md)** | Writing unit/E2E tests and performing QA validation. | Vitest, Supertest, Playwright |
| **[devops](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/devops/SKILL.md)** | Managing infrastructure, Docker, and CI/CD pipelines. | Docker, Docker Compose |
| **[machine-learning](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/machine-learning/SKILL.md)** | Predictive models and data science for football stats. | Python, CatBoost, Scikit-learn |
| **[data-analyzer](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/data-analyzer/SKILL.md)** | Football match data and xG statistics processing. | JSON, CSV, OCR |
| **[security](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/security/SKILL.md)** | Security audits and vulnerability remediation. | OWASP, Sanitization |
| **[performance](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/performance/SKILL.md)** | Optimization of queries, bundles, and execution time. | Profiling, Caching |
| **[design](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/design/SKILL.md)** | UI/UX design, visual manifesto, and design system. | CSS Tokens, Figma |
| **[docs](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/docs/SKILL.md)** | Documenting features, READMEs, and API references. | Markdown, JSDoc |
| **[code-quality](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/code-quality/SKILL.md)** | Code review, linting, and architectural best practices. | ESLint, Clean Code |
| **[productivity](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/skills/productivity/SKILL.md)** | Workflow automation and multi-agent coordination. | Git, Workflows |

## How to use them
These skills are **auto-triggered** by Antigravity based on the context of your request. Claude is also configured to reference these same definitions from `.claude/CLAUDE.md`.

## Workflows
For complex, multi-step tasks, refer to the [workflows](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/.agents/workflows/) directory:
- `implement-feature`: End-to-end feature delivery.
- `new-agent-setup`: Quick onboarding for new AI collaborators.
