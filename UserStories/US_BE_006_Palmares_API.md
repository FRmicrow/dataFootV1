# US-BE-006: Palmares Mastery API

**Role**: Backend Expert Agent  
**Objective**: Expose clear historical winner data.

## 📖 User Story
**As a** Backend Developer,  
**I want** an endpoint that lists competition winners without nesting them inside club profiles,  
**So that** we can build a global Hall of Fame page.

## ✅ Acceptance Criteria
1. **Winner List Endpoint**: `GET /api/palmares/history/:trophy_id`
    - Returns a list: `[{ year, competition_name, club_id, club_name, club_logo }]`.
    - Join `V2_club_trophies` with `V2_clubs` and `V2_competitions`.
2. **Categorization**: Ensure the list can be filtered via query parameters: `?country_id=X` or `?trophy_type_id=Y`.
3. **Chronological Sorting**: Default the history to sort by Year DESC.
4. **Reliability**: If a club logo is missing, return a placeholder path.
