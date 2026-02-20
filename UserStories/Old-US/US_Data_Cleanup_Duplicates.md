# User Story: Global Statistics Cleanup & Consolidation

**ID**: US-DB-002  
**Title**: Clean up and Deduplicate Player Statistics  
**Role**: Database / Backend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User looking at player profiles,  
**I want** to see accurate, unique statistics for each season and competition,  
**So that** I don't see inflated or confusing duplicate data (e.g., Alisson Becker showing two Premier League entries for the same year).

---

## 🎨 Context & Problem
The system currently has duplicate records in `V2_player_statistics`. This is often caused by:
1. **Duplicate Competitions**: Multiple entries in `V2_competitions` representing the same league (e.g., "Premier League" with ID 30 and ID 48997).
2. **Import Redundancy**: The import logic might have inserted stats under different competition/club references that represent the same entity.

Example found:
- Alisson Becker (ID 13082) has duplicate Premier League entries for almost every season (e.g., Season 2024: 28 matches in ID 30, 28 matches in ID 48997).

---

## ✅ Acceptance Criteria

### 1. Data Audit & Identification
- [ ] **Scan for Duplicate Competitions**: Find competitions with the same name or same `api_id`.
- [ ] **Scan for Duplicate Statistics**: Identify `V2_player_statistics` records where the same `player_id`, `season`, and `club_id` have multiple entries in competitions that are semantically identical.

### 2. Implementation of Cleanup Logic
- [ ] **Merge Duplicate Competitions**: 
    - Pick one "Master" competition (preferably the one with the most data or lowest ID/original ID).
    - Update all foreign keys in `V2_player_statistics`, `V2_player_trophies`, etc., to point to the Master.
    - Delete the duplicate competition records.
- [ ] **Merge/Deduplicate Statistics**:
    - After merging competitions, if a player has two stats for the same (Player, Club, Competition, Season), compare them.
    - Keep the one with the higher number of `matches_played` or more complete data.
    - Delete the redundant record.

### 3. Verification
- [ ] **Confirm Fix**: Check Alisson Becker (13082) and ensure he only has ONE Premier League entry per season.
- [ ] **Performance**: Ensure the database has a Unique Constraint on `(player_id, club_id, competition_id, season)` if possible, to prevent this in the future.

---

## 🛠 Technical Notes
- **Scripts**: You may want to use a dedicated script (similar to `cleanup_db.js`) to perform this in a transaction.
- **Reference**: Check the `V2_competitions` table for name overlaps.
- **Warning**: Be careful with "Manual" vs "API" competitions. Always prefer the record linked to a valid `api_id`.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Data_Cleanup_Duplicates.md`
