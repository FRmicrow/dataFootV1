# US_28_C_V3_FE_Studio_Chart_Renderer

## Develop this feature as Frontend Agent - Following the US related:
`US_28_C_V3_FE_Studio_Chart_Renderer`

Build the D3.js Rendering Engine that consumes the standardized Data Contract.

---

**Role**: Senior Frontend D3 Developer  
**Objective**: Build a pure rendering component that takes `data` + `visualConfig` and draws the frame on a Canvas.

## 📖 Rendering Contract

### 1. The Component Interface
```jsx
<StudioChart 
  data={config.data}       // The standardized timeline array
  visual={config.visual}   // { type, format, speed, theme }
  isPlaying={boolean}      // Controls the loop
  onFrame={fn}             // Callback for recorder (optional)
  width={1080}
  height={1920}
/>
```

### 2. D3 Architecture (The Core)
- **Separation**:
    - `setup()`: Creates scales, axes, context. Called once (or on resize).
    - `drawFrame(t)`: Clears canvas, draws state at time `t`. Called 60fps.
- **Interpolation Strategy**:
    - Data is "Bucketized" by year (e.g., 2010, 2011).
    - Animation interpolates between Year A and Year B.
    - `t` represents "Year + progress" (e.g., 2010.5 = halfway between 2010 and 2011).
    - Use `d3.interpolate` for bar positions, widths, and numbers.

### 3. Chart Types Implemented
- **Bar Chart Race**:
    - Sorts data by value per frame.
    - Smoothly transitions Y-positions (re-ranking).
    - Animates X-width (value change).
- **Line Evolution** (if time permits/selected):
    - Progressive stroke drawing.

## ✅ Acceptance Criteria
1.  **Pure Function**: The chart drawing logic must NOT effect external state. It strictly renders inputs.
2.  **Canvas-Based**: Must use `<canvas>` (via `d3-selection` context) to support high-res video export.
3.  **Smoothness**:
    - No jumping.
    - Interpolation between years must be continuous (`d3.easeCubicInOut`).
4.  **Responsive**: Respects the `format` ratio (9:16, etc).
5.  **Robustness**: Handle missing data points gracefully (e.g., player exits ranking).

## 🛠 Technical Notes
- **D3 Modules**: `d3-scale`, `d3-interpolation`, `d3-ease`, `d3-timer`, `d3-format`.
- **Canvas Font**: Use a standard bold font that looks good on video (e.g., 'Inter', 'Roboto').
