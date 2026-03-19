# 🔀 Git & Version Control Strategy — statFootV3

> **Version:** 1.0  
> **Date:** 2026-02-18  
> **Scope:** Branching, Commits, PRs, Merges, Releases, Conflict Prevention  
> **Stack:** React (Frontend) · Node.js (Backend) · PostgreSQL (Database)

---

## Table of Contents

1. [Branch Naming Convention](#1-branch-naming-convention)
2. [Branch Lifecycle](#2-branch-lifecycle)
3. [Commit Message Template](#3-commit-message-template)
4. [Pull Request Template](#4-pull-request-template)
5. [Merge Strategy](#5-merge-strategy)
6. [Release Tagging Strategy](#6-release-tagging-strategy)
7. [Conflict Prevention Strategy](#7-conflict-prevention-strategy)
8. [Example Git Commands](#8-example-git-commands)
9. [Migration from Current State](#9-migration-from-current-state)

---

## 1. Branch Naming Convention

### Format

```
<type>/<ticket-id>-<short-description>
```

### Branch Types

| Prefix        | Purpose                            | Base Branch | Example                                  |
|---------------|------------------------------------|-------------|------------------------------------------|
| `main`        | Production-ready code              | —           | `main`                                   |
| `develop`     | Integration branch for next release| `main`      | `develop`                                |
| `feat/`       | New feature                        | `develop`   | `feat/US-042-import-hub-dashboard`       |
| `fix/`        | Bug fix                            | `develop`   | `fix/US-087-lineup-display-overlap`      |
| `hotfix/`     | Critical production fix            | `main`      | `hotfix/US-101-api-key-leak`             |
| `refactor/`   | Code restructuring (no behavior change) | `develop` | `refactor/US-055-service-layer-cleanup` |
| `chore/`      | Tooling, config, CI/CD             | `develop`   | `chore/US-012-eslint-config`             |
| `docs/`       | Documentation only                 | `develop`   | `docs/US-030-api-endpoints-readme`       |
| `db/`         | Database schema migrations         | `develop`   | `db/US-063-add-fixture-events-table`     |
| `release/`    | Release preparation                | `develop`   | `release/v3.2.0`                         |

### Rules

- **All lowercase**, hyphens (`-`) as separators — no underscores, no camelCase.
- **Ticket/US ID is mandatory** (e.g., `US-042`). If no formal tracker exists, use a short sequential ID.
- **Max 50 characters** for the description portion.
- **No slashes** in the description itself (only the type prefix uses `/`).

### ⚠️ Current State vs. Recommended

| Current (Existing)              | Recommended (New)                        |
|---------------------------------|------------------------------------------|
| `V3_fixture_lineup_betting`     | `feat/US-XXX-fixture-lineup-betting`     |
| `V3_import_trophy`              | `feat/US-XXX-import-trophy`              |
| `V3_DB_cleanup`                 | `chore/US-XXX-db-cleanup`                |
| `V3_fix_Content_studio`         | `fix/US-XXX-content-studio`              |
| `V3_test_experimental`          | `feat/US-XXX-experimental-charts`        |

---

## 2. Branch Lifecycle

### Permanent Branches

```
main          ← Production. Always deployable. Protected.
develop       ← Integration. All features merge here first.
```

### Feature Branch Lifecycle

```
                    ┌─────────────────────────────────┐
                    │           develop                │
                    └──────┬──────────────┬────────────┘
                           │              │
                     branch off      merge back (PR)
                           │              │
                    ┌──────▼──────────────▼────────────┐
                    │   feat/US-042-import-hub          │
                    │                                   │
                    │  1. Create from develop            │
                    │  2. Develop & commit               │
                    │  3. Rebase onto develop            │
                    │  4. Open PR → develop              │
                    │  5. Code review + approve          │
                    │  6. Squash merge into develop      │
                    │  7. Delete branch                  │
                    └───────────────────────────────────┘
```

### Release Branch Lifecycle

```
develop ──► release/v3.2.0 ──► main
                │                  │
                │  Bug fixes only  │  Tag: v3.2.0
                │  No new features │
                │                  │
                └──────────────────┘
                   merge back into develop
```

### Hotfix Branch Lifecycle

```
main ──► hotfix/US-101-critical-fix ──► main  (tag: v3.2.1)
                                    ──► develop (cherry-pick)
```

### Branch Lifetime Rules

| Branch Type | Max Lifetime  | Action if Exceeded           |
|-------------|---------------|------------------------------|
| `feat/`     | 5 days        | Rebase & split if too large  |
| `fix/`      | 2 days        | Escalate if blocked          |
| `hotfix/`   | 1 day         | Critical — immediate merge   |
| `release/`  | 3 days        | Freeze features, fix only    |
| `refactor/` | 3 days        | Must not change behavior     |

---

## 3. Commit Message Template

### Format — Conventional Commits

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type         | When to Use                                    |
|--------------|------------------------------------------------|
| `feat`       | New feature for the user                       |
| `fix`        | Bug fix                                        |
| `refactor`   | Code change that neither fixes a bug nor adds a feature |
| `perf`       | Performance improvement                        |
| `style`      | Formatting, missing semi colons, etc. (no logic change) |
| `test`       | Adding or correcting tests                     |
| `docs`       | Documentation only                             |
| `chore`      | Build process, tooling, dependencies           |
| `ci`         | CI/CD configuration                            |
| `db`         | Database migrations or schema changes          |
| `revert`     | Reverts a previous commit                      |

### Scopes (Project-Specific)

| Scope        | Area                                           |
|--------------|-------------------------------------------------|
| `frontend`   | React frontend                                 |
| `backend`    | Node.js backend                                |
| `api`        | REST API endpoints                             |
| `db`         | Database schema, migrations, queries           |
| `import`     | Data import/ingestion pipelines                |
| `studio`     | Data Studio / visualization module             |
| `fixtures`   | Match fixtures module                          |
| `standings`  | League standings module                        |
| `trophies`   | Trophy management module                       |
| `players`    | Player profiles and statistics                 |
| `auth`       | Authentication and authorization               |
| `config`     | Configuration files                            |
| `deps`       | Dependency updates                             |

### Rules

1. **Subject line:** imperative mood, no period, max 72 characters.
2. **Body:** explain *what* and *why*, not *how*. Wrap at 80 characters.
3. **Footer:** reference ticket IDs (`Refs: US-042`) or breaking changes (`BREAKING CHANGE:`).
4. One **logical change** per commit — no mixing features and fixes.

### Examples

```
feat(import): add batch processing for trophy data ingestion

Implement parallel batch processing for trophy imports with
configurable chunk sizes. Includes retry logic for API rate
limiting (max 3 retries with exponential backoff).

Refs: US-063
```

```
fix(fixtures): correct lineup role mapping F → A

The API returns 'F' for Forward but the UI expects 'A' for
Attack. Added mapping layer in the lineup transformer.

Refs: US-088
```

```
db(schema): add fixture_events table with foreign keys

Create fixture_events table linking to fixtures and players.
Includes indexes on fixture_id and player_id for query
performance.

BREAKING CHANGE: Requires migration before deploy.
Refs: US-071
```

---

## 4. Pull Request Template

Create this file at `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## 📋 Summary

<!-- What does this PR do? One or two sentences. -->

## 🎫 Related Ticket

<!-- Link to User Story / Issue -->
- Refs: US-XXX

## 🔄 Type of Change

- [ ] ✨ New feature (`feat`)
- [ ] 🐛 Bug fix (`fix`)
- [ ] ♻️ Refactor (`refactor`)
- [ ] 🗄️ Database migration (`db`)
- [ ] 📝 Documentation (`docs`)
- [ ] 🔧 Chore / tooling (`chore`)
- [ ] 🚑 Hotfix (`hotfix`)

## 📸 Screenshots / Demo

<!-- If UI changes, add before/after screenshots -->

## 🧪 Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] API endpoints verified (Postman / curl)
- [ ] Frontend renders correctly
- [ ] Database migration tested (up + down)

## 📁 Files Changed

| Area       | Files                          | Change Type |
|------------|--------------------------------|-------------|
| Backend    |                                |             |
| Frontend   |                                |             |
| Database   |                                |             |
| Config     |                                |             |

## ⚠️ Breaking Changes

<!-- List any breaking changes and migration steps -->
- None

## 🔍 Review Checklist

- [ ] Code follows project conventions
- [ ] No console.log / debug artifacts
- [ ] No hardcoded values (API keys, URLs)
- [ ] Error handling is in place
- [ ] Commit history is clean (squashed if needed)

## 📝 Additional Notes

<!-- Anything reviewers should know -->
```

---

## 5. Merge Strategy

### Strategy per Branch Type

| Source Branch   | Target Branch | Merge Method      | Rationale                          |
|-----------------|---------------|-------------------|------------------------------------|
| `feat/*`        | `develop`     | **Squash Merge**  | Clean single commit per feature    |
| `fix/*`         | `develop`     | **Squash Merge**  | Clean single commit per fix        |
| `refactor/*`    | `develop`     | **Squash Merge**  | Atomic refactoring commit          |
| `release/*`     | `main`        | **Merge Commit**  | Preserves release boundary         |
| `release/*`     | `develop`     | **Merge Commit**  | Back-sync release fixes            |
| `hotfix/*`      | `main`        | **Merge Commit**  | Traceable emergency fix            |
| `hotfix/*`      | `develop`     | **Cherry-pick**   | Only the fix, not the tag commit   |

### Rules

1. **Never force-push** to `main` or `develop`.
2. **Always rebase** feature branches onto `develop` before opening a PR.
3. **Delete branches** after merge — no stale branches.
4. **No direct commits** to `main` or `develop` — PRs only.
5. **Linear history** on `develop` via squash merges.

### Pre-Merge Checklist

```
□ Branch is rebased onto latest develop
□ No merge conflicts
□ All tests pass
□ PR has at least 1 approval
□ Commit message follows convention
□ Branch will be deleted after merge
```

---

## 6. Release Tagging Strategy

### Versioning: Semantic Versioning (SemVer)

```
v<MAJOR>.<MINOR>.<PATCH>[-<pre-release>]
```

| Segment    | When to Increment                                    | Example         |
|------------|------------------------------------------------------|-----------------|
| **MAJOR**  | Breaking changes (API, DB schema incompatible)       | `v4.0.0`        |
| **MINOR**  | New features, backward compatible                    | `v3.2.0`        |
| **PATCH**  | Bug fixes, hotfixes                                  | `v3.2.1`        |
| **Pre-release** | Release candidates, betas                       | `v3.2.0-rc.1`   |

### Tag Format

```
v3.2.0
```

### Tag Message Format (Annotated Tags)

```
Release v3.2.0 — Import Hub & Lineup Display

Features:
- feat(import): centralized Import Hub dashboard (US-042)
- feat(fixtures): lineup display with role mapping (US-088)

Fixes:
- fix(api): resolve 403 on Ligue 1 data fetch (US-091)
- fix(standings): correct date range filter edge case (US-076)

Database:
- db(schema): add fixture_events table (US-071)

Breaking Changes:
- None
```

### Release Workflow

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v3.2.0

# 2. Final bug fixes only (no features!)
# ... fix, commit ...

# 3. Merge into main
git checkout main
git pull origin main
git merge --no-ff release/v3.2.0

# 4. Tag the release
git tag -a v3.2.0 -m "Release v3.2.0 — Import Hub & Lineup Display"

# 5. Push main and tags
git push origin main --tags

# 6. Back-merge into develop
git checkout develop
git merge --no-ff release/v3.2.0

# 7. Cleanup
git branch -d release/v3.2.0
git push origin --delete release/v3.2.0
```

### Suggested Initial Tags for Current State

| Tag       | Commit  | Description                                |
|-----------|---------|--------------------------------------------|
| `v3.0.0`  | First V3 stable commit | V3 architecture foundation    |
| `v3.1.0`  | `9b2db6a` | Import stabilization + trophy handling   |
| `v3.2.0`  | `4424d82` | Fixture Lineup & Betting Labs            |

---

## 7. Conflict Prevention Strategy

### 7.1 Architectural Boundaries

```
statFootV3/
├── backend/
│   └── src/
│       ├── config/        ← Rarely changes (low conflict risk)
│       ├── controllers/   ← One file per module
│       ├── routes/        ← One file per module
│       ├── services/      ← One file per module
│       └── middleware/    ← Shared (coordinate changes)
├── frontend/
│   └── src/
│       ├── components/    ← One folder per feature
│       ├── pages/         ← One file per page
│       ├── hooks/         ← Shared (coordinate changes)
│       └── services/      ← API client (shared — coordinate)
└── docs/
```

**Rule:** Each feature branch should touch **one module** across frontend and backend. If a feature requires changes across multiple modules, split it into sub-tasks.

### 7.2 High-Risk Files (Conflict Hotspots)

These files are shared across features and are the most likely source of merge conflicts:

| File                                 | Risk    | Mitigation                              |
|--------------------------------------|---------|------------------------------------------|
| `backend/src/routes/index.js`        | 🔴 High | Add routes at end of file, not middle    |
| `frontend/src/App.jsx`               | 🔴 High | Minimize imports; use lazy loading       |
| `package.json` / `package-lock.json` | 🟡 Med  | One dependency change per PR             |
| `database_v3.js` (config)            | 🟡 Med  | Rarely change; coordinate if needed      |
| Shared CSS / theme files             | 🟡 Med  | Use scoped/module CSS per component      |

### 7.3 Daily Practices

```bash
# Start of day: sync your branch
git checkout develop
git pull origin develop
git checkout feat/US-042-import-hub
git rebase develop

# Resolve any conflicts EARLY, not at PR time
```

### 7.4 Pre-Merge Rebase Rule

```bash
# Before opening a PR, ALWAYS rebase
git fetch origin
git rebase origin/develop

# If conflicts arise, resolve them now
# Then force-push your feature branch (safe — it's YOUR branch)
git push --force-with-lease origin feat/US-042-import-hub
```

### 7.5 Lock File Strategy

```bash
# Never manually edit package-lock.json
# If conflicts occur in lock files:
git checkout --theirs package-lock.json
npm install
git add package-lock.json
```

### 7.6 Database Migration Conflicts

- **Number migrations sequentially** (timestamp-based):  
  `20260218_001_add_fixture_events.sql`
- **Never modify** an already-merged migration — create a new one.
- **Coordinate** schema changes via the team channel before branching.

---

## 8. Example Git Commands

### Starting a New Feature

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feat/US-042-import-hub-dashboard

# Work, commit incrementally
git add backend/src/controllers/importController.js
git commit -m "feat(import): add import hub controller with batch endpoints"

git add frontend/src/pages/ImportHub.jsx
git commit -m "feat(import): create Import Hub dashboard page layout"

git add backend/src/services/importService.js
git commit -m "feat(import): implement batch import service with retry logic"
```

### Rebasing Before PR

```bash
# Fetch latest changes
git fetch origin

# Rebase onto develop
git rebase origin/develop

# If there are conflicts — resolve them, then:
git add .
git rebase --continue

# Push (force-with-lease for safety)
git push --force-with-lease origin feat/US-042-import-hub-dashboard
```

### Creating a Pull Request (GitHub CLI)

```bash
gh pr create \
  --base develop \
  --head feat/US-042-import-hub-dashboard \
  --title "feat(import): centralized Import Hub dashboard" \
  --body "## Summary
Implements the Import Hub dashboard for managing all V3 data ingestion.

## Related Ticket
Refs: US-042

## Type of Change
- [x] ✨ New feature" \
  --assignee @me
```

### Hotfix Flow

```bash
# Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/US-101-api-key-exposure

# Fix, commit
git commit -m "fix(config): remove exposed API key from client bundle

The API key was being included in the frontend bundle via
environment variable misconfiguration.

Refs: US-101"

# Merge to main
git checkout main
git merge --no-ff hotfix/US-101-api-key-exposure

# Tag
git tag -a v3.2.1 -m "Hotfix v3.2.1 — Remove exposed API key"
git push origin main --tags

# Cherry-pick to develop
git checkout develop
git cherry-pick <commit-hash>

# Cleanup
git branch -d hotfix/US-101-api-key-exposure
```

### Viewing Clean History

```bash
# Pretty log with graph
git log --oneline --graph --all --decorate -20

# Log for a specific module
git log --oneline -- backend/src/services/

# Find who last changed a file
git log --oneline -5 -- backend/src/config/database_v3.js
```

### Undoing Mistakes Safely

```bash
# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (keep changes unstaged)
git reset HEAD~1

# Discard all local changes (DANGEROUS)
git checkout -- .

# Revert a merged commit (creates a new commit)
git revert <commit-hash>
```

---

## 9. Migration from Current State

Your current branch structure uses a `V3_` prefix convention without type categorization. Here's a migration plan to adopt the new strategy **without disrupting ongoing work**:

### Phase 1: Establish Permanent Branches (Immediate)

```bash
# Create develop from the current V3 branch
git checkout V3
git checkout -b develop
git push origin develop
```

### Phase 2: Protect Branches (GitHub Settings)

1. Go to **Settings → Branches → Branch protection rules**
2. Add rule for `main`:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1 minimum)
   - ✅ Require status checks to pass
   - ✅ Do not allow force pushes
   - ✅ Do not allow deletions
3. Add rule for `develop`:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass

### Phase 3: Rename Active Branches (Gradual)

For each **active** branch, when you next work on it:

```bash
# Example: Rename V3_fixture_lineup_betting
git checkout V3_fixture_lineup_betting
git checkout -b feat/US-XXX-fixture-lineup-betting
git push origin feat/US-XXX-fixture-lineup-betting
# Delete old branch after confirming
git push origin --delete V3_fixture_lineup_betting
```

### Phase 4: Archive Stale Branches

```bash
# For branches that are fully merged or abandoned:
git tag archive/V3_test_experimental V3_test_experimental
git push origin archive/V3_test_experimental
git branch -d V3_test_experimental
git push origin --delete V3_test_experimental
```

### Phase 5: First Tagged Release

```bash
git checkout main
git tag -a v3.0.0 -m "Release v3.0.0 — V3 Architecture Foundation

Initial stable release of V3 architecture including:
- React frontend with component-based UI
- Node.js backend with REST API
- PostgreSQL database with V3 schema
- Data import pipeline (leagues, fixtures, lineups, trophies)
- Data Studio visualization engine
- Dynamic standings with date filtering"

git push origin --tags
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                  GIT QUICK REFERENCE                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  BRANCH:  <type>/<ticket>-<description>                 │
│  COMMIT:  <type>(<scope>): <subject>                    │
│  TAG:     v<MAJOR>.<MINOR>.<PATCH>                      │
│                                                         │
│  TYPES:   feat fix refactor perf style test              │
│           docs chore ci db revert                        │
│                                                         │
│  SCOPES:  frontend backend api db import studio          │
│           fixtures standings trophies players             │
│           auth config deps                               │
│                                                         │
│  FLOW:    develop → feat/* → PR → squash → develop       │
│           develop → release/* → main (tag) → develop     │
│           main → hotfix/* → main (tag) → develop         │
│                                                         │
│  RULES:   • Rebase before PR                             │
│           • Squash merge features                        │
│           • Delete after merge                           │
│           • Never force-push main/develop                │
│           • One logical change per commit                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

*This document is maintained by the Version Control team. For questions or proposed changes, open a PR against `docs/GIT_STRATEGY.md`.*
