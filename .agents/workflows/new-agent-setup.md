---
description: Get a new agent up and running with the project configuration and rules.
---

# New Agent Setup Workflow

Use this workflow when a new agent (Claude, OpenAI, etc.) joins the project to ensure they follow the established standards.

1. **Onboarding**
   - Point the agent to `.agents/skills/project-context/SKILL.md` (for Antigravity) or `.claude/CLAUDE.md` (for Claude).
   - Instruct the agent to read `docs/AUDIT-REMEDIATION-PLAN.md` for current progress.

2. **Environment Sync**
   - Run `npm install` in both `backend/` and `frontend/` to ensure dependencies are up to date.
   - Verify the database state using `npx prisma migrate status`.

3. **Validation**
   - Ask the agent to summarize the "Hard Rules" to confirm they understand the project's constraints.
