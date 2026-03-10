---
name: testing
description: Helps with testing, Vitest, Playwright, and E2E automation. Use when writing unit tests, integration tests, or performing QA validation.
---

# Testing Skill

This skill ensures the quality and reliability of the `statFootV3` codebase through rigorous testing patterns.

## When to use this skill

- Use this when writing unit tests for backend services or frontend utilities.
- This is helpful for setting up E2E tests with Playwright.
- Use when validating API contracts against Zod schemas.
- Use to check test coverage and fix regressions.

## How to use it

### Test Layers
1. **Unit Tests (Vitest)**:
   - Backend: `backend/test/v3/`
   - Frontend: `frontend/src/test/`
   - Command: `npm test` in respective directories.
2. **API Contract Tests**:
   - Use Supertest with Vitest to verify response shapes.
3. **E2E/UI Tests**:
   - Use Playwright for critical user flows.

### QA Workflow
- Every feature requires a `QA-REPORT.md`.
- No feature ships without passing full backend and frontend non-regression suites.
- Minimum bar: 1 happy-path + 1 error-path test per new function.
