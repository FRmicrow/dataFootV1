# US_28_D_V3_FE_Studio_Wizard_Step4_Export

## Develop this feature as Frontend Agent - Following the US related:
`US_28_D_V3_FE_Studio_Wizard_Step4_Export`

Build Step 4 of the Studio Wizard: The Export Manager.

---

**Role**: Frontend Expert Agent  
**Objective**: Record the canvas animation and download the video file.

## 📖 User Story
**As a** Studio User,  
**I want** to record my animation cleanly and download the video file,  
**So that** I can upload it to social media.

## ✅ Acceptance Criteria

### 1. Recording Workflow
- [ ] **Auto-Reset**: When "Start Recording" is clicked:
    1.  Reset animation to Frame 0.
    2.  Wait 500ms (buffer).
    3.  Start `MediaRecorder`.
    4.  Play animation.
- [ ] **Auto-Stop**:
    1.  Detect when animation reaches last frame.
    2.  Stop `MediaRecorder`.
    3.  Generate Blob.

### 2. Download Manager
- [ ] **Result Card**: Show "Recording Complete" with file size and duration.
- [ ] **Preview**: Small video player to review the capture.
- [ ] **Download Button**: "Download .webm".
- [ ] **Filename**: Auto-generate: `bar_race_goals_2010-2024.webm`.

### 3. Format Handling
- [ ] **Resolution**: Ensure the recorded video matches the selected format (e.g. 1080x1920).
- [ ] **Quality**: Set MediaRecorder bitrate high (5 Mbps+).

## 🛠 Technical Notes
- **API**: `MediaRecorder` with `canvas.captureStream()`.
- **Browser**: Chrome/Firefox native support.
