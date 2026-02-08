# User Story: Backend Data Categorization & Aggregation

**ID**: US-BE-001  
**Title**: Categorize Player Statistics by Competition Type & Team Level  
**Role**: Backend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User analyzing player careers,  
**I want** player statistics to be clearly grouped by competition type (League, Cup, International) and team category (Club vs National Team, Senior vs U23),  
**So that** I can easily distinguish their performance across different contexts without manual filtering.

---

## 🎨 Context & Problem
Currently, player statistics might be listed in a flat or chronological list. The user requires a structured breakdown:
1. **Club Context**:
    - **League**: Domestic championships (Premier League, Ligue 1...).
    - **National Cup**: Domestic cups (EFL Cup, Coupe de France...).
    - **International Cup**: Continental competitions (Champions League, Europa League...).
2. **National Team Context**:
    - Stats for National Teams (France, Belgium...).
3. **Age Group Context (New)**:
    - **Under 23**: Any stats where the team name explicitly indicates youth level (U23, U21, U19).

The database already has a `V2_trophy_type` table intended for competition categorization, which should be leveraged.

---

## ✅ Acceptance Criteria

### 1. Implement "Under 23" Categorization Logic
- [ ] **Logic**: Before categorizing by competition, check the **Team/Club Name**.
- [ ] **Condition**: If the team name contains "U23", "U21", "U19", or similar variations (e.g., "Arsenal U21"), move this entry to a dedicated **"Under 23"** bucket.
- [ ] **Priority**: This overrides the competition type (e.g., a PL2 match goes to "Under 23", not "League").

### 2. Implement Competition Categorization
For all non-U23 entries, categorize based on the `competition`'s `trophy_type` or metadata:
- [ ] **League Details**:
    - Competitions identified as "Domestic League" (e.g., Premier League, La Liga).
- [ ] **National Cup Details**:
    - Competitions identified as "Domestic Cup" (e.g., FA Cup, Copa del Rey).
- [ ] **International Cup Details**:
    - Competitions identified as "International Club Cup" (e.g., UEFA Champions League, Libertadores).

### 3. Implement National Team Categorization
- [ ] **National Team**:
    - Separate stats where the "Club" context is actually a National Team OR the competition is a National Team tournament (World Cup, Euros).
    - *Note*: Ensure you distinguish between "International Cup" (Club level, like UCL) and "International" (National Team level).

### 4. API Response Structure
- [ ] Update the Player Details endpoint (e.g., `GET /api/players/:id`) to return a grouped structure, for example:
```json
{
  "player": { ... },
  "stats": {
    "leagues": [ ... ],
    "national_cups": [ ... ],
    "international_cups": [ ... ],
    "national_team": [ ... ],
    "under_23": [ ... ]
  }
}
```

---

## 🛠 Technical Notes
- **Database Tables**:
    - `V2_player_statistics`: Source of stats.
    - `V2_competitions`: Source of competition info.
    - `V2_trophy_type`: **Key for categorization**. You may need to verify existing values or seed missing types.
    - `V2_clubs`: Check `club_name` for the U23 logic.
- **Handling Ambiguity**:
    - If a `trophy_type` is missing, default to "League" or a generic "Other" but log a warning.
    - You made need to check `V2_competitions.country_id` or similar to distinguish Domestic vs International if `trophy_type` is insufficient.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Backend_Data_Categorization.md`
