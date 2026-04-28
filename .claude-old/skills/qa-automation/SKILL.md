---
name: qa-automation
description: Run the full QA test battery for statFootV3 features — Unit Tests, API Contract Tests, and Non-Regression checks. Use when a feature is complete and needs validation, or when asked to write tests, run tests, check coverage, or validate API contracts against Zod schemas.
---

This skill runs the full QA triple-check for every statFootV3 feature. No feature ships without passing all three layers.

## The Triple-Check

### Layer 1 — Unit Tests (TU)

Target: Pure business logic — data transforms, calculations, utility functions.

Location: `backend/test/v3/` or `frontend/src/test/`

Framework: Vitest (both frontend and backend use `vitest`)

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# With coverage
npm run test:coverage
```

What to test:
- Input validation edge cases (empty, null, out-of-range)
- Pure calculation functions (stats, odds, probabilities)
- Data transformation utilities
- Service methods with mocked DB dependencies

Minimum bar: one happy-path test + one error-path test per new function.

See `references/test-patterns.md` for Vitest patterns with mocks.

### Layer 2 — API Contract Tests

Target: Verify endpoint request/response shapes match Zod schemas and Swagger docs.

Tool: Supertest + Vitest (already in `backend/devDependencies`)

```js
// Example pattern
import request from 'supertest';
import app from '../src/app.js'; // adjust path

test('GET /api/leagues returns valid shape', async () => {
    const res = await request(app).get('/api/leagues');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: expect.any(Array) });
});
```

Every new or modified endpoint needs:
1. Happy-path response shape check
2. 400 validation error test (send bad input)
3. Verify Zod schema in `backend/src/schemas/` covers the response

### Layer 3 — Non-Regression (TNR)

Before submitting a feature, run the full test suite and confirm no regressions:

```bash
# Full backend suite
cd backend && npm test

# Full frontend suite
cd frontend && npm test
```

If any existing test breaks, fix it before proceeding. Do not skip. Do not comment out.

## UI Quality Checks

For frontend features, verify these manually (or via Playwright if configured):

- [ ] All data-fetching components show `<Skeleton>` while loading
- [ ] All components have an error state (not a blank screen)
- [ ] Focus states are visible (`box-shadow: var(--focus-ring)`)
- [ ] No hardcoded colors in JSX (grep: `style={{.*#`)
- [ ] `useMemo`/`useCallback` used for expensive operations
- [ ] New components added to `frontend/src/design-system/` if reusable

## QA Report

After the triple-check, generate `docs/features/Vxx-[Name]/QA-REPORT.md`:

```markdown
# QA Report — [Feature Name]

## Unit Tests
- Files: [list]
- Result: ✅ X passed / ❌ X failed

## API Contract Tests
- Endpoints tested: [list]
- Zod schemas verified: [list]
- Result: ✅ / ❌

## Non-Regression
- Full suite result: ✅ X passed, 0 failed
- Regressions introduced: None / [list]

## UI Checks
- Skeleton loading: ✅ / ❌
- Error states: ✅ / ❌
- Focus states: ✅ / ❌
- Design System compliance: ✅ / ❌
```

## NEVER LIST

- Skip tests to save time
- Comment out failing tests without fixing them
- Deploy if any API contract test fails
- Validate manually without leaving a written proof (QA Report)
- Write tests that only test the happy path
