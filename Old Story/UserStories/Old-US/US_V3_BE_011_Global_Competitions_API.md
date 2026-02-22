# US-V3-BE-011: International & National Team Ingestion (Backend)

**Role**: Backend Expert Agent  
**Objective**: Expand the V3 import engine to support global club tournaments and national team competitions.

## 📖 User Story
**As a** System Administrator,  
**I want** to import data for the Champions League, World Cup, and other international tournaments,  
**So that** players' career histories are complete with both domestic and international achievements.

## ✅ Acceptance Criteria

### 1. Metadata Filter Expansion
- [ ] **Endpoint**: Update or wrap `GET /api/v3/countries`.
- [ ] **Logic**: Ensure that entries like "World", "Europe", "South America", "Africa", "Asia", and "Oceania" are available in the response. 
    - *Note*: These are used by API-Football as "Country" names for international competitions.

### 2. Team Ingestion Refinement
- [ ] **Schema Update**: Add a column `is_national_team` (BOOLEAN, Default 0) to the `V3_Teams` table.
- [ ] **Ingestion Logic**: 
    - When importing a league/cup from a region like "World" or where the competition is marked as a National Team type:
    - Detect if the team being imported is a National Team (API-Football usually indicates this).
    - Set `is_national_team = 1` in `V3_Teams`.

### 3. Competition & Statistics
- [ ] Ensure `V3_Player_Stats` correctly links these international competition entries to the players.
- [ ] Handle **Tournament Stages**: Some international cups (Euro, World Cup) have complex round names. Ensure the `V3_Fixtures` ingestion handles these stages (Group Stage, Round of 16, etc.) without modification.

---

## 🛠 Technical Notes
- **API Filter**: Call `/leagues` with `country=World` to get the Champions League, Europa League, Club World Cup, etc.
- **Deduplication**: National teams (like "France") should be unique in `V3_Teams` across multiple tournaments (Euro 2020, World Cup 2022).
