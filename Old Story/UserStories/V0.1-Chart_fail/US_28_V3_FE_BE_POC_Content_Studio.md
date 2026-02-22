# US_28_V3_FE_BE_POC_Content_Studio

## Develop this feature as Frontend + Backend Agent - Following the US related:
`US_28_V3_FE_BE_POC_Content_Studio`

Build a "Content Studio" page inside the V3 app to generate animated football data visualizations (bar chart races, etc.) for social media, using D3.js + Canvas + MediaRecorder.

---

**Role**: Full Stack Agent (Frontend-heavy)  
**Objective**: Create a Content Studio that generates animated chart videos from V3 football data.

## 📖 User Story
**As a** Content Creator,  
**I want** to generate animated data visualizations (bar chart races, line evolutions, radar comparisons) from my imported football data,  
**So that** I can create engaging social media content for TikTok, Instagram Reels, YouTube Shorts, and Twitter/X.

## ✅ Acceptance Criteria

### 1. Page Layout (`/v3/studio`)
- [ ] **Header**: "Content Studio" with V3 branding.
- [ ] **3 Zones**:
    - **Left Panel**: Chart Configuration Form.
    - **Center Panel**: Live Preview Canvas (the animated chart).
    - **Right Panel**: Export Controls & Generated Files Table.

### 2. Chart Configuration Form (Left Panel)
- [ ] **Chart Type Selector**:
    - `Bar Chart Race` (animated ranking over years).
    - `Line Evolution` (stat progression over time).
    - `Radar Comparison` (multi-stat player vs player).
    - `Ranking Table` (animated top N per season).
- [ ] **Data Selector** (dynamic based on chart type):
    - **Bar Chart Race**:
        - Stat: Goals, Assists, Appearances, Rating.
        - Scope: League (dropdown), Country (dropdown), or "All Data".
        - Year Range: Start Year → End Year (sliders).
        - Top N: Number of items to display (5, 10, 15, 20).
    - **Line Evolution**:
        - Players: Multi-select (autocomplete from DB).
        - Stat: Goals, Assists, Rating (single select).
        - Year Range: Start → End.
    - **Radar Comparison**:
        - Player A vs Player B (autocomplete).
        - Season: Single year or career average.
        - Stats: Auto-selected (Goals, Assists, Passes, Tackles, Dribbles, Shots).
- [ ] **Format Selector**:
    - Platform presets:
        - 📱 TikTok / Reels / Shorts: 1080×1920 (9:16)
        - 🖥️ Twitter/X Landscape: 1280×720 (16:9)
        - 📷 Instagram Square: 1080×1080 (1:1)
- [ ] **Speed Control**: Slider (0.5x → 3x) for animation speed.
- [ ] **"Generate Preview" Button**.

### 3. Live Preview Canvas (Center Panel)
- [ ] **Technology**: D3.js rendering into an HTML `<canvas>` element.
- [ ] **Animation**: Smooth transitions between years/data points.
- [ ] **Controls**: Play, Pause, Restart, Scrub timeline.
- [ ] **Responsive**: Canvas resizes to match selected format (9:16, 16:9, 1:1) while fitting in the preview area.

### 4. Export Controls (Right Panel)
- [ ] **"Record & Download" Button**:
    - Uses `MediaRecorder API` to capture the canvas as WebM.
    - Auto-converts to MP4 if possible (via `FFmpeg.wasm` or download as WebM).
    - Downloads the file with a descriptive name: `bar_race_goals_laliga_2010-2024_9x16.mp4`.
- [ ] **Generated Files Table**:
    - Columns: File Name, Format, Duration, Created At, Actions.
    - Actions: Download, Delete.
    - (Future: Platform checkboxes for upload — placeholder for now).

### 5. Backend: Data Aggregation Endpoint
- [ ] **Endpoint**: `GET /api/v3/studio/data`
- [ ] **Query Params**:
    - `chart_type`: `bar_race`, `line_evolution`, `radar`.
    - `stat`: `goals`, `assists`, `appearances`, `rating`.
    - `scope`: `league:1`, `country:France`, `all`.
    - `year_start`, `year_end`.
    - `players`: comma-separated player IDs (for line/radar).
    - `top_n`: limit.
- [ ] **Response** (example for bar_race):
    ```json
    {
      "type": "bar_race",
      "frames": [
        {
          "year": 2010,
          "data": [
            { "name": "L. Messi", "photo": "...", "team_logo": "...", "value": 34 },
            { "name": "C. Ronaldo", "photo": "...", "team_logo": "...", "value": 26 }
          ]
        },
        {
          "year": 2011,
          "data": [ ... ]
        }
      ]
    }
    ```
- [ ] **Logic**: Aggregate `V3_Player_Stats` by year, compute cumulative or per-season stats, sort and limit.

### 6. Navigation
- [ ] Add "🎬 Content Studio" link in the V3 sidebar/header navigation.
- [ ] Route: `/v3/studio`.

## 🛠 Technical Stack
- **Animation Engine**: D3.js (v7+)
- **Rendering**: HTML Canvas (`<canvas>` element)
- **Video Capture**: MediaRecorder API (browser-native)
- **Video Format**: WebM (native) → MP4 conversion via FFmpeg.wasm (optional enhancement)
- **Framework**: React (inside existing V3 app)

## 📐 Platform Dimension Presets
| Platform | Ratio | Resolution | Max Duration |
|---|---|---|---|
| TikTok / Reels / Shorts | 9:16 | 1080×1920 | 60-90 sec |
| Twitter/X Landscape | 16:9 | 1280×720 | 2 min 20 sec |
| Instagram Square | 1:1 | 1080×1080 | 60 sec |

## 🔮 Future Enhancements (Not in scope for v1)
- Branding overlay (logo, watermark, custom fonts/colors).
- Multi-platform upload via APIs (TikTok, Instagram Graph API, YouTube Data API).
- Template system ("Save this config as a template").
- Scheduled generation (auto-generate after each import).
