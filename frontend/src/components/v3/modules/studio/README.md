# Studio Feature Implementation

This directory contains the frontend implementation for the new Studio Wizard (US_28).

## Features Implemented

### 1. Data Selection (Step 1)
- Wizard wizard navigation shell.
- Form to select Statistics, Scope (League/Country), Time Range, and Players.
- **Mock Data Query**: Currently mocks the response from `/api/v3/studio/query`.

### 2. Visual Configuration (Step 2)
- Configuration for Chart Type (Bar Race, Line Evolution, Radar).
- Theme selection (V3 Dark, Light, Neon).
- Animation Speed and Aspect Ratio (9:16, 1:1, 16:9).

### 3. Preview & D3 Rendering (Step 3)
- **Engine**: Custom `ChartCanvas` component using `d3` and HTML5 Canvas.
- **Charts Supported**:
  - **Bar Chart Race**: Fully implemented with dynamic scaling and logic.
  - **Line Evolution**: Implemented with historical data tracking.
  - **Radar**: Basic implementation (Spider chart style).
- **Controls**: Play/Pause, Scrubber (Timeline), Speed control.

### 4. Export (Step 4)
- **MediaRecorder**: logical implementation to capture `<canvas>` stream.
- **Auto-Recording**: Automatically resets animation, records from start to end, and offers `.webm` download.

## Project Structure

- `StudioWizard.jsx`: Main container and state manager (`StudioContext`).
- `Step1Data.jsx`: Data form.
- `Step2Config.jsx`: Visualization settings.
- `Step3Preview.jsx`: Interactive preview with playback controls.
- `Step4Export.jsx`: Recording logic.
- `ChartCanvas.jsx`: Core D3 rendering engine (reused by Preview and Export).

## Next Steps
1. **Backend Integration**: Uncomment the API call in `StudioWizard.jsx` (handleNext) once `POST /api/v3/studio/query` is ready.
2. **Smooth Interpolation**: Improve `ChartCanvas.jsx` to support fractional years (e.g. 2010.5) by interpolating between data points for smoother 60fps animations.
