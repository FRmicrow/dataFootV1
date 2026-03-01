# US-2102: Backend - Video Rendering Engine

**Role**: Backend Engineer / DevOps  
**Objective**: Implement the headless rendering engine to generate video assets from charts.

## Tasks
- Install necessary dependencies (`puppeteer`, `ffmpeg-static`, etc.).
- Implement a `RenderService` that uses Puppeteer to capture chart frames.
- Integrate `ffmpeg` to encode the captured frames into a `.webm` or `.mp4` video.
- Implement a task queue (simple memory-based for now) to process rendering jobs.

## Technical Requirements
- Support for HD resolutions (1080x1920, 1080x1080, 1920x1080).
- Lock animation speed at X1 for backend rendering.
- Ensure proper cleanup of temporary files/folders after processing.

## Acceptance Criteria
- [ ] A video file can be generated from a URL representing a chart.
- [ ] The quality and framerate (60fps) match the client-side expectations.
- [ ] Multi-thread/concurrency limits are enforced to prevent server overload.
