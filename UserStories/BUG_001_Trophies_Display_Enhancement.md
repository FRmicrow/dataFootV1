# BUG_001_Trophies_Display_Enhancement

## 1. Issue Description
**Severity**: High (Blocking UI Task)
**Component**: `PlayerProfilePageV3.jsx` / Trophies Module

The current implementation or User Story (US_30) is ambiguous regarding non-winner trophies. The frontend agent is unsure how to handle "2nd Place" or "3rd Place" entries.
**Requirement Update**: We MUST display not just winners, but also podium finishes, clearly differentiated by color.

## 2. Updated Requirements

### 2.1 Color Coding Strategy
The visual representation of the "Place" badge must adapt based on the data:

| Place / Rank | Color Name | Hex Code | CSS Class (Suggested) |
| :--- | :--- | :--- | :--- |
| **Winner**, **1st Place**, **Champion** | **Gold** | `#FFD700` or `#EAB308` | `.trophy-gold` |
| **2nd Place**, **Runner-up**, **Finalist** | **Silver** | `#C0C0C0` or `#94A3B8` | `.trophy-silver` |
| **3rd Place** | **Bronze** | `#CD7F32` or `#B45309` | `.trophy-bronze` |

### 2.2 implementation Logic
In the `groupedTrophies` processing function:
1.  **Do NOT filter out** non-winners. Keep all records.
2.  **Map the `place` string** to of the 3 categories above.
    -   *Regex/Logic tip*: 
        -   Winner: `/Winner|1st|Champion/i`
        -   Silver: `/2nd|Runner-up|Finalist/i`
        -   Bronze: `/3rd/i`
3.  **Sort Order**:
    -   Primary Sort: **Importance/Rank** (Champions League > Domestic).
    -   Secondary Sort: **Place** (Gold > Silver > Bronze).
    -   Tertiary Sort: **Year** (Newest first).

### 2.3 Visual Output (Example)
The "Honours" card should look like:
-   [Gold Dot/Icon] **UEFA Champions League** (2022)
-   [Gold Dot/Icon] **La Liga** (2023)
-   [Silver Dot/Icon] **Copa America** (2021) - *2nd Place*

## 3. Action Items for Frontend Agent
1.  Update the `groupTrophies` function to accept "2nd" and "3rd" place places.
2.  Create a helper function `getTrophyColor(place)` that returns the appropriate color class/hex.
3.  Update the rendering loop to apply these styles dynamically.
4.  (Optional) Add a tooltip or small text label for non-winners (e.g., "Finalist") if the user hovers the silver/bronze badge.

## 4. Verification Check
-   **Go to**: `/v3/player/517` (Raphinha)
-   **Verify**: 
    -   Wins are Gold.
    -   Podium finishes (if any exist in DB) are Silver/Bronze.
