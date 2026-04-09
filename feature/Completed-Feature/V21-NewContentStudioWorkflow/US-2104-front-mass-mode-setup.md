# US-2104: Frontend - Mass Mode Setup in Step 1

**Role**: Frontend Engineer  
**Objective**: Introduce the "Mass Generation" switch and its impact on the data selection step.

## Tasks
- Add a "Mass Generation" toggle (using `DS-Switch` or similar component) in `Step1_Data`.
- Update the `StudioContext` to track the `isMassGeneration` state.
- Implement logic to disable/hide year selection when `isMassGeneration` is enabled.
- Ensure only "League Standing" and the new "Player Stat Standing" charts are compatible with this mode.

## Technical Requirements
- If `isMassGeneration` is ON, set `filters.years` to `null` or a flag indicating "all available".
- Trigger warnings if an incompatible chart type is selected while Mass Mode is ON.

## Acceptance Criteria
- [ ] Toggle is visible and functional in the UI.
- [ ] Year sliders/dropdowns are correctly disabled when toggle is active.
- [ ] State is correctly persisted across steps.
