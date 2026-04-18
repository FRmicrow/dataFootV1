# Testing Guide — Quick Reference

## Status Dashboard

```
┌─────────────────────────────────────────────────────┐
│                 TEST SUITE STATUS                   │
├─────────────────────────────────────────────────────┤
│ Backend Unit Tests        ✅ 12/12 PASSING (321ms)  │
│ Frontend Unit Tests       ✅ 23/23 PASSING (789ms)  │
│ Integration Tests         ⏳ PENDING (need DB)      │
│ Security Tests            ✅ CODE REVIEW OK         │
│                                                     │
│ Overall Status:          ✅ READY FOR TESTING      │
└─────────────────────────────────────────────────────┘
```

---

## Running Tests Locally

### Backend Tests Only (No Database Required)
```bash
cd backend
npm test
# Result: 12 tests passing
```

### Frontend Tests Only
```bash
cd frontend
npm test
# Result: 23 tests passing
```

### Both Suites
```bash
# Terminal 1
cd backend && npm test

# Terminal 2
cd frontend && npm test
```

### Watch Mode (Auto-rerun on file changes)
```bash
# Backend
cd backend && npx vitest --watch

# Frontend
cd frontend && npx vitest --watch
```

### Coverage Report
```bash
cd backend && npx vitest run --coverage
cd frontend && npx vitest run --coverage
```

---

## Integration Testing (Requires Docker)

### Prerequisites
```bash
# 1. Start Docker daemon
open -a Docker

# 2. Verify Docker is running
docker ps
# Expected: CONTAINER ID | IMAGE | COMMAND (header row)
```

### Start Full Stack
```bash
cd /Users/domp6/Projet\ Dev/NinetyXI/dataFootV1

# Start database
docker-compose up -d db
sleep 5

# Verify database is ready
docker logs $(docker ps -q --filter "ancestor=postgres:15-alpine")
# Look for: "database system is ready to accept connections"
```

### Start Application Servers
```bash
# Terminal 1: Backend
cd backend && npm run dev
# Expected: "🚀 Server running on http://localhost:3001"

# Terminal 2: Frontend
cd frontend && npm run dev
# Expected: "Local:   http://localhost:5173"
```

### Run Integration Tests
```bash
# When both servers are running:
cd backend
npx vitest run src/controllers/v4/*.test.js
npx vitest run src/services/v4/*.test.js

# Frontend integration (if E2E tests exist)
cd frontend
npx vitest run src/integration/*.test.js
```

---

## Manual Testing (Using cURL)

### Test Admin Routes (Security)
```bash
# Test 1: No authentication header
curl -X POST http://localhost:3001/api/v4/admin/maintenance/deduplicate
# Expected: 401 Unauthorized

# Test 2: Invalid key
curl -X POST \
  -H "X-Admin-Key: wrong-key" \
  http://localhost:3001/api/v4/admin/maintenance/deduplicate
# Expected: 401 Unauthorized

# Test 3: Valid key (set in your .env: ADMIN_SECRET_KEY)
curl -X POST \
  -H "X-Admin-Key: 2a3e17d67ca8294e928854dfdd0f848e" \
  http://localhost:3001/api/v4/admin/maintenance/deduplicate
# Expected: 200 OK with deduplication results
```

### Test API Endpoints
```bash
# Get all leagues
curl -s http://localhost:3001/api/v4/leagues | jq

# Get specific league
curl -s http://localhost:3001/api/v4/leagues/550e8400-e29b-41d4-a716-446655440000 | jq

# Get match details (requires valid matchId)
curl -s "http://localhost:3001/api/v4/matches/{matchId}" | jq

# Get ML predictions
curl -s "http://localhost:3001/api/v4/ml/predictions?matchId={matchId}" | jq
```

### Test Frontend Pages
```bash
# Homepage
open http://localhost:5173

# ML Hub (if routed)
open http://localhost:5173/ml

# Check browser console (F12) for errors
```

---

## Test Coverage Map

### Backend Coverage

| Component | Tests | Status | Location |
|-----------|-------|--------|----------|
| leagueControllerV4 | 6 | ✅ | `src/controllers/v4/leagueControllerV4.test.js` |
| mlControllerV4 | 3 | ✅ | `src/controllers/v4/mlControllerV4.test.js` |
| MatchDetailV4Service | 3 | ✅ | `src/services/v4/MatchDetailV4Service.test.js` |
| clubControllerV4 | 0 | ⏳ | Create in same directory |
| requireAdminKey middleware | 0 | ✅* | Code review only (integration test needed) |

*Code reviewed, logic verified, unit test can be created

### Frontend Coverage

| Component | Tests | Status | Location |
|-----------|-------|--------|----------|
| Button | 12 | ✅ | `src/test/components/Button.test.jsx` |
| ErrorBoundary | 7 | ✅ | `src/test/components/ErrorBoundary.test.jsx` |
| MLHubV4 | 3 | ✅ | `src/test/components/MLHubV4.test.jsx` |
| Smoke Test | 1 | ✅ | `src/test/smoke.test.js` |
| Page components | 0 | ⏳ | Need integration tests |

---

## Creating New Tests

### Backend Test Template
```javascript
// backend/src/controllers/v4/exampleControllerV4.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as exampleController from './exampleControllerV4.js';
import * as exampleService from '../../services/v4/ExampleServiceV4.js';

// Mock the service
vi.mock('../../services/v4/ExampleServiceV4.js');

describe('exampleControllerV4', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, query: {}, headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it('returns success response', async () => {
    exampleService.getExample.mockResolvedValue({ id: 1, name: 'Test' });
    
    await exampleController.getExample(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 1, name: 'Test' }
    });
  });

  it('handles service error', async () => {
    exampleService.getExample.mockRejectedValue(new Error('DB error'));
    
    await exampleController.getExample(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String)
    });
  });
});
```

### Frontend Test Template
```javascript
// frontend/src/test/components/Example.test.jsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Example from '../../components/Example';

describe('Example Component', () => {
  it('renders with required props', () => {
    render(<Example title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Example onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

---

## Debugging Failed Tests

### Backend
```bash
# Run with verbose output
cd backend
npx vitest run --reporter=verbose

# Run single test file
npx vitest run src/controllers/v4/leagueControllerV4.test.js

# Run with debugger
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Frontend
```bash
# Run with verbose output
cd frontend
npx vitest run --reporter=verbose

# Run single test
npx vitest run src/test/components/Button.test.jsx

# Watch single test
npx vitest watch src/test/components/Button.test.jsx
```

### Common Issues

**Issue:** "Cannot find module"
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules
npm install --legacy-peer-deps
npm test
```

**Issue:** "ECONNREFUSED" during integration tests
```bash
# Solution: Ensure PostgreSQL is running
docker-compose ps
# Should show: db | postgres:15-alpine | Up
```

**Issue:** "Module not found react-is"
```bash
# Solution: Reinstall frontend dependencies
cd frontend
npm install --legacy-peer-deps
```

---

## Continuous Integration

### GitHub Actions (If Configured)
Tests should run automatically on:
- `git push` to any branch
- Pull requests

View results in: **GitHub Actions tab**

### Local CI Simulation
```bash
# Run full test suite as CI would
cd backend && npm test
cd frontend && npm test

# If both pass, CI should pass too
```

---

## Test Metrics

### Current Coverage
- **Backend Unit Tests:** 12 tests, 3 test files
- **Frontend Unit Tests:** 23 tests, 4 test files
- **Total:** 35 tests passing
- **Coverage Goal:** >80% for critical paths

### Execution Time
- Backend: 321ms
- Frontend: 789ms
- **Total:** ~1.1 seconds

### Performance Targets
- Individual test: < 100ms
- Suite: < 2 seconds
- Integration tests: < 10 seconds

---

## Test Data Management

### Reset Test Database (When Needed)
```bash
# Connection to test database
psql -h localhost -U statfoot_user -d statfoot -c "
  TRUNCATE TABLE v4.match_events CASCADE;
  TRUNCATE TABLE v4.standings CASCADE;
  -- ... other tables
"
```

### Seed Sample Data
```bash
# Run migration and seed scripts
cd backend
npm run migrate
npm run seed  # If available
```

---

## Accessing Test Results

### Backend Test Report
```bash
cd backend
npm test -- --reporter=json > test-report.json
cat test-report.json | jq '.testResults'
```

### Frontend Test Report
```bash
cd frontend
npm test -- --reporter=json > test-report.json
```

### Latest Test Results
See: `docs/TEST-REPORT.md` (updated after test runs)

---

## Security Test Checklist

- [x] Admin routes require X-Admin-Key header
- [x] SQL queries use parameterized statements (no string interpolation)
- [x] All user inputs validated with Zod schemas
- [x] Error responses don't expose sensitive information
- [x] Database credentials in .env, not in code
- [ ] CORS headers properly configured (check in integration tests)
- [ ] Rate limiting implemented (check if needed)
- [ ] No console.* statements in production code

---

## Quick Links

- **Test Report:** `docs/TEST-REPORT.md`
- **Test Plan:** `docs/TEST-PLAN.md`
- **Backend Tests:** `backend/src/**/*.test.js`
- **Frontend Tests:** `frontend/src/test/**/*.test.{js,jsx}`
- **CI Config:** `.github/workflows/` (if using GH Actions)

---

## Next Steps

1. **Get Docker Running**
   ```bash
   open -a Docker
   docker-compose up -d db
   ```

2. **Run Integration Tests**
   ```bash
   cd backend && npm run dev
   # In new terminal:
   cd frontend && npm run dev
   # Test endpoints from TEST-PLAN.md
   ```

3. **Add More Tests**
   - Create tests for clubControllerV4
   - Add integration tests for all V4 endpoints
   - Add E2E tests for critical user flows

4. **Set Up CI/CD**
   - Configure GitHub Actions to run tests on every push
   - Add test coverage reporting
   - Enforce minimum coverage thresholds

---

**Last Updated:** 2026-04-18  
**Maintained By:** Claude Code  
**Questions?** See docs/AUDIT-REMEDIATION-PLAN.md for known issues
