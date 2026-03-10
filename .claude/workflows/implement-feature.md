---
description: End-to-end workflow for implementing a statFootV3 feature, from User Story to validated delivery. Covers architecture analysis, design philosophy, implementation, testing, and QA gate.
---

# implement-feature

Full workflow from backlog to delivery. Every step is mandatory unless explicitly marked optional.

---

## Phase 0 — Context & Planning

### Step 1 — Read the Rules
Before anything else, read:
- `.claude/rules/ai-cognition.md` — reasoning and search protocol
- `.claude/rules/development-best-practices.md` — code and testing standards
- `.claude/rules/visual-manifesto.md` — UI/design standards (UI features only)

### Step 2 — Architecture Analysis (MANDATORY)
Consult `.claude/project-architecture/` to identify exactly which files to modify:
- `backend-swagger.yaml` — existing API contracts
- `frontend-pages.md` — existing pages and components
- `architecture-globale.md` — system overview

Produce a list: files to create, files to modify, files that may break (dependents).

### Step 3 — Implementation Plan (BLOCKING)
Generate `docs/features/Vxx-[Name]/implementation_plan.md` listing:
- User Stories in scope
- Files to be created/modified per US
- Roles activated (backend, frontend, ML, etc.)
- For multi-US features: define the US-by-US loop with explicit user validation between each module

**Submit to user for validation. Do not proceed until explicitly approved.**

---

## Phase 1 — Design & Contract

### Step 4 — API Contract (API-First, if applicable)
If the feature requires client/server communication:
1. Design request/response schemas (Zod)
2. Update `.claude/project-architecture/backend-swagger.yaml`
3. Submit the contract to the user for validation **before writing any code**

### Step 5 — Design Philosophy (UI features only)
Use the `frontend-design` skill:
1. Define aesthetic intent (tone, mood, what makes it memorable)
2. List `frontend/src/design-system/components/` components to use
3. Describe motion and loading state model
4. Write `docs/features/Vxx-[Name]/DESIGN_PHILOSOPHY.md`

**Submit to user for validation before writing code.**

### Step 6 — Database Schema (if applicable)
If the feature modifies data models:
- Design the schema (normalized, indexed correctly)
- Write a migration script in `backend/src/migrations/`
- Do not assume any column exists — verify against existing migrations

---

## Phase 2 — Implementation

### Step 7 — Backend
- Implement service logic in `backend/src/services/v3/`
- Validate input with Zod (match the approved Swagger contract exactly)
- Controller delegates to service — no business logic in controllers
- All endpoints return `{ success: true, data: ... }` or `{ success: false, error: "..." }`

### Step 8 — ML (if applicable)
- Follow `@machine-learning-engineer` rule
- Use scripts in `ml-service/scripts/`

### Step 9 — Frontend
- Check `frontend/src/design-system/components/` first — use existing components
- Use CSS token variables only — no hardcoded values
- Implement all three states: `<Skeleton>` / error / data
- Apply `useMemo`/`useCallback` for performance
- Apply staggered reveal animations for entry states

### Step 10 — Clean Pass
Before testing, scan modified files:
- [ ] No unused imports or variables
- [ ] No hardcoded hex/rgb/px values in JSX
- [ ] No `style={{...}}` with more than 2 properties
- [ ] No function longer than 50 lines without justification

---

## Phase 3 — Validation Per US (RIGOROUS)

After each User Story is implemented:

### Step 11 — Docker Build Check
```bash
docker compose build
```
Read the full logs. If an error is found and fixed, **always rebuild and re-read logs** — never assume a fix worked without proof.

### Step 12 — Test Battery (use `qa-automation` skill)
```bash
cd backend && npm test   # Unit tests + API contract tests
cd frontend && npm test  # Component tests
```
- Zero failures allowed
- If a test breaks, fix the root cause — do not comment it out

### Step 13 — User Validation (BLOCKING)
Present:
- Summary of US implemented
- Test results
- Any open design decisions

**Do not proceed to the next US without explicit user approval.**

---

## Phase 4 — Final Delivery

### Step 14 — QA Report (MANDATORY ARTIFACT)
Generate `docs/features/Vxx-[Name]/QA-REPORT.md` using the `qa-automation` skill template:
- Scenarios tested
- Docker build logs (copy proof of success)
- Test suite results
- UI checklist (Skeleton, error states, focus states, no hardcoded values)
- Screenshots for UI features

**No merge to `main` is allowed without this file.**

### Step 15 — Git Delivery (BLOCKING)
If and only if the QA Report is complete and approved by the user:
- Trigger the `/gitflow` workflow
- The git engineer verifies `QA-REPORT.md` exists before any merge

---

## Notes

- Adapt to scope: skip inapplicable steps (e.g. skip Step 6 if no DB changes)
- Step 2 architecture analysis is non-negotiable — it prevents duplication
- The QA Report is the proof of delivery — no exceptions
