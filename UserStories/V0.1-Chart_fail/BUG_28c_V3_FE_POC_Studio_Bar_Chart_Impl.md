# BUG_28c_V3_FE_POC_Studio_Bar_Chart_Impl

## Develop this feature as Frontend Agent - Following the US related:
`BUG_28c_V3_FE_POC_Studio_Bar_Chart_Impl`

Implement the Bar Chart Race visualization consuming the corrected Backend API data.

---

**Role**: Frontend Expert Agent  
**Objective**: Build the Bar Chart Race component using D3.js, ensuring it consumes the real V3 data structure and handles smooth animations.

## 🐛 Bug Fix / Refinement
Previous specs mocked the data. This implementation must strictly use the JSON structure returned by `BUG_28a_V3_BE_POC_Studio_Data_Flow_Fix`.

## ✅ Acceptance Criteria

### 1. Data Consumption
- [ ] **Input Props**: `data` object from API.
- [ ] **Frame Structure**:
    ```json
    "frames": [
      {
        "year": 2010,
        "data": [
          { "player_id": 2982, "name": "L. Messi", "team_logo": "...", "cumulative": 234 }
        ]
      }
    ]
    ```
- [ ] **Logic**:
    - Use `cumulative` field for Bar Length and Ranking.
    - If `cumulative` is missing (e.g. single season), use `value`.

### 2. D3 Rendering & Animation
- [ ] **Canvas Context**: Render to the `<canvas>` provided by the parent `ContentStudioV3` (via Ref).
- [ ] **Key Function**: Identify lines by `player_id` (not index) to ensure bars track the correct player when they swap positions.
- [ ] **Interpolation**:
    - **Position (y)**: Smoothly interpolate 'y' coordinate between rankings.
    - **Width (x)**: Smoothly interpolate bar width based on value.
    - **Color**: Maintain stable color per player (hash function on `player_id` or `team_name`).
- [ ] **Smoothness (from IMPROVEMENT_28c)**:
    - Duration: `1500ms / speed` per frame.
    - Ease: `d3.easeCubicInOut`.
    - Ticker: Use `d3.ticker` or `requestAnimationFrame`.

### 3. Visual Details
- [ ] **Bar**: Rounded rect. Gradient fill.
- [ ] **Labels**:
    - **Left**: Player Name + Team Logo (small circle).
    - **Right**: Animated Number Counter (interpolated int).
- [ ] **Ticker Group**: Large Year display in the background or corner (e.g., "2010").

## 🛠 Technical Notes
- **File**: `frontend/src/components/v3/studio/charts/BarChartRace.jsx`
- **Method**: `drawFrame(ctx, frameData, t)` where `t` is interpolation factor (0..1) between CurrentFrame and NextFrame.
- **Optimization**: Use a Map for player positions to calculate target Y coordinates efficiently.
