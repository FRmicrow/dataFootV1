# Audit Remediation Plan — statFootV3

> Generated: 2026-03-09
> Branch: feature/V31-ReworkAgent-V2
> Auditor: Claude Sonnet 4.6

This document is the single source of truth for all issues found in the audit and their fixes.
Each section includes the issue, impact, fix, and — for sensitive changes — explicit instructions for the developer to review before applying.

---

## Table of Contents

1. [Agent System (V2 Rework)](#1-agent-system-v2-rework) — **In progress on this branch**
2. [Security — Critical](#2-security--critical)
3. [Architecture — Server & Backend](#3-architecture--server--backend)
4. [Frontend — Design System Compliance](#4-frontend--design-system-compliance)
5. [Test Coverage](#5-test-coverage)
6. [Logging](#6-logging)
7. [Status Tracker](#7-status-tracker)

---

## 1. Agent System (V2 Rework)

### Problem
The `.agents/V2/` system was created with good intent but did not follow the official Anthropic skill format:
- `SKILL.md` files used a table-based header instead of YAML frontmatter
- No trigger phrases in descriptions (Claude cannot auto-activate the skills)
- No progressive disclosure (all content in one file, no `references/` structure)
- Rules files were not actionable enough for Claude Code

### Fix Applied (this branch)
All V2 agent files have been reworked to match the [Anthropic Skill Spec](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf):

| File | Change |
|---|---|
| `.agents/V2/skills/frontend-design-v2/SKILL.md` | Full rewrite with YAML frontmatter + trigger phrases |
| `.agents/V2/skills/frontend-design-v2/references/design-tokens.md` | New — extracted token reference |
| `.agents/V2/skills/qa-automation-v2/SKILL.md` | Full rewrite with YAML frontmatter + trigger phrases |
| `.agents/V2/skills/qa-automation-v2/references/test-patterns.md` | New — extracted test pattern reference |
| `.agents/V2/workflows/implement-feature-v2.md` | Enhanced with Anthropic patterns |
| `.agents/V2/rules/development-best-practices.md` | Strengthened with Design System enforcement |
| `.agents/V2/rules/visual-manifesto.md` | Aligned with Anthropic `frontend-design` skill |
| `.agents/V2/rules/ai-cognition.md` | Enhanced with anti-hallucination & context rules |
| `CLAUDE.md` (root) | New — project-level config pointing to V2 agent system |

---

## 2. Security — Critical

### 2a. `.env` Not Properly Gitignored

**Issue:** `backend/.env` exists and is not covered by `.gitignore` (which only excludes `.env.local` and `.env.*.local`). If accidentally pushed, credentials are exposed.

**Impact:** HIGH — credential leak risk.

**Fix:**
```
# In .gitignore, add:
**/.env
```

> **ACTION REQUIRED BY DEVELOPER:** After adding this rule, run `git status` to confirm `backend/.env` shows as untracked (not staged). If it was ever committed, run `git rm --cached backend/.env` to remove it from tracking without deleting the file.

---

### 2b. Docker Container Running as Root

**Issue:** `docker-compose.yml` line 20: `user: root` for the backend service.

**Impact:** MEDIUM — if the Node process is compromised, the attacker has root inside the container.

**Fix:**

```yaml
# In docker-compose.yml, REMOVE this line from the backend service:
user: root

# The backend Dockerfile should instead use a non-root user.
# Add to backend/Dockerfile (before the CMD line):
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
```

> **ACTION REQUIRED BY DEVELOPER:** Removing `user: root` may cause permission errors if the backend writes to mounted volumes (`./backend/src`, `./backend/data`). Test locally with `docker-compose up --build`. If you see EACCES errors on file writes (e.g., database exports, logs), you have two options:
> - Option A (preferred): Fix file permissions in the Dockerfile with `chown -R appuser:appgroup /app`
> - Option B (temporary): Keep `user: root` during active development and only remove it for production builds

---

### 2c. Hardcoded Database Credentials in Source Code

**Issue:** `backend/src/config/database.js` contains a fallback connection string with hardcoded credentials:
```js
const connectionString = process.env.DATABASE_URL || 'postgres://statfoot_user:statfoot_password@localhost:5432/statfoot';
```

**Impact:** MEDIUM — credentials are committed to the repository.

**Fix:**

```js
// Replace the fallback with a startup failure:
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required. Copy backend/.env.example and fill in your credentials.');
}
```

> **ACTION REQUIRED BY DEVELOPER:** Before applying this fix, make sure `backend/.env` exists and contains `DATABASE_URL=postgres://...`. Also create `backend/.env.example` with the structure (no real credentials) so future developers know what to set:
> ```
> DATABASE_URL=postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/statfoot
> API_FOOTBALL_KEY=your_api_key_here
> PORT=3001
> NODE_ENV=development
> ```

---

### 2d. CORS Allows All Origins in Non-Production

**Issue:** `backend/src/server.js` line 58:
```js
if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
```
This bypasses the allowlist entirely in development, accepting requests from any origin.

**Impact:** LOW in local dev, but dangerous if `NODE_ENV` is accidentally left as `development` in a staging/cloud environment.

**Fix:**
```js
// Replace the CORS check with:
if (allowedOrigins.includes(origin)) {
    callback(null, true);
} else {
    callback(new Error('Not allowed by CORS'));
}
// In development, ensure localhost origins are always in allowedOrigins (they already are).
```

---

## 3. Architecture — Server & Backend

### 3a. Misplaced Import in server.js

**Issue:** `MarketVolatilityService` is imported at line 103 of `server.js`, mid-file, after all middleware setup.

**Fix:** Move to the top of the file with all other imports.

---

### 3b. Weekly Scheduler Uses Polling (setInterval)

**Issue:** `server.js` uses `setInterval` every 10 minutes to check if it's Monday 4 AM. This fires ~144 times/day and can miss the window.

**Fix:** Replace with `node-cron`:
```js
import cron from 'node-cron';

// Weekly retraining — every Monday at 04:00 AM
cron.schedule('0 4 * * 1', async () => {
    const { default: mlService } = await import('./services/v3/mlService.js');
    mlService.triggerRetraining().catch(err => console.error("❌ Weekly Training Error:", err));
});
```
Install: `npm install node-cron` in `/backend`.

---

### 3c. Error Handler Middleware Ordering

**Status:** Actually correct. Express error handlers (4 params) at line 89 before 404 handler at line 99 is the right order. No fix needed.

---

## 4. Frontend — Design System Compliance

### 4a. Inter Font Contradicts Visual Manifesto

**Issue:** `tokens.css` defines `--font-family: 'Inter', system-ui, ...` but `visual-manifesto.md` says "Évitez Inter/Arial."

**Fix options:**
- Option A: Update `visual-manifesto.md` to accept Inter (it's actually a high-quality font)
- Option B: Change `tokens.css` to a more distinctive font (e.g. `'DM Sans'`, `'Sora'`, `'Outfit'`)

> **ACTION REQUIRED BY DEVELOPER:** This is a design decision. Decide which option, then apply consistently. If you want to change the font, update `tokens.css` and add the Google Fonts import to `index.html`.

---

### 4b. 610 Inline Style Blocks

**Issue:** `style={{...}}` appears 610 times across frontend components. This bypasses the design system.

**Fix strategy (incremental, not a big-bang rewrite):**
- The V2 `frontend-design-v2` skill now enforces zero inline styles for new components
- For existing code: address per feature during the natural refactor cycle
- Priority targets: the largest pages (`LiveBetMatchDetails.jsx` 576 lines, `ImportMatrixPage.jsx` 509 lines)

---

### 4c. Zero React Error Boundaries

**Issue:** No `ErrorBoundary` component anywhere in the frontend. One render error crashes the entire app.

**Fix:** Add a single root-level Error Boundary in `App.jsx` as a minimum, plus page-level boundaries for critical routes.

---

### 4d. Skeleton Coverage Gaps

**Issue:** Only 25 Skeleton usages vs the manifesto rule "JAMAIS de chargement sans Skeleton."

**Fix:** Enforce via the updated `qa-automation-v2` skill — QA checks now include verifying loading states on all data-fetching components.

---

## 5. Test Coverage

### 5a. Backend: 4 Test Files for 29 Services

**Issue:** `backend/test/v3/` has only 4 test files covering the whole backend.

**Fix strategy:**
- The updated `qa-automation-v2` skill now enforces test creation per feature
- Priority: service-layer unit tests for `SimulationQueueService`, `mlService`, `StatsEngine`
- Minimum target: one test file per service (happy path + one error path)

---

## 6. Logging

### 6a. 299 console.log Statements

**Issue:** No structured logging. Cannot filter by level, module, or environment.

**Recommended fix:** Replace with `pino` (fastest Node.js logger):
```bash
npm install pino pino-pretty
```
```js
// backend/src/utils/logger.js
import pino from 'pino';
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});
```

> This is a medium-effort refactor. Address incrementally — start by replacing console.error calls with logger.error in new code.

---

## 7. Status Tracker

| # | Area | Severity | Status |
|---|---|---|---|
| 1 | Agent system rework | Medium | ✅ Done |
| 2a | .gitignore .env | High | ✅ Done — `**/.env` added, merge conflict resolved |
| 2b | Docker user: root | Medium | ✅ Done — `user: root` removed from docker-compose.yml |
| 2c | Hardcoded DB credentials | Medium | ✅ Done — fallback removed, `.env.example` updated |
| 2d | CORS non-prod bypass | Low | ✅ Done |
| 3a | Import ordering (server.js) | Low | ✅ Done |
| 3b | setInterval scheduler | Low | ✅ Done — replaced with node-cron |
| 4a | Inter font vs manifesto | Low | ⬜ Design decision required |
| 4b | 610 inline styles | Medium | 🔄 Incremental — enforced via skill |
| 4c | Error Boundaries | Medium | ✅ Done — ErrorBoundary in App.jsx |
| 4d | Skeleton gaps | Low | 🔄 Incremental — enforced via skill |
| 5a | Test coverage | Medium | ✅ Foundation done — 52 new tests added |
| 6a | Logging | Low | ✅ Done — pino logger, server.js + database.js migrated |
