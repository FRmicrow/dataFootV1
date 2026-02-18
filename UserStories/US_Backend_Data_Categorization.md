# User Story: Backend Data Categorization (Refined 5-Tab System)

**ID**: US-BE-001  
**Title**: Implement Precise 5-Tab Sorting for Player Statistics  
**Role**: Backend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User looking at a player's career,  
**I want** to see their statistics organized into exactly 5 logical tabs,  
**So that** I can easily compare their performance in leagues, domestic cups, international competitions, and national team duties.

---

## 🎨 Context & Problem
The current categorization is inconsistent. We need to move to a strict 5-tab system based on the `trophy_type` defined in the database.

---

## ✅ Acceptance Criteria

### 1. Implementation of the 5-Tab Mapping Logic
Modify the player detail logic (likely in `playerController.js`) to group `V2_player_statistics` into exactly these 5 buckets based on the `competition_type`:

| Tab Name | Required `competition_type` (from `V2_trophy_type`) |
| :--- | :--- |
| **league** | `Domestic League` |
| **national_cup** | `Domestic Cup`, `Domestic Super Cup`, `Domestic League Cup` |
| **international_cup** | `Continental Club`, `UEFA Club`, `FIFA Club` |
| **national_team** | `UEFA National Team`, `FIFA National Team`, `Continental National Team` |
| **trophies** | *Aggregate of both `V2_player_trophies` and `V2_individual_awards`* |

### 2. Under 23 / Youth Fallback (Critical)
- Before applying the tab logic, check the **Club Name** or **Competition Name**.
- If it contains `U23`, `U21`, `U19`, `Reserve`, or `Youth`, these stats should be flagged.
- **Requirement**: Decide with the Frontend agent if these should be a 6th tab or a sub-section. For now, ensure they don't pollute the "Senior" tabs if possible.

### 3. API Response Update
The `GET /api/players/:id` response should return the statistics object with these exact keys:
```json
{
  "player": { ... },
  "stats": {
    "league": [],
    "national_cup": [],
    "international_cup": [],
    "national_team": []
  },
  "palmares": {
    "trophies": [],
    "individual_awards": []
  }
}
```

### 4. Handling Empty Labels
- If a competition has `NULL` for `trophy_type`, DO NOT default it to League. 
- Instead, log the `competition_id` and `competition_name` so the DB agent can fix it.
- **Fallback**: Place in a temporary `uncategorized` bucket so the UI at least shows it exists.

---

## 🛠 Technical Notes
- **Controller**: Update `backend/src/controllers/playerController.js`.
- **Logic**: Use a `switch` statement or an object mapper based on the `stat.competition_type` string returned by the SQL JOIN.
- **Naming**: Ensure "Championship" is renamed to "league" in the JSON response.
