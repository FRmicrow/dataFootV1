# US_28b_V3_FE_POC_Studio_Page_Layout

## Develop this feature as Frontend Agent - Following the US related:
`US_28b_V3_FE_POC_Studio_Page_Layout`

Build the Content Studio page shell with the configuration form, preview area, and export panel. No chart rendering yet — this is the layout foundation.

---

**Role**: Frontend Expert Agent  
**Objective**: Create the Studio page structure and configuration form.

## 📖 User Story
**As a** User,  
**I want** a clean studio interface where I can configure chart parameters,  
**So that** I can set up my visualization before generating it.

## ✅ Acceptance Criteria

### 1. Page Shell (`/v3/studio`)
- [ ] **File**: `frontend/src/components/v3/ContentStudioV3.jsx`
- [ ] **CSS**: `frontend/src/components/v3/ContentStudioV3.css`
- [ ] **Route**: Add `/v3/studio` to the router in `App.jsx`.
- [ ] **Navigation**: Add "🎬 Content Studio" link in the V3 sidebar/header.

### 2. Layout (3-Column)
```
┌──────────────┬──────────────────────┬─────────────────┐
│  LEFT PANEL  │    CENTER PANEL      │   RIGHT PANEL   │
│  Config Form │    Preview Canvas    │   Export Zone    │
│  (350px)     │    (flex-grow)       │   (300px)       │
└──────────────┴──────────────────────┴─────────────────┘
```

### 3. Left Panel: Configuration Form
- [ ] **Chart Type Selector**: Pill buttons or dropdown.
    - Options: `Bar Chart Race`, `Line Evolution`, `Radar Comparison`.
- [ ] **Dynamic Fields** (change based on chart type):
    - **Bar Chart Race**:
        - Stat: Dropdown (`Goals`, `Assists`, `Appearances`, `Rating`).
        - Scope: Dropdown (`All Data`, specific League, specific Country).
        - Year Range: Two number inputs (Start, End).
        - Top N: Slider (5, 10, 15, 20).
    - **Line Evolution**:
        - Players: Multi-select with autocomplete (search from DB).
        - Stat: Single dropdown.
        - Year Range: Start → End.
    - **Radar Comparison**:
        - Player A: Autocomplete.
        - Player B: Autocomplete.
        - Season: Year dropdown.
- [ ] **Format Selector**: Radio buttons with visual previews.
    - 📱 Vertical (9:16) — TikTok / Reels / Shorts
    - 🖥️ Horizontal (16:9) — Twitter/X
    - 📷 Square (1:1) — Instagram Feed
- [ ] **Speed Control**: Range slider (0.5x → 3x).
- [ ] **"Generate Preview" Button**: Primary CTA, calls the backend API and triggers rendering in the center panel.

### 4. Center Panel: Preview Area
- [ ] **Placeholder**: Show a dark placeholder with text "Configure and generate your visualization" until the user clicks "Generate".
- [ ] **Canvas Container**: A `<div>` that will host the D3 canvas (implemented in US_28c).
- [ ] **Playback Controls** (disabled until a chart is generated):
    - ▶️ Play, ⏸ Pause, ⏮ Restart.
    - Timeline scrubber bar.
- [ ] **Aspect Ratio Preview**: Container adapts to the selected format ratio.

### 5. Right Panel: Export Zone
- [ ] **"Record & Download" Button**: Disabled until a chart is generated (implemented in US_28e).
- [ ] **Generated Files Table**: Empty state "No files generated yet".
    - Columns: File Name, Format, Duration, Actions (Download, Delete).
    - Files stored in browser memory (no backend storage for now).

### 6. Styling
- [ ] Same V3 dark design system (dark cards, gradients, glass effects).
- [ ] Responsive: On smaller screens, stack panels vertically.

## 🛠 Technical Notes
- **State Management**: Use React `useState` for form state. Pass config to center panel via props.
- **Player Autocomplete**: Reuse the search endpoint from US_27 (`GET /api/v3/search?q=...&type=player`).
- **No D3 dependency yet**: This US only builds the shell. D3 charts come in US_28c and US_28d.
