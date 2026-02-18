# BUG_28d_V3_FE_POC_Studio_Other_Charts_Impl

## Develop this feature as Frontend Agent - Following the US related:
`BUG_28d_V3_FE_POC_Studio_Other_Charts_Impl`

Implement the Line Evolution and Radar Comparison charts consuming the corrected Backend API data.

---

**Role**: Frontend Expert Agent  
**Objective**: Build secondary charts using the real V3 data schema.

## 🐛 Bug Fix / Refinement
Ensure these charts work with the dynamic stats and no-mock philosophy.

## ✅ Acceptance Criteria

### 1. Line Evolution Chart
- [ ] **Data Source**: `chart_type="line_evolution"` response from API.
- [ ] **Structure**: Array of players, each with `data: [{ year, value }]`.
- [ ] **Visual**:
    - Multi-line chart (one color per player).
    - **Animation**: Lines draw progressively from left to right.
    - **X-Axis**: Years (Season Year).
    - **Y-Axis**: Stat Value (Dynamic domain based on max value).
- [ ] **Smoothness**: Use `stroke-dashoffset` interpolation.

### 2. Radar Comparison Chart
- [ ] **Data Source**: `chart_type="radar"` response.
- [ ] **Structure**: Array of players, each with `stats: { "goals": 10, "assists": 5 ... }`.
- [ ] **Configurable Axes**:
    - Receive `radar_stats` list from the form config.
    - Generate axes dynamically based on these keys.
- [ ] **Normalization**:
    - For each axis, find the Global Max value across all compared players.
    - Scale values 0..1 based on that max (so the chart fits).
- [ ] **Animation**:
    - Areas grow/expand from center `(scale 0 -> 1)` OR draw radially `(angle 0 -> 360)`.
    - Use `d3.easeBackOut`.

### 3. Canvas Rendering
- [ ] Both components reuse the Studio's Canvas Ref.
- [ ] Must handle the `format` prop (Aspect Ratio) to scale text/elements appropriately (e.g., larger fonts on Mobile 9:16).

## 🛠 Technical Notes
- **File**: `frontend/src/components/v3/studio/charts/LineEvolution.jsx`
- **File**: `frontend/src/components/v3/studio/charts/RadarComparison.jsx`
- **Common Helper**: Create `frontend/src/utils/d3CanvasUtils.js` for drawing text/shapes on Canvas to share code.
