# Agent Skills Overview

This document summarizes the specialized agents (Skills) available for both **Antigravity** and **Claude** within the `statFootV3` project. These skills are located in `.agents/skills/`.

## Master Reference

### [project-context](file:///Users/dominiqueparsis/statFootV3/.agents/skills/project-context/SKILL.md)
The primary entry point for any task. It contains core project knowledge, hard rules for backend/frontend development, and environmental commands. **Read this first.**

---

## Domain Specialized Agents

| Agent | Scope & Utility | Key Technologies |
| :--- | :--- | :--- |
| **[web-dev](file:///Users/dominiqueparsis/statFootV3/.agents/skills/web-dev/SKILL.md)** | Building components, pages, and handling logic integration. | React, Next.js, TS, CSS |
| **[testing](file:///Users/dominiqueparsis/statFootV3/.agents/skills/testing/SKILL.md)** | Writing unit/E2E tests and performing QA validation. | Vitest, Playwright |
| **[devops](file:///Users/dominiqueparsis/statFootV3/.agents/skills/devops/SKILL.md)** | Managing infrastructure, Docker, and CI/CD pipelines. | Docker, GH Actions |
| **[docs](file:///Users/dominiqueparsis/statFootV3/.agents/skills/docs/SKILL.md)** | Documenting features, READMEs, and API references. | Markdown, Swagger |
| **[code-quality](file:///Users/dominiqueparsis/statFootV3/.agents/skills/code-quality/SKILL.md)** | Code review, linting, and architectural best practices. | ESLint, SonarQube |
| **[design](file:///Users/dominiqueparsis/statFootV3/.agents/skills/design/SKILL.md)** | UI/UX design, visual manifesto, and design system. | CSS Tokens, Figma |
| **[productivity](file:///Users/dominiqueparsis/statFootV3/.agents/skills/productivity/SKILL.md)** | Workflow automation and multi-agent coordination. | Git, Workflows |
| **[data-analyzer](file:///Users/dominiqueparsis/statFootV3/.agents/skills/data-analyzer/SKILL.md)** | Football match data and xG statistics processing. | JSON, CSV, Python |

## How to use them
These skills are **auto-triggered** by Antigravity based on the context of your request. Claude is also configured to reference these same definitions from `.claude/CLAUDE.md`.

## Workflows
For complex, multi-step tasks, refer to the [workflows](file:///Users/dominiqueparsis/statFootV3/.agents/workflows/) directory:
- `implement-feature`: End-to-end feature delivery.
- `new-agent-setup`: Quick onboarding for new AI collaborators.
