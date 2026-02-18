# US-V3-FE-011: Global Competition Import UI (Frontend)

**Role**: Frontend Expert Agent  
**Objective**: Update the Import V3 interface to handle regions and international tournament selection.

## 📖 User Story
**As a** User,  
**I want** to easily find international competitions (UCL, Euros) by selecting "World" or "Europe" in the country list,  
**So that** I don't have to guess where global tournaments are hidden.

## ✅ Acceptance Criteria

### 1. Enhanced "Region/Country" Dropdown
- [ ] **Update**: The initial dropdown on the `V3/import` page should now include regions.
- [ ] **Ordering**:
    1.  **Top Section**: "World", "Europe", "South America", "North America", "Africa", "Asia".
    2.  **Divider**.
    3.  **Bottom Section**: Standard countries (alphabetical).
- [ ] **Behavior**: Selecting "World" should populate the League dropdown with global tournaments like the FIFA World Cup, Club World Cup, etc.

### 2. Competition Context
- [ ] **Visual Cues**: When a "National Team" competition is selected (e.g., Euro 2024), show a small badge or label "National Team Tournament".
- [ ] **Warning**: If a selected tournament is known to be very large (e.g., "World Cup History"), show a confirmation dialog before starting the batch.

### 3. Queue Management
- [ ] Ensure the "Add to Queue" feature correctly records the league IDs for these international entries and reflects their region name (e.g., "UCL - Europe" instead of showing a missing country name).

---

## 🛠 Technical Notes
- **Region IDs**: Map the string names ("World", "Europe") directly to the API-Football country parameter.
- **Uniformity**: Maintain the standard V3 glassmorphism styling for the new dropdown sections.
