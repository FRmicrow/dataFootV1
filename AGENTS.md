# Agentic Architecture Overview

This document summarizes the specialized agents (Skills) and Workflows available for **Antigravity** (and other AI agents) within the `statFootV3` project. These assets are centrally managed in the `.agents/` directory.

## Core Components

The `.agents/` directory serves as the project's automation and knowledge hub:
- **`skills/`**: Atomic capabilities for specific domains (Backend, Frontend, DB, etc.).
- **`workflows/`**: Structured multi-step procedures for complex tasks.
- **`rules/`**: Engineering standards, role-specific constraints, and best practices.
- **`project-architecture/`**: High-level design documents, API specifications, and database schemas.

## Primary References

### CLAUDE.md
The canonical guide for development rules, project structure, and inline markers. **Read this first for any task.**
- Location: `.claude/CLAUDE.md`

### Project Rules
Located in `.agents/rules/`, these define the "How" for every role:
- `data-ingestion-standards.md`: CRITICAL standards for data safety.
- `canonical-identity-resolution.md`: Mandatory procedure for external data.
- `engineering-standards.md`: General coding and quality requirements.

---

## Available Skills

Skills are domain-specific experts. They are automatically leveraged when relevant tasks are identified.

| Skill | Purpose | Key Focus |
| :--- | :--- | :--- |
| **backend** | Node.js API development | Routes, Controllers, Services (V4 pattern) |
| **code-quality** | Quality & Refactoring | Linting, logic simplification, debt reduction |
| **data-analyzer** | Football Data processing | xG stats, JSON/CSV normalization |
| **database** | PostgreSQL & SQL | Migrations, optimized queries, schema design |
| **design** | UI/UX & Design System | CSS Tokens, V3/V4 components, accessibility |
| **devops** | Infrastructure & CI/CD | Docker, deployment, environment config |
| **docs** | Documentation | README, API docs, feature reports |
| **flashscore-scraper** | Data Ingestion | Automated scraping of match details |
| **machine-learning** | AI & Predictions | xG models, player performance analytics |
| **performance** | System Optimization | Query speed, bundle size, execution time |
| **productivity** | Workflow Automation | Git operations, agent collaboration |
| **project-context** | Core Knowledge | Commands, project structure, hard rules |
| **security** | Audit & Protection | SQL Injection, XSS, secrets management |
| **testing** | QA & Validation | Vitest, Playwright, E2E automation |
| **web-dev** | Frontend Implementation | React, Next.js, TypeScript logic |

## Standard Workflows

Workflows provide step-by-step guidance for complex, multi-phase operations. They can be invoked via slash commands.

| Command | Purpose | Description |
| :--- | :--- | :--- |
| `/create-new-feature` | **New Feature** | Full lifecycle: TSD → Branch → US → Impl → QA → Merge. |
| `/implement-feature` | **US Implementation** | Focused delivery of a single User Story from design to QA. |
| `/local-model-dev` | **Tri-partite Dev** | Collaboration between User, Orchestrator, and Local Model. |
| `/new-agent-setup` | **Onboarding** | Initializing a new agent with project context and rules. |

## How to Use

1. **Auto-Triggering**: Most skills are triggered by keywords in your request (e.g., "optimize this query" triggers `database` and `performance`).
2. **Manual Invocation**: You can explicitly request a workflow using its slash command (e.g., `/create-new-feature`).
3. **Reference-First**: Agents are instructed to consult the relevant `SKILL.md` or `rules/*.md` before starting any implementation.

Detailed documentation for each skill can be found in `.agents/skills/[skill-name]/SKILL.md`.
