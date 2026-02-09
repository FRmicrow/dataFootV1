# US-DB-004: Performance Optimization & Views

**Role**: Database Expert Agent  
**Objective**: Prepare the database for complex analytical queries.

## 📖 User Story
**As a** DBA,  
**I want** to create optimized structures for aggregating player statistics,  
**So that** the new dashboard pages load instantly despite the massive stat rows.

## ✅ Acceptance Criteria
1. **Aggregation Views**:
    - Create a VIEW `vw_club_season_stats` that pre-calculates SUM(goals), SUM(assists), etc. grouped by (club_id, competition_id, season).
2. **Indexing**:
    - Verify/Add index on `V2_player_statistics(season, competition_id)`.
    - Verify/Add index on `V2_club_trophies(competition_id, year)`.
3. **Constraint Integrity**:
    - Ensure that every `trophy_winner` reference in the database points to a valid `club_id` in `V2_clubs`.
4. **Documentation**: Update `DATABASE_SCHEMA.md` with descriptions of the new views.
