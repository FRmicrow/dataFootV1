# Agent Skills Overview

This document summarizes the specialized agents (Skills) available for **Claude Code** within the `statFootV3` project. These skills are located in `.claude/skills/`.

## Primary Reference

### CLAUDE.md
The canonical guide for development rules, project structure, and inline markers. **Read this first for any task.**
- Location: `.claude/CLAUDE.md`
- Contains: Hard rules, V4 route pattern, coding standards, commands

---

## Core Skills

These are the primary skills used for feature delivery:

| Skill | Trigger | Purpose |
| :--- | :--- | :--- |
| **technical-specification** | `technical spec`, `TSD` | Design data contracts, API schemas, DB layout |
| **create-new-feature** | `create feature`, `new feature` | End-to-end feature delivery (spec → impl → test → doc) |
| **implement-feature** | `implement [US]` | Implement a user story from spec |
| **code-audit** | `audit`, `code audit`, `health check` | Systematic code quality and architecture review |
| **qa-automation** | `run tests`, `QA` | Execute test suite and generate QA reports |
| **flashscore-scraper** | `scrape flashscore`, `import matches` | Fetch match data from Flashscore |
| **docker** | `docker`, `build`, `compose` | Build and run Docker containers |
| **frontend-design** | `component`, `design`, `CSS` | Build React components using Design System V3 |
| **machine-learning** | `ML`, `model`, `predict` | Train and deploy ML models |
| **gitflow** | `commit`, `merge`, `push` | Git workflow (commit → push → merge) |
| **deploy** | `deploy`, `production` | Full-stack Docker Compose deployment |

## How to Use

Skills are **auto-triggered** in Claude Code when you mention their trigger words. Alternatively, use the slash command:
```
/skill-name
```

For example:
- `/code-audit` — Start a code audit
- `/create-new-feature` — Initiate a new feature
- `/gitflow` — Perform git operations

See `.claude/skills/` directory for full skill definitions.
