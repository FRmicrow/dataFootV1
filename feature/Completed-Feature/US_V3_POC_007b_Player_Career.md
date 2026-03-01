# US-V3-POC-007b: V3 Player Profile & Career History

**ID**: US-V3-POC-007b  
**Title**: POC: Detailed Player Profiles and Categorized Career Stats  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Scout or Fan,  
**I want** to access a complete profile for any player in the V3 system,  
**So that** I can trace their career progression across different seasons and competition types.

---

## ✅ Acceptance Criteria

### 1. High-End Profile Header
- [ ] Create `/v3/player/:id` page.
- [ ] **UI**: Premium Hero section with Player Photo, Name, Nationality (Flag), Age, Height, Weight, and Preferred Foot.

### 2. Categorized Career Stats
- [ ] **Backend**: Create `GET /api/v3/player/:id` returning full history from `V3_Player_Stats`.
- [ ] **Aggregation Logic**:
    - Group by **Season** (Year).
    - Sub-group by **Competition Category** (Domestic League, National Cup, International Cup, etc.).
- [ ] **Table Columns**: [Season | Team | Competition | Matches | Goals | Assists | Yellow/Red | Rating].

### 3. Career Links
- [ ] **Integration**: Ensure every player name in the League Overview, Leaderboards, and Squad Lists is a clickable link leading to this profile.

---

## 🛠 Technical Notes
- **V3 Category Logic**: Map `V3_Leagues.type` or `V3_Leagues.category` (if available in your V3 schema) to the buckets: League, Cup, International.
- **Data Integrity**: Handle players who played for multiple clubs in one season (show both rows).
- **Consistency**: Maintain the same design tokens and "Sport-Tech" aesthetic as the League pages.
