# US_28c_V3_FE_POC_Studio_Bar_Chart_Race

## Develop this feature as Frontend Agent - Following the US related:
`US_28c_V3_FE_POC_Studio_Bar_Chart_Race`

Implement the animated Bar Chart Race visualization using D3.js rendered on an HTML Canvas inside the Content Studio.

---

**Role**: Frontend Expert Agent  
**Objective**: Build the "hero" chart type — an animated bar chart race driven by football data.

## 📖 User Story
**As a** Content Creator,  
**I want** to generate a smooth animated bar chart race showing player rankings evolving over seasons,  
**So that** I can create viral TikTok/Reels content like "Top 10 Scorers in La Liga (2010-2024)".

## ✅ Acceptance Criteria

### 1. D3 Bar Chart Race Component
- [ ] **File**: `frontend/src/components/v3/studio/BarChartRace.jsx`
- [ ] **Input Props**:
    - `frames`: Array of frame objects from the API (US_28a response).
    - `format`: `{ width, height }` based on selected ratio.
    - `speed`: Playback speed multiplier.
    - `onReady`: Callback when animation is loaded.

### 2. Visual Design
- [ ] **Background**: Dark gradient (matches V3 design system).
- [ ] **Bars**:
    - Horizontal bars, sorted by value (highest at top).
    - Each bar shows: Player photo (circle), Player name, Team logo (small), Value (number at end of bar).
    - Bar color: Gradient based on team colors or a curated palette.
- [ ] **Year Counter**: Large, centered year display that increments during animation.
- [ ] **Title**: Configurable title at the top (e.g., "Top 10 Goal Scorers — La Liga").
- [ ] **Stat Label**: Shows the stat being tracked (e.g., "Total Goals").

### 3. Animation
- [ ] **Transition**: Smooth bar reordering when rankings change (D3 `transition`).
- [ ] **Duration**: Each frame lasts `1500ms / speed` (adjustable).
- [ ] **Enter/Exit**: New players slide in from bottom, eliminated players fade out.
- [ ] **Value Counter**: Numbers animate (count up effect).

### 4. Rendering
- [ ] **Engine**: D3.js rendering to `<canvas>` (not SVG — needed for video recording).
- [ ] **Alternative**: If Canvas is too complex for D3, use SVG with `html2canvas` conversion for recording.
- [ ] **Resolution**: Render at the exact pixel dimensions of the selected format.

### 5. Playback Controls Integration
- [ ] **Play/Pause**: Toggle animation.
- [ ] **Restart**: Reset to frame 0.
- [ ] **Scrub**: Dragging the timeline jumps to that frame.
- [ ] **Frame Counter**: Show "Frame 5/20" or "2015 / 2024".

## 🛠 Technical Notes
- **Dependencies**: `d3` (v7+). Install via `npm install d3`.
- **Canvas vs SVG**: Canvas is preferred for recording. If using SVG, wrap with `foreignObject` for Canvas export.
- **Performance**: Pre-compute interpolated positions for smooth transitions.
- **Dependency**: Requires `US_28a` (data API) and `US_28b` (page shell).

## 🎨 Visual Reference
```
┌─────────────────────────────────┐
│   Top 10 Scorers — La Liga      │
│                                 │
│ 🔵 L. Messi ████████████ 672   │
│ ⚪ C. Ronaldo █████████ 450     │
│ 🟡 L. Suárez ██████ 198        │
│ 🔴 Griezmann ████ 133          │
│ ...                             │
│                                 │
│          ★ 2019 ★               │
│                                 │
│  ▶️ ⏸ ⏮  ━━━━━━●━━━━━  3/15   │
└─────────────────────────────────┘
```
