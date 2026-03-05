# Task Checklist: V28-ImportOdds

- [x] US-280: Database Schema for Odds
    - [x] Create V3_Odds table in `V3_Baseline.sql`
    - [x] Apply migration to development database
- [x] US-281: Backend Import Service
    - [x] Implement `OddsService.js` with API-Football integration
    - [x] Optimize fetching by league and season
    - [x] Validate with real API key and mock data
- [x] US-282: API Endpoints
    - [x] Implement `OddsController.js` and `odds_routes.js`
    - [x] Register routes in `v3_routes.js`
    - [x] Update Swagger documentation
- [x] US-283: Frontend ML Hub UI
    - [x] Update navigation (V3Layout and Navbar)
    - [x] Extend API service in `api.js`
    - [x] Create `MLOddsPage.jsx` component
- [x] Final Verification & Delivery
    - [x] Create `walkthrough.md`
    - [x] Notify User

- [x] V28 Extension: ML Hub Refactoring
    - [x] Refactor all modules (Orchestrator, Simulation, Betting, Odds) for DS V3
    - [x] Implement Premium Control Bar
    - [x] Run Bulk Odds Catchup Script
    - [x] Final Verification & Commits
