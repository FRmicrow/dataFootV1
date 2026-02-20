# US-V3-POC-009: Team Squad Visualization Upgrade

**ID**: US-V3-POC-009  
**Title**: POC: Position-Grouped Squads and Compact Player Cards  
**Role**: Frontend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User looking at a team's roster,  
**I want** the players organized by their role on the pitch and sorted by their activity level,  
**So that** I can quickly understand the team's hierarchy and key players.

---

## ✅ Acceptance Criteria

### 1. Position-Based Grouping
- [ ] **Categories**: Divide the squad display into four distinct visual sections:
    1. **Goalkeepers**
    2. **Defenders**
    3. **Midfielders**
    4. **Attackers**
- [ ] **Sorting**: Within each section, sort players by **Matches Played** (or Minutes) DESC.

### 2. Compact Player Cards
- [ ] **Design**: Create a "Mini-Card" component that provides a high-density, professional look.
- [ ] **Card Content**:
    - Player Portrait (Circular).
    - Name (Bold).
    - **Activity Bar**: Small visual indicator of Matches/Minutes.
    - **Key Metrics**: 
        - For ATK: Goals/Assists.
        - For GK: Rating/Clean Sheets.
        - For others: Rating/Appearances.
- [ ] **Interactivity**: The entire card is a link to the player's V3 profile.

### 3. Responsive Grid
- [ ] Ensure the grid adapts from 4 columns (Desktop) to 1 column (Mobile) while maintaining the position grouping.

---

## 🛠 Technical Notes
- **Data Source**: Use the squad data from `V3_Player_Stats` linked to the specific `team_id` and `season`.
