# Lessons

## 2026-03-17
- When ML-Hub needs to stay decoupled from the rest of the app, do not merge multiple unrelated frontend sources (`catalog`, `risk analysis`, `live-bet`) to reconstruct one screen. Define a backend-owned contract keyed by `league_id`, `season_year`, and `fixture_id`, then let the frontend consume that single contract.
- For coverage, do not infer “modeled leagues” from completed simulations. Keep a backend-owned V36 allowlist and expose per-market flags from that contract, then enrich it with actual persisted outputs per fixture.
- Do not key ML-Hub coverage off hardcoded internal `league_id` values. Resolve covered competitions from stable identifiers such as `api_id` plus normalized-name fallbacks, then return the runtime internal `leagueId`.
- If Docker mounts only `backend/src`, the running container can drift away from the repo root metadata (`package.json`, tests, scripts). Mount the full backend directory and preserve `/app/node_modules` as a volume.
- Make schema migrations resilient to fresh and partially migrated databases. In this case, `20260315_02_AddForgeResultsMultiMarket.js` must be able to create and upgrade `V3_Forge_Results`, not assume a prior migration already created it.
- When host calls and in-container calls disagree on the same backend endpoint, treat the in-container check as the source of truth first and document the host-port anomaly separately as an environment issue.
