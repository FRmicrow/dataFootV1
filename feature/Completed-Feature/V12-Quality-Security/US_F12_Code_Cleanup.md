# User Story: V12 Code Quality & Architectural Cleanup

**Goal**: Systematically resolve high-impact technical debt, cognitive complexity, and logical bugs identified by the SonarQube baseline to ensure long-term maintainability.

## Scan Summary (Post-Cleanup)
| Metric               | Before | After  | Delta   |
|----------------------|--------|--------|---------|
| Blockers             | 0      | 0      | —       |
| Critical (Code Smell)| 60     | 58     | -2      |
| Major (Bugs)         | 21     | **0**  | **-21** |
| Total Bugs           | 67     | 44     | -23     |
| Vulnerabilities      | 0      | 0      | —       |
| Total Issues         | 1261   | 1233   | -28     |
| Quality Gate         | ✅ OK  | ✅ OK  | —       |

---

## Phase 1: Critical Logic & Structural Integrity ✅ COMPLETED

### 1. Fixed Redundant Conditionals (Bugs)
- [x] `backend/src/middleware/validateRequest.js` L25: Removed identical truthy/falsy ternary in Zod error handler.
- [x] `frontend/src/components/v3/studio/Step3Preview.jsx` L11: Simplified redundant dimension ternary (both branches identical for portrait/square).
- [x] `frontend/src/components/v3/studio/Step4Export.jsx` L15: Mirror fix for video export dimensions.

### 2. Hardened Collection Aggregates
- [x] `backend/src/services/v3/quantService.js` L72: Added initial value `outcomes[0]` to `reduce()` call to prevent crash on empty array.

### 3. Resolved React Syntax Errors
- [x] `frontend/src/components/v3/HealthCenterPage.jsx` L314-315: Wrapped JSX comment strings in `{backtick}` template literals.

### 4. Fixed Axios Type-Mismatch Bugs (`.status` string vs number)
- [x] `frontend/src/components/v3/live-bet/SimulationDashboard.jsx` L199, 207-222: Cast `data.status` via `String()` and `.toLowerCase()` for consistent comparison.
- [x] `frontend/src/components/v3/ForgeLaboratory.jsx` L90-92: Cast `currentStatus.status` via `String()`.
- [x] `frontend/src/components/v3/ForgeLaboratory.jsx` L121-124: Cast `res.status` via `String()` for retrain response.
- [x] `frontend/src/components/v3/LeagueActivationStage.jsx` L43: Cast `syncRes.status` via `String()`.

### 5. Code Quality Fixes
- [x] `backend/src/routes/v3_routes.js` L170: Merged duplicate import of `v3Schemas.js` into single import block.
- [x] `frontend/src/components/v3/InlineMatchDetailTactical.jsx`: Added `PropTypes` validation for `fixtureId` prop.

---

## Phase 2: Cognitive Complexity & Refactoring (US_F12_200) — BACKLOG
*Priority: Major/Critical — Deferred for targeted refactoring session*

### Remaining Work:
1. **Complexity Reduction**:
    - `backend/src/controllers/v3/importController.js`: Refactor primary import loop (Complexity: 75 → target < 20).
    - `frontend/src/components/v3/PlayerProfilePageV3.jsx`: De-nest deep callback structures (4+ levels).
    - `frontend/src/components/v3/ForgeLaboratory.jsx` L373: Reduce function nesting depth.
2. **Remaining Code Smells** (58 Critical, 768 Major):
    - Mostly prop-validation, unused variables, and cognitive complexity issues.
    - MINOR bugs (44 remaining) are accessibility/keyboard listeners — low runtime risk.

## Acceptance Criteria:
- [x] 0 Critical/Major Bugs remaining in SonarQube dashboard.
- [ ] Cognitive complexity of `importController` reduced below 20.
- [x] All JSX components pass syntax and linter checks.
- [x] Local `@sonar/scan` reports a "Passed" Quality Gate.
