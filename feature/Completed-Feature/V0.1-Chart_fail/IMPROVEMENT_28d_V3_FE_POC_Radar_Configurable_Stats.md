# IMPROVEMENT_28d_V3_FE_POC_Radar_Configurable_Stats

## Develop this feature as Frontend Agent - Following the US related:
`IMPROVEMENT_28d_V3_FE_POC_Radar_Configurable_Stats`

Allow users to configure which stats appear on the radar chart axes.

---

**Role**: Frontend Expert Agent  
**Objective**: Make radar charts fully customizable instead of using a fixed 6-stat configuration.

## 📖 Improvements Needed

### 1. Configurable Radar Axes
❌ **Wrong**: Hardcoded 6 stats (Goals, Assists, Passes, Tackles, Dribbles, Shots).  
✅ **Correct**: User selects which stats to compare.

#### New Form Section (Radar Chart Type):
```
Radar Comparison Stats (select 3-8):
☑️ Goals
☑️ Assists
☑️ Key Passes
☐ Tackles
☑️ Successful Dribbles
☑️ Shots on Target
☐ Yellow Cards
☐ Average Rating
```

- [ ] **Multi-select checkboxes**: Populated from `GET /api/v3/studio/stats`.
- [ ] **Validation**: 
    - Minimum 3 stats selected (radar needs at least 3 axes).
    - Maximum 8 stats (more than that becomes unreadable).
- [ ] **Default**: Pre-select a "recommended" set (Goals, Assists, Key Passes, Tackles, Dribbles, Shots).

### 2. Dynamic Radar Rendering
- [ ] **Axes Count**: Radar should dynamically generate N axes based on selected stats.
- [ ] **Label Positioning**: Adjust angle between axes: `360° / N`.
- [ ] **Scaling**: Each axis scale should be independent (max value from the dataset for that stat).
    - Example: Goals max = 50, Assists max = 20. Each axis goes from 0 to its own max.

### 3. Visual Clarity
- [ ] **Stat Labels**: Display full stat name outside the radar perimeter.
- [ ] **Value Labels**: Show exact values when hovering over a radar point.
- [ ] **Color Coding**: Player A = Blue gradient, Player B = Red gradient.
