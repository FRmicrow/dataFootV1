# US_28_D_V3_FE_Studio_Export_Manager

## Develop this feature as Frontend Agent - Following the US related:
`US_28_D_V3_FE_Studio_Export_Manager`

Build the Export Manager that drives the Rendering Engine to produce a video file.

---

**Role**: Frontend Expert Agent  
**Objective**: Record the canvas output and trigger a download.

## 📖 Export Contract

### 1. The Workflow
The Export Manager does not "screen record". It **drives** the animation.
1.  **Lock**: Disable user interaction.
2.  **Reset**: Set Chart Time `t = start_year`.
3.  **Start Stream**: `canvas.captureStream(30)`.
4.  **Record**: `mediaSampler.start()`.
5.  **Play**: Advance `t` from `start` to `end` at 1x speed.
6.  **Stop**: When `t >= end_year`, stop recorder.
7.  **Download**: Blob -> URL -> `<a>` click.

### 2. UI Components (Step 4)
- **Preview Player**: Shows the captured Blob (once recorded).
- **Meta Info**: Duration, Resolution, File Size.
- **Action Buttons**: "Download .webm", "Discard/Retry".

## ✅ Acceptance Criteria
1.  **Auto-Reset**: Recording MUST always start from the first frame.
2.  **Completion**: Recording MUST stop exactly when the animation finishes.
3.  **Quality**:
    - Resolution must match the config (e.g. 1080x1920).
    - Bitrate should be high enough for text readability (5 Mbps+).
4.  **Filename**: Descriptive name: `v3_bar_race_goals_2015-2024.webm`.

## 🛠 Technical Notes
- **API**: `MediaRecorder`.
- **Browser Support**: Chrome/Firefox/Edge.
- **Warning**: Safari `MediaRecorder` support is spotty; ensure fallback or warning message.
