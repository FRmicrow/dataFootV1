# US_186: Bulk Queue System (Backend)

## Mission
Implement a background worker system to handle large-scale historical simulations without blocking the main API.

## Mission Details
1. **Queue Architecture**: Use a simple job-based system (e.g., in-memory or SQLite-backed).
2. **Worker Logic**: Process "Season Replay" requests asynchronously.
3. **Status Tracking**: Provide progress updates (0% - 100%) and logs via the UI.

## Success Criteria
- [ ] Users can trigger a "Replay All Leagues" job.
- [ ] System remains responsive during heavy simulation loads.
