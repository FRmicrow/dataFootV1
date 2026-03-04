# US-2106: Frontend - Mass Production & Progress Tracking

**Role**: Frontend Engineer / QA Engineer  
**Objective**: Implement the production dashboard in Step 4 to track mass video generation.

## Tasks
- Implement the "Production Table" in `Step4_Export`.
- Display a list of all videos to be generated (Years x 3 Formats).
- Add the "Generate & Upload" button.
- Integrate with the backend `POST /api/v3/studio/mass-generate` API.
- Implement a polling mechanism to fetch progress from `GET /api/v3/studio/mass-status`.

## Technical Requirements
- Status icons: 
    - ⏳ (sandglass) for "Processing" or "Pending".
    - ✅ (green tick) for "Success".
    - ❌ (red cross) for "Failed".
- Loader overlay or progress bar for the overall session.
- Prevent navigating away while production is in progress without confirmation.

## Acceptance Criteria
- [ ] Table lists all planned assets with correct titles (`<Chart><Year>-<Type>-<Format>`).
- [ ] Status updates in real-time (or near real-time) reflecting backend progress.
- [ ] Errors are displayed clearly in the table if a specific asset fails.
- [ ] "Finish" button appears once the entire batch is completed.
