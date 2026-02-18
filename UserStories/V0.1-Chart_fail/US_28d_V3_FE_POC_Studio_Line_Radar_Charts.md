# US_28d_V3_FE_POC_Studio_Line_Radar_Charts

## Develop this feature as Frontend Agent - Following the US related:
`US_28d_V3_FE_POC_Studio_Line_Radar_Charts`

Implement Line Evolution and Radar Comparison chart types for the Content Studio.

---

**Role**: Frontend Expert Agent  
**Objective**: Build the secondary chart types for broader content variety.

## 📖 User Story
**As a** Content Creator,  
**I want** to generate animated line charts (player stat evolution) and radar charts (player comparisons),  
**So that** I can diversify my social media content beyond bar chart races.

## ✅ Acceptance Criteria

### 1. Line Evolution Component
- [ ] **File**: `frontend/src/components/v3/studio/LineEvolution.jsx`
- [ ] **Visual**:
    - X-axis: Years (season_year).
    - Y-axis: Stat value (goals, assists, etc.).
    - One colored line per player.
    - Player photo + name label at the end of each line.
- [ ] **Animation**:
    - Lines draw progressively from left to right (year by year).
    - Each point "pops" with a circle indicator.
    - Current year counter displayed.
- [ ] **Use Case**: "Messi vs Ronaldo — Goals per Season (2009-2024)".

### 2. Radar Comparison Component
- [ ] **File**: `frontend/src/components/v3/studio/RadarComparison.jsx`
- [ ] **Visual**:
    - Hexagonal radar chart with 6 axes.
    - Axes: Goals, Assists, Key Passes, Tackles, Dribbles, Shots on Target.
    - Two overlapping colored areas (Player A vs Player B).
    - Player photos + names displayed on each side.
- [ ] **Animation**:
    - Radar areas "grow" from center outward.
    - Each stat axis fills sequentially for dramatic effect.
    - Final state: both players visible for comparison.
- [ ] **Use Case**: "Messi vs Haaland — Season 2023/24 Comparison".

### 3. Integration
- [ ] Both components accept the same props pattern as `BarChartRace`:
    - `frames` or `data`: From API response.
    - `format`: `{ width, height }`.
    - `speed`: Playback multiplier.
- [ ] Both integrate with the playback controls (Play, Pause, Restart, Scrub).

## 🛠 Technical Notes
- **Dependencies**: D3.js (already installed from US_28c).
- **Rendering**: Same Canvas approach as bar chart race.
- **Dependency**: Requires `US_28a` (data API) and `US_28b` (page shell).
- **Priority**: Lower than US_28c. Can be delivered as a v2 enhancement.
