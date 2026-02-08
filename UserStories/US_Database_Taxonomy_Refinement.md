# User Story: Database Taxonomy Alignment (Direct Mapping)

**ID**: US-DB-001  
**Title**: Align V2_competitions with the 5-Tab Taxonomy  
**Role**: Database Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Database Architect,  
**I want** to ensure every competition in the system is assigned a high-accuracy `trophy_type_id`,  
**So that** the Backend can perform the 5-tab sorting without errors.

---

## 🎨 Context & Problem
We have 11 `trophy_type` entries in the DB. The Backend now expects competitions to be mapped strictly to these categories to support 5 UI tabs. 

The current problem is "Orphan" competitions (especially South American and International ones like Copa America or Leagues Cup) having `NULL` trophy types.

---

## ✅ Acceptance Criteria

### 1. Verify/Update Trophy Types
Ensure the following IDs and Names exist in `V2_trophy_type`:
1. `UEFA Club`
2. `UEFA National Team`
3. `FIFA Club`
4. `FIFA National Team`
5. `Continental Club`
6. `Continental National Team`
7. `Domestic League`
8. `Domestic Cup`
9. `Domestic Super Cup`
10. `Domestic League Cup`
11. `Individual Award`

### 2. Batch Update "Orphan" Competitions
Perform a mass update on `V2_competitions` where `trophy_type_id` is NULL. Use the following logical mapping:

| Target Category (ID) | Keyword / Logic |
| :--- | :--- |
| **7 (Domestic League)** | Default for any league format (MLS, Serie A, etc.) |
| **8 (Domestic Cup)** | Any competition containing "Cup", "Taça", "Beker", "Pokal" AND having a `country_id`. |
| **6 (Continental National Team)** | "Copa America", "African Cup of Nations", "Gold Cup", "Qualifiers". |
| **5 (Continental Club)** | "Libertadores", "Sudamericana", "Leagues Cup", "AFC Champions League", "CONCACAF Champions League". |
| **4 (FIFA National Team)** | "World Cup", "Olympics", "Confederations Cup". |

### 3. Manual Fix for High-Value Assets
The following MUST be fixed immediately for common test cases:
- `World Cup - Qualification South America` -> **6**
- `CONMEBOL Copa America` -> **6**
- `Leagues Cup` -> **5**
- `CONCACAF Champions League` -> **5**
- `Olympics Men` -> **4**
- `Friendlies` (where it represents National Team entries) -> **4 or 6**

### 4. Integrity Check
- [ ] No `competition_id` used in `V2_player_statistics` should have a `NULL` `trophy_type_id` after this task.
- [ ] Provide a SQL query result showing the count of competitions per `trophy_type`.

---

## 🛠 Technical Notes
- **Target Table**: `V2_competitions`
- **Validation**: Check competition names carefully. "Champions League" without "UEFA" is often a different continent (ID 5).
