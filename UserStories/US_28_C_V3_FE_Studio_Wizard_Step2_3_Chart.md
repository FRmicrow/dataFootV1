# US_28_C_V3_FE_Studio_Wizard_Step2_3_Chart

## Develop this feature as Frontend Agent - Following the US related:
`US_28_C_V3_FE_Studio_Wizard_Step2_3_Chart`

Build Step 2 (Config) and Step 3 (Preview) of the Studio Wizard.

---

**Role**: Frontend Expert Agent  
**Objective**: Configure the visual style and render the animated chart using D3.

## 📖 User Story
**As a** Studio User,  
**I want** to choose my chart type and see a smooth animation preview,  
**So that** I can fine-tune the aesthetics before exporting.

## ✅ Acceptance Criteria

### 1. Step 2: Visual Configuration
- [ ] **Chart Type**: "Bar Chart Race", "Line Evolution", "Radar".
- [ ] **Theme**: "V3 Dark" (Default), "Light", "Neon".
- [ ] **Speed**: Slider (0.5x to 3x).
- [ ] **Format**: "9:16 (TikTok)", "1:1 (Square)", "16:9 (Landscape)".

### 2. Step 3: Interactive Preview
- [ ] **Canvas Rendering**: Use D3 to render on `<canvas>`.
    - **Why Canvas?** Essential for high-performance video recording in Step 4.
- [ ] **Animation Engine**:
    - **Bar Race**: Smooth interpolation of Y-position and Bar Width.
    - **Line**: Progressive stroke drawing.
    - **Radar**: Area expansion.
- [ ] **Controls**: Play / Pause / Replay / Scrubber.
- [ ] **Key Feature**: The animation must look EXACTLY as it will be exported.

### 3. D3 Implementation Details
- [ ] **Interpolation**: Use `d3.easeCubic` for all movements.
- [ ] **Ticker**: Use `d3.timer` to drive the animation loop.
- [ ] **Responsiveness**: Canvas must update dimensions based on "Format" selection.

## 🛠 Technical Notes
- **Dependencies**: `d3`.
- **Performance**: Pre-calculate interpolation frames if dataset is large (>1000 points).
