📂 Created User Stories (/UserStories/V7-LiveBet/)

Feature Name: Live Bet Intelligence Engine
Version: V7
Global Feature Type: New Capability
Scope: Full Stack / Data

---

US_130: Live Monitoring League Selector
Feature Type: UX Overhaul
Role: Frontend Developer
Goal: Provide a centralized console for users to toggle granular "Active Analysis" for specific leagues to optimize server resources and focus on high-priority matches.
Core Task: Build an interactive league selection interface with global "Live" state toggles, integrated with the backend synchronization system.
Functional Requirements:
- Display a grid/list of all supported leagues with their logos and names.
- Provide a "Status" toggle (Active/Inactive) for Live Monitoring.
- Support "Bulk Actions" (Enable All Elite, Disable All).
- Visual indicator showing how many matches are "Live Now" in each league.
- Real-time search/filter by league name or country.
- Persistent state saved to the database.
- Fallback UI if the Odds API is disconnected.
Technical Requirements:
- New API endpoint `PUT /api/v3/leagues/:id/toggle-monitoring`.
- Database field `is_live_enabled` (boolean, default false) in `V3_Leagues`.
- Real-time UI updates using local state management (React Context or similar).
- Throttle API calls for bulk toggles to prevent DB lock.
Acceptance Criteria:
- User can toggle monitoring for a league and see immediate UI feedback.
- Toggle state persists after page refresh.
- Bulk "Enable Elite" correctly activates Top 5 European leagues.
- "Live Now" count matches the current active fixtures from the database/API.
- UI remains responsive during search across 100+ leagues.

---

US_131: Odds & Live Probability Ingestion
Feature Type: New Capability
Role: Backend Developer
Goal: Establish a reliable pipeline for real-time odds and match event data to feed the intelligence engine.
Core Task: Develop a background worker service that polls the Odds API and Match Event API for "Live Enabled" leagues.
Functional Requirements:
- Fetch live scores, possession, shots, and cards.
- Fetch real-time 1X2 and Over/Under odds.
- Synchronize data every 60 seconds for active matches.
- Stop polling for leagues where monitoring is disabled.
Technical Requirements:
- Integration with Sportmonks/Betfair API.
- Rate-limiting logic to stay within API tier limits.
- Upsert logic for `MatchLiveState` table.
- Error handling for API downtime (exponential backoff).
Acceptance Criteria:
- Backend successfully fetches and stores live data for enabled leagues.
- No orphan live records for disabled leagues.
- Logs show successful sync cycles within the 60s window.

---

US_132: Real-time Pressure & Momentum Algorithm
Feature Type: Architecture Upgrade
Role: Data Engineer
Goal: Calculate a proprietary "Momentum Score" (0-100) based on live match events.
Core Task: Implement a calculator service that processes incoming live events and updates a momentum metric.
Technical Requirements:
- Logic: `(Shots * 5) + (Corners * 3) + (DangerousAttacks * 2) - OpponentValue`.
- Update frequency: Every event ingestion.
Acceptance Criteria:
- Momentum score reflects the actual visual pressure of a team in a match.
- Score is recalculated and stored in under 500ms post-ingestion.

---

US_133: Live Bet Intelligence Dashboard
Feature Type: UX Improvement
Role: Frontend Developer
Goal: Display high-value live opportunities based on momentum and odds discrepancies.
Core Task: Create a "Live Board" with real-time updates of all active matches in monitored leagues.
Functional Requirements:
- Detailed Momentum charts (sparklines).
- Logic-based "Hot Tips" (e.g., "Home Pressure High - Goal Likely").
- Integrated Odds display.
Acceptance Criteria:
- Dashboard updates without full page reload.
- High-momentum matches are visually highlighted.

---

US_172: Intelligence Hub Cockpit
Feature Type: UX Overhaul
Role: Frontend Developer
Goal: Institutional-grade visualization of probability overlays, confidence metrics, and detected edges.
Core Task: Develop a sophisticated probability visualization layer for match details and dashboard to present ML insights with professional clarity.
Functional Requirements:
- Visual overlays for Win/Draw/Loss probabilities (1X2).
- Edge detection indicators (Market Odds vs. ML Probability).
- Confidence meters for prediction accuracy based on historical model performance.
- Interactive momentum/pressure charts integrated with odds shifting.
- Coloring system for "Value Bets" based on configurable thresholds.
Technical Requirements:
- Real-time state management for streaming ML probabilities.
- Dynamic SVG/Canvas drawing for momentum/odds correlation charts.
- Integration with `mlService.js` for fetching prediction certainty.
Acceptance Criteria:
- Probabilities are displayed with clear visual hierarchy.
- "Edges" are clearly highlighted when discrepancy > 5%.
- Confidence metrics are shown alongside every prediction.
- Charts remain performant during rapid live event updates.

---

US_173: Transparency & Responsible Layer
Feature Type: Strategy / Compliance
Role: Product Owner
Goal: Implementation of logic-explainer tooltips and risk disclaimers for all ML outputs to ensure user trust and regulatory compliance.
Core Task: Add an educational and legal layer to all predictive components in the UI.
Functional Requirements:
- "Why this prediction?" tooltips explaining the top 3 contributing features (e.g., "High xG last 15 mins").
- Permanent risk disclaimers on all prediction-related screens ("Past performance does not guarantee future results").
- Clear distinction between "Historical Facts" and "ML Predictions".
- Links to detailed documentation on the Momentum Score logic.
Technical Requirements:
- Centralized `ComplianceDisclaimer` component.
- API support for "Reasoning Meta" in prediction responses.
Acceptance Criteria:
- Tooltips are accessible and explain the 'Why' behind model output.
- Disclaimers are visible on all relevant dashboard and detail views.
- Interface distinguishes predictive data from historical data via branding or labeling.

---

🔍 Audit & Assumptions
- Current system lacks a dedicated "Live State" table; one must be created (`V3_MatchLive`).
- Assumption: The Odds API provider remains stable and provides accurate IDs.
- Assumption: ML models are served via a low-latency API (Uvicorn/FastAPI detected).
- Risk: Over-reliance on "Edge Detection" without proper disclaimer may lead to UX frustration.
- Dependency: League IDs must be consistent between Stats and Odds providers.
- Technical Debt: Need to ensure ML service response times stay under 200ms for live ingestion.

🎨 UX & Product Strategy
- This feature transforms StatFoot from a research-only platform into a real-time betting companion.
- Strategy: Focus on "Signal vs Noise." The Monitoring Selector is critical to help users filter out low-value matches.
- Institutional Branding: By adding the Intelligence Hub Cockpit, the app appeals to professional/semi-pro analysts.
- Trust as a feature: The Transparency & Responsible layer builds long-term user retention and protects the brand from "get rich quick" perceptions.
- Future Value: Foundation for "Live Alerts" (Push notifications/Webhooks).

🛠 Hand-off Instruction for the Team
BE AGENT:
- Add `is_live_enabled` to `V3_Leagues`.
- Implement `PUT /api/v3/leagues/monitoring`.
- Update ML integration to include "Feature Importance" for transparency logic.
- Setup a cron job for Live Syncing.
FE AGENT:
- Build the League Selector using the established V3 Glassmorphism aesthetic.
- Implement the "Cockpit" overlays with high-density stats and probability bars.
- Integrate tooltips and disclaimers using a reusable `InsightWrapper` component.
- Add a dedicated "Betting Labs" or "Live Hub" menu item.
DATA AGENT:
- Refine the Momentum Score calculation.
- Ensure the Mock Odds simulation supports "Edge Detection" testing.
