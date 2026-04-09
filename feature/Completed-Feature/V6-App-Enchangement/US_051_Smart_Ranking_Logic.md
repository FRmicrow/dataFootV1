# US_051: Smart Ranking Logic & Automated Tagging

**Role: Backend / Data Engineer**

## User Story
**As a** Data Engineer  
**I want** to implement a "Smart Ranking" engine  
**So that** new and existing leagues are automatically prioritized according to their competitive status.

## Acceptance Criteria
- **Given** a league from the API  
- **When** the system calculates its `importance_rank`  
- **Then** it must apply the following hierarchy:
    - **Domestic Leagues**: Tier 1 = 1, Tier 2 = 2, Tier 3+ = 3.
    - **Domestic Cups**: Main National Cup = 1, Secondary Cups = 2.
    - **International Club**: UCL = 1, UEL = 2, UECL = 3 (similarly for other continents).
    - **International National**: World Cup = 1, Euro/Copa America = 1, Secondary international = 2.
- **Given** the initial data migration  
- **When** the script runs  
- **Then** it must apply these rules to all currently imported leagues.
- **Given** a new league discovery during import  
- **When** it is saved to the DB  
- **Then** the rank must be automatically inferred from API-provided metadata (e.g., `league.type`, name matching, competition level).

## Functional Notes
- Ranking logic should prioritize the "Standard" version of a league over "Qualifications" or "Playoffs" (e.g., Premier League = 1, but PL playoffs = 2).

## Technical Notes
- Implement a helper utility `CompetitionRanker` in the backend services.
- Use pattern matching on league names (e.g., contains "Champions League", "Premier", "1. Division") combined with `V3_Countries.importance_rank`.
- Ensure the logic is idempotent and can be re-run to "Re-calculate" ranks if rules change.
