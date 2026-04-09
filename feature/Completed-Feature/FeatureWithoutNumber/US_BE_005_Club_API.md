# US-BE-005: Club Deep-Data API

**Role**: Backend Expert Agent  
**Objective**: Deliver a comprehensive club data structure.

## 📖 User Story
**As a** Backend Developer,  
**I want** to consolidate and optimize club-related endpoints,  
**So that** the frontend can render rich club profiles with minimal requests.

## ✅ Acceptance Criteria
1. **Rich Metadata**: Update `GET /api/team/:id` to join with `V2_countries` and `V2_club_trophies`. include a summary of "Total Trophies" count.
2. **Season Squad Stats**: Endpoint `GET /api/team/:id/season/:year` must:
    - Return the list of all players who have at least 1 stat record for that club/season.
    - Include their aggregated stats across *all* competitions for that club in that year.
3. **Smart Sorting**: Default the squad list to be sorted by Position (GK -> DEF -> MID -> FWD) then by Matches Played.
4. **Efficiency**: Use a single optimized query or controlled parallel execution to gather info (Club Info + Trophies + Available Seasons).
