# Test Plan — Comprehensive Application Testing

## Overview

This document provides detailed test cases for all V4 API endpoints and frontend pages. Use this to:
- Validate new deployments
- Catch regressions during development
- Verify security fixes
- Document expected behavior

**Current Status:** Unit tests ✅ | Integration tests ⏳ (blocked on Docker)

---

## Test Environment Setup

### Prerequisites
```bash
# 1. Start Docker daemon
open -a Docker

# 2. Start database
cd backend && docker-compose up -d db
sleep 10  # Wait for PostgreSQL to be ready

# 3. Start backend server
cd backend && npm run dev
# Expected: Server running on http://localhost:3001

# 4. Start frontend server (in new terminal)
cd frontend && npm run dev
# Expected: Server running on http://localhost:5173
```

### Test Data
- Populated database with sample leagues, clubs, matches
- Admin credentials: `X-Admin-Key: 2a3e17d67ca8294e928854dfdd0f848e`
- Test user account (if applicable)

---

## Part 1: V4 API Endpoint Tests

### Category: Leagues (8 endpoints)

#### Test 1.1: Get All Leagues
**Endpoint:** `GET /api/v4/leagues`  
**Method:** HTTP GET  
**Parameters:** None  
**Expected Status:** 200  
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "English Premier League",
      "country": "England",
      "founded_year": 1992,
      "logo_url": "https://tmssl.akamaized.net/..."
    },
    ...
  ]
}
```
**Test Steps:**
1. Send GET request to `/api/v4/leagues`
2. Verify response status is 200
3. Verify response contains array of league objects
4. Verify each league has: id, name, country, logo_url
5. Verify array is not empty
**Pass Criteria:** Status 200, valid JSON, contains at least 1 league
**Failure Handling:** If empty array, verify database has sample data

---

#### Test 1.2: Get League Details
**Endpoint:** `GET /api/v4/leagues/:leagueId`  
**Method:** HTTP GET  
**Parameters:** 
- `leagueId` (UUID): ID from Test 1.1

**Expected Status:** 200 (valid ID) or 404 (invalid ID)

**Happy Path (Valid ID):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "English Premier League",
    "country": "England",
    "founded_year": 1992,
    "teams_count": 20,
    "current_season": 2025,
    "logo_url": "...",
    "website": "..."
  }
}
```

**Test Steps:**
1. Extract leagueId from Test 1.1 result
2. Send GET request to `/api/v4/leagues/{leagueId}`
3. Verify response status is 200
4. Verify response matches expected schema
5. Verify data includes teams_count and current_season

**Error Case (Invalid ID):**
```bash
curl -s http://localhost:3001/api/v4/leagues/invalid-uuid
# Expected: 400 Validation Error or 404 Not Found
```

**Pass Criteria:** 200 with complete league data, or proper 404 error

---

#### Test 1.3: Get Season Standings
**Endpoint:** `GET /api/v4/leagues/:leagueId/season/:year`  
**Method:** HTTP GET  
**Parameters:**
- `leagueId` (UUID): From Test 1.1
- `year` (integer): e.g., 2025

**Expected Status:** 200

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "season": 2025,
    "league": "English Premier League",
    "standings": [
      {
        "position": 1,
        "team_id": "...",
        "team_name": "Manchester City",
        "played": 38,
        "wins": 28,
        "draws": 5,
        "losses": 5,
        "goals_for": 96,
        "goals_against": 35,
        "goal_difference": 61,
        "points": 89
      },
      ...
    ]
  }
}
```

**Test Steps:**
1. Use leagueId from Test 1.1
2. Send GET request with current year
3. Verify response contains standings array
4. Verify standings are sorted by points (descending)
5. Verify first team has position 1
6. Verify math: points = (wins × 3) + draws

**Edge Cases:**
- Non-existent season → Should return 404 or empty standings
- Invalid leagueId → Should return 404

**Pass Criteria:** 200, standings sorted by points, valid table structure

---

#### Test 1.4: Get Season Fixtures
**Endpoint:** `GET /api/v4/leagues/:leagueId/season/:year/fixtures`  
**Method:** HTTP GET  
**Parameters:**
- `leagueId` (UUID)
- `year` (integer)
- `status` (query, optional): "scheduled", "live", "finished"

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "season": 2025,
    "total_fixtures": 380,
    "fixtures": [
      {
        "match_id": "...",
        "date": "2025-08-16T15:00:00Z",
        "home_team": "Manchester United",
        "away_team": "Fulham",
        "home_goals": 1,
        "away_goals":0,
        "status": "finished",
        "referee": "Michael Oliver"
      },
      ...
    ]
  }
}
```

**Test Steps:**
1. Send GET to `/api/v4/leagues/{leagueId}/season/{year}/fixtures`
2. Verify response contains fixtures array
3. Verify each fixture has: match_id, date, teams, goals, status
4. Verify date format is ISO 8601
5. Test status filter: `?status=finished` returns only completed matches

**Pass Criteria:** 200, fixtures array populated, proper date format

---

#### Test 1.5: Get Season Statistics
**Endpoint:** `GET /api/v4/leagues/:leagueId/season/:year/stats`  
**Method:** HTTP GET  
**Parameters:** Same as 1.4

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "season": 2025,
    "total_goals": 1043,
    "total_matches": 380,
    "avg_goals_per_match": 2.74,
    "highest_scorer": {
      "player_name": "Erling Haaland",
      "team": "Manchester City",
      "goals": 36
    },
    "most_assists": { ... },
    "biggest_win": { ... },
    "team_stats": [...]
  }
}
```

**Test Steps:**
1. Get season stats
2. Verify calculations: avg_goals = total_goals / total_matches
3. Verify highest_scorer has max goals count
4. Verify team_stats array populated

**Pass Criteria:** 200, correct aggregations, valid player data

---

#### Tests 1.6-1.8: Other League Endpoints
- `GET /api/v4/leagues/popular` — Most followed leagues (test sorting)
- `GET /api/v4/leagues/:leagueId/season/:year/team-comparator` — Compare 2+ teams
- `GET /api/v4/leagues/search?q=premier` — Search by name

**Common Test Steps:**
1. Verify endpoint responds with 200
2. Verify response matches documented schema
3. Test with empty/invalid query parameters → expect 400 or empty results
4. Verify performance (response time < 200ms)

---

### Category: Clubs (5 endpoints)

#### Test 2.1: Get All Clubs
**Endpoint:** `GET /api/v4/clubs`  
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Manchester City",
      "country": "England",
      "founded_year": 1880,
      "logo_url": "...",
      "stadium": "Etihad Stadium"
    },
    ...
  ]
}
```

**Test Steps:**
1. GET `/api/v4/clubs`
2. Verify array populated
3. Verify each club has: id, name, country, logo_url, stadium
4. Test pagination (if applicable): `?page=2&limit=20`

**Pass Criteria:** 200, non-empty array, valid schema

---

#### Test 2.2: Get Club Details
**Endpoint:** `GET /api/v4/clubs/:clubId`  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Manchester City",
    "country": "England",
    "stadium": "Etihad Stadium",
    "coach": "Pep Guardiola",
    "founded_year": 1880,
    "total_titles": 38,
    "logo_url": "...",
    "website": "https://..."
  }
}
```

**Test Steps:**
1. Get clubId from Test 2.1
2. GET `/api/v4/clubs/{clubId}`
3. Verify complete club profile returned
4. Verify coach and titles fields populated

**Error Cases:**
- Non-existent clubId → 404
- Invalid UUID → 400

**Pass Criteria:** 200, complete club data

---

#### Tests 2.3-2.5: Club Stats, Players, Transfers

**Test 2.3: Get Club Stats**
- Expected: Season statistics (goals scored/conceded, win rate, etc.)

**Test 2.4: Get Club Roster**
- Expected: Array of player objects with position, number, appearances
- Verify player data structure and count matches actual roster

**Test 2.5: Get Transfer History**
- Expected: Array of transfers (in/out) with dates and fees
- Verify chronological order

---

### Category: Match Details (4 endpoints)

#### Test 3.1: Get Match Details
**Endpoint:** `GET /api/v4/matches/:matchId`  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "match_id": "...",
    "date": "2025-12-26T15:00:00Z",
    "league": "English Premier League",
    "season": 2025,
    "home_team": {
      "id": "...",
      "name": "Manchester City",
      "logo": "..."
    },
    "away_team": { ... },
    "result": {
      "home_goals": 3,
      "away_goals": 1,
      "status": "finished"
    },
    "venue": "Etihad Stadium",
    "attendance": 54000,
    "referee": "Michael Oliver"
  }
}
```

**Test Steps:**
1. Get matchId from Test 1.4 (Season Fixtures)
2. GET `/api/v4/matches/{matchId}`
3. Verify all required fields present
4. Verify date is valid ISO 8601
5. Verify attendance is positive integer

**Pass Criteria:** 200, complete match data

---

#### Test 3.2: Get Match Lineups
**Endpoint:** `GET /api/v4/matches/:matchId/lineups`  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "match_id": "...",
    "home_team": {
      "name": "Manchester City",
      "formation": "4-3-3",
      "lineup": [
        {
          "player_id": "...",
          "name": "Ederson",
          "position": "GK",
          "shirt_number": 31
        },
        ...
      ]
    },
    "away_team": { ... }
  }
}
```

**Test Steps:**
1. GET `/api/v4/matches/{matchId}/lineups`
2. Verify formation format (e.g., "4-3-3")
3. Verify both teams have 11 players (in finished matches)
4. Verify all players have: position, shirt_number, name
5. Verify GK position exists

**Pass Criteria:** 200, valid lineups with 11 players each, correct formation

---

#### Test 3.3: Get Match Events
**Endpoint:** `GET /api/v4/matches/:matchId/events`  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "match_id": "...",
    "events": [
      {
        "event_id": "...",
        "minute": "45+2",
        "type": "goal",
        "player": "Erling Haaland",
        "team": "Manchester City",
        "detail": "Right foot shot"
      },
      {
        "event_id": "...",
        "minute": "67",
        "type": "substitution",
        "player_in": "Jack Grealish",
        "player_out": "Kalvin Phillips"
      },
      ...
    ]
  }
}
```

**Test Steps:**
1. GET `/api/v4/matches/{matchId}/events`
2. Verify events sorted by minute (ascending)
3. Verify goal events have: player, minute, type
4. Verify substitution events have: player_in, player_out
5. Verify card events have: player, card_type (yellow/red)
6. Verify minute format (e.g., "45", "45+2", "90+5")

**Pass Criteria:** 200, events sorted chronologically, valid event types

---

#### Test 3.4: Get Match Statistics
**Endpoint:** `GET /api/v4/matches/:matchId/statistics`  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "match_id": "...",
    "home_team": {
      "possessionPercent": 58,
      "shots": 18,
      "shots_on_target": 8,
      "passes": 512,
      "pass_accuracy": 87,
      "tackles": 22,
      "fouls": 14,
      "yellow_cards": 2,
      "red_cards": 0
    },
    "away_team": { ... }
  }
}
```

**Test Steps:**
1. GET `/api/v4/matches/{matchId}/statistics`
2. Verify possession_percent is 0-100
3. Verify shots >= shots_on_target
4. Verify pass_accuracy is 0-100
5. Verify statistics reasonable (e.g., not 9999 tackles)

**Pass Criteria:** 200, valid statistics range

---

### Category: ML Hub (3 endpoints)

#### Test 4.1: Get ML Predictions
**Endpoint:** `GET /api/v4/ml/predictions?matchId=...`  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "match_id": "...",
    "home_team": "Manchester City",
    "away_team": "Fulham",
    "predicted_outcome": {
      "home_win_probability": 0.72,
      "draw_probability": 0.18,
      "away_win_probability": 0.10
    },
    "predicted_score": {
      "home_goals": 2.3,
      "away_goals": 0.8
    },
    "model_version": "v4.2.1",
    "confidence": 0.89,
    "generated_at": "2025-12-25T10:00:00Z"
  }
}
```

**Test Steps:**
1. GET `/api/v4/ml/predictions?matchId={matchId}`
2. Verify probabilities sum to 1.0 (or ~1.0)
3. Verify each probability is 0-1
4. Verify predicted_goals are non-negative
5. Verify confidence is 0-1
6. Verify generated_at is recent (within 1 hour)

**Pass Criteria:** 200, valid probabilities, recent timestamp

---

#### Test 4.2: Get ML Hub Metrics
**Endpoint:** `GET /api/v4/ml/hub/metrics`  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "models_count": 5,
    "total_predictions": 12847,
    "accuracy": 0.687,
    "last_trained": "2025-12-20T08:00:00Z",
    "next_training": "2026-01-03T08:00:00Z",
    "active_models": [
      {
        "name": "match_outcome_v4",
        "accuracy": 0.72,
        "predictions_made": 3200
      },
      ...
    ]
  }
}
```

**Test Steps:**
1. GET `/api/v4/ml/hub/metrics`
2. Verify models_count > 0
3. Verify accuracy is 0-1
4. Verify last_trained is valid timestamp
5. Verify active_models non-empty

**Pass Criteria:** 200, valid metrics

---

#### Test 4.3: Get Available Models
**Endpoint:** `GET /api/v4/ml/models`  
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "match_outcome_v4",
      "name": "Match Outcome Predictor",
      "description": "Predicts home win/draw/away win",
      "version": "4.2.1",
      "accuracy": 0.72,
      "last_updated": "2025-12-20"
    },
    ...
  ]
}
```

**Test Steps:**
1. GET `/api/v4/ml/models`
2. Verify non-empty array
3. Verify each model has: id, name, version, accuracy
4. Verify accuracy values reasonable (0-1)

**Pass Criteria:** 200, valid model list

---

### Category: Admin Routes (2 endpoints) — 🔒 PROTECTED

#### Test 5.1: Admin Deduplication Task
**Endpoint:** `POST /api/v4/admin/maintenance/deduplicate`  
**Required Header:** `X-Admin-Key: 2a3e17d67ca8294e928854dfdd0f848e`

**Test 5.1a: Without Key**
```bash
curl -X POST http://localhost:3001/api/v4/admin/maintenance/deduplicate
# Expected Status: 401 Unauthorized
# Expected Response:
{
  "success": false,
  "error": "Unauthorized"
}
```

**Test 5.1b: With Invalid Key**
```bash
curl -X POST -H "X-Admin-Key: wrong-key" http://localhost:3001/api/v4/admin/maintenance/deduplicate
# Expected Status: 401 Unauthorized
```

**Test 5.1c: With Valid Key**
```bash
curl -X POST -H "X-Admin-Key: 2a3e17d67ca8294e928854dfdd0f848e" http://localhost:3001/api/v4/admin/maintenance/deduplicate
# Expected Status: 200 OK
# Expected Response:
{
  "success": true,
  "data": {
    "duplicates_found": 127,
    "records_merged": 127,
    "timestamp": "2025-12-26T15:30:00Z"
  }
}
```

**Test Steps:**
1. Try without header → Verify 401
2. Try with invalid key → Verify 401
3. Try with valid key → Verify 200
4. Verify response contains operation results
5. Check database: verify duplicate records merged

**Pass Criteria:** Proper auth enforcement, operation succeeded

---

#### Test 5.2: Admin XG Rebuild
**Endpoint:** `POST /api/v4/admin/xg/rebuild`  
**Required Header:** `X-Admin-Key: 2a3e17d67ca8294e928854dfdd0f848e`

**Test Steps (same pattern as 5.1):**
1. Verify 401 without key
2. Verify 200 with valid key
3. Verify response shows rebuild progress
4. Verify v4.xg_stats table updated

**Pass Criteria:** Proper auth, rebuild completed successfully

---

## Part 2: Frontend Page Tests

### Test 6: Frontend App Loading
**URL:** `http://localhost:5173`

**Test Steps:**
1. Load homepage
2. Verify no console errors
3. Verify app mounts successfully (from smoke test)
4. Verify main navigation visible
5. Verify no 404s for assets

**Pass Criteria:** Page loads, no errors, navigation visible

---

### Test 7: ML Hub V4 Page
**URL:** `http://localhost:5173/ml` (if routed)

**Test Steps:**
1. Navigate to ML section
2. Verify component renders
3. Verify model cards display
4. Click model selection → Verify state updates
5. Verify predictions displayed (if backend available)

**Pass Criteria:** Page renders, interactions work

---

### Test 8: Button Component Variants
**Note:** This is a design system component test

**Test Steps:**
1. Verify all variants render: primary, secondary, outline
2. Verify all sizes: small, medium, large
3. Verify disabled state (no click)
4. Verify loading state (spinner visible)
5. Verify icon support (icon + text)
6. Verify keyboard focus (Tab key)
7. Verify ARIA attributes

**Pass Criteria:** All variants work, accessibility met

---

### Test 9: Error Boundary Recovery
**Test Steps:**
1. Simulate component error (throw in child)
2. Verify error boundary catches it
3. Verify fallback UI displays
4. Click retry button → Verify recovery

**Pass Criteria:** Error handled gracefully, recovery works

---

## Part 3: Security Tests

### Test 10: SQL Injection Prevention
**Test Case:** Admin XG column name injection

**Attempt:**
```bash
# This would be an injection attempt:
# POST /api/v4/admin/xg/rebuild
# Payload: { xgPersonCol: "'; DROP TABLE v4.xg_stats; --" }
```

**Expected Result:** Request rejected with validation error
**Actual Result:** ✅ PASS (allowlist guard in AdminServiceV4.js)

---

### Test 11: Cross-Site Scripting (XSS)
**Test Case:** Malicious player name in response

**Test Data:**
```json
{
  "player_name": "<img src=x onerror='alert(\"XSS\")'>"
}
```

**Expected:** Response contains escaped data, no alert fires
**Verification:** Check browser console, no script execution

---

### Test 12: Authentication Bypass
**Test Case:** Attempt to call admin endpoint without key

**Expected:** 401 Unauthorized (verified in Test 5.1a)

---

## Part 4: Performance Tests

### Test 13: Response Time Benchmarks
| Endpoint | Expected Time | Actual Time | Status |
|----------|---------------|------------|--------|
| GET /api/v4/leagues | < 200ms | __ ms | ⏳ |
| GET /api/v4/leagues/:id | < 150ms | __ ms | ⏳ |
| GET /api/v4/matches/:id/events | < 300ms | __ ms | ⏳ |
| GET /api/v4/ml/predictions | < 500ms | __ ms | ⏳ |
| GET /api/v4/leagues/:id/season/:year | < 400ms | __ ms | ⏳ |

**Test Tool:**
```bash
for i in {1..10}; do
  time curl -s http://localhost:3001/api/v4/leagues > /dev/null
done
```

---

### Test 14: Load Test (10 Concurrent Requests)
**Tool:** Apache Bench or similar

```bash
ab -n 100 -c 10 http://localhost:3001/api/v4/leagues
```

**Expected:**
- Requests Per Second > 10
- Failed requests: 0
- No timeout errors

---

## Part 5: Database Integrity Tests

### Test 15: Referential Integrity
**Verify Foreign Keys:**
- v4.match_events references v4.matches (valid match_id)
- v4.standings references v4.clubs (valid club_id)
- v4.match_lineups references v4.people (valid player_id)

**SQL Query:**
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM v4.match_events 
WHERE match_id NOT IN (SELECT id FROM v4.matches);
-- Expected: 0
```

---

### Test 16: Data Consistency
**Verify Standings Calculations:**
```sql
SELECT 
  id, 
  (wins * 3 + draws) as calculated_points,
  points
FROM v4.standings
WHERE (wins * 3 + draws) != points;
-- Expected: Empty result (all calculations match)
```

---

## Execution Schedule

### Daily (Automated)
- Unit tests (backend + frontend)
- Linting and formatting checks

### Weekly
- Full integration tests (all endpoints)
- Security audit
- Performance benchmarks

### Before Release
- Full test suite + manual QA
- Regression testing on critical paths
- Security penetration testing

---

## Test Result Documentation

After executing tests, fill in this template:

```markdown
## Test Execution Report — [DATE]

**Executor:** [Your Name]  
**Environment:** [Dev/Staging/Production]  
**Duration:** [Total Time]  

### Summary
- ✅ Passed: [#]
- ❌ Failed: [#]
- ⏭️ Skipped: [#]
- Overall: [PASS/FAIL]

### Failures
[List any failed tests with error messages]

### Notes
[Observations, environment issues, etc.]

### Sign-off
By: [Executor Name]  
Date: [Date]
```

---

## Appendix: cURL Command Reference

### List All Leagues
```bash
curl -s http://localhost:3001/api/v4/leagues | jq
```

### Get League Details
```bash
LEAGUE_ID="550e8400-e29b-41d4-a716-446655440000"
curl -s http://localhost:3001/api/v4/leagues/$LEAGUE_ID | jq
```

### Get Admin Metrics (With Key)
```bash
curl -s -H "X-Admin-Key: 2a3e17d67ca8294e928854dfdd0f848e" \
  http://localhost:3001/api/v4/admin/maintenance/deduplicate \
  -X POST | jq
```

### Test API Availability
```bash
curl -I http://localhost:3001/api/v4/leagues
# Check for 200 OK response
```

---

**Test Plan Version:** 1.0  
**Last Updated:** 2026-04-18  
**Next Review:** 2026-05-18
