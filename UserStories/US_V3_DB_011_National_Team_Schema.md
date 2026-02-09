# US-V3-DB-011: National Team Schema Extension

**Role**: Database Expert Agent  
**Objective**: Prepare the V3 schema to differentiate between club teams and national teams.

## 📖 User Story
**As a** Database Administrator,  
**I want** to track whether a team is a club or a national representative,  
**So that** the frontend can filter and display statistics separately (e.g., "International Career" vs "Club Career").

## ✅ Acceptance Criteria

### 1. Table Alteration
- [x] **Table**: `V3_Teams`
- [x] **Action**: Add column `is_national_team` (BOOLEAN).
- [x] **Default**: 0 (Club).

### 2. Constraints & Data Integrity
- [x] Ensure that a National Team API ID (e.g., France = 2) does not conflict with a Club API ID (though API-Football usually keeps these separate).
- [x] Add an index on `V3_Teams(is_national_team)` for fast filtering in the player profile pages.

---

## 🛠 Technical Notes
- Use a safe `ALTER TABLE` migration script.
- Update `DATABASE_SCHEMA_V3.md` to reflect this new column and its purpose.
