# US_28e_V3_FE_POC_Studio_Video_Export

## Develop this feature as Frontend Agent - Following the US related:
`US_28e_V3_FE_POC_Studio_Video_Export`

Implement the video recording and export system using the browser's MediaRecorder API.

---

**Role**: Frontend Expert Agent  
**Objective**: Allow users to record their animated chart as a downloadable video file.

## 📖 User Story
**As a** Content Creator,  
**I want** to click "Record" and get a downloadable video file of my animated chart,  
**So that** I can upload it to TikTok, Instagram, YouTube, or Twitter.

## ✅ Acceptance Criteria

### 1. Recording Engine
- [ ] **File**: `frontend/src/components/v3/studio/VideoRecorder.jsx` (or utility hook `useVideoRecorder.js`).
- [ ] **Technology**: `MediaRecorder API` capturing a `<canvas>` stream via `canvas.captureStream()`.
- [ ] **Format**: WebM (natively supported by MediaRecorder).
- [ ] **Quality**: Target 30fps, high bitrate for crisp visuals.

### 2. Recording Workflow
- [ ] **Step 1**: User clicks "🎬 Record & Download".
- [ ] **Step 2**: System auto-resets the animation to frame 0.
- [ ] **Step 3**: Animation plays at configured speed while MediaRecorder captures.
- [ ] **Step 4**: When animation completes, recording stops automatically.
- [ ] **Step 5**: File is created as a `Blob`, converted to a downloadable URL.
- [ ] **Step 6**: Browser triggers download with filename format:
    - `bar_race_goals_laliga_2010-2024_9x16.webm`
- [ ] **Recording Indicator**: Red dot pulsing in the corner of the canvas during recording.

### 3. Generated Files Table
- [ ] **Storage**: Files stored in browser memory (IndexedDB or in-state array of Blob URLs).
- [ ] **Table Columns**:
    - File Name (descriptive, auto-generated).
    - Format (9:16, 16:9, 1:1).
    - Duration (computed from frame count × speed).
    - Size (KB/MB).
    - Created At (timestamp).
    - Actions: `⬇️ Download`, `🗑️ Delete`.
- [ ] **Limit**: Warn user if more than 5 files are stored (browser memory limit).

### 4. Multi-Format Quick Export
- [ ] **Feature**: "Export All Formats" button.
- [ ] **Logic**: Automatically records the same animation 3 times at different resolutions:
    - 1080×1920 (9:16)
    - 1280×720 (16:9)
    - 1080×1080 (1:1)
- [ ] **Result**: 3 files appear in the table simultaneously.

## 🛠 Technical Notes
- **Browser Support**: MediaRecorder API works in Chrome, Firefox, Edge. Safari support is limited.
- **WebM vs MP4**: MediaRecorder outputs WebM. For MP4 conversion, consider `FFmpeg.wasm` as a future enhancement.
- **Canvas Requirement**: The chart MUST render to `<canvas>` (not SVG) for `captureStream()` to work.
- **Dependency**: Requires at least one chart component (US_28c) to be functional.

## 🔮 Future Enhancements
- MP4 conversion via `FFmpeg.wasm` (client-side).
- Platform upload checkboxes (TikTok API, Instagram Graph API, YouTube Data API).
- Thumbnail auto-generation (snapshot of the final frame).
