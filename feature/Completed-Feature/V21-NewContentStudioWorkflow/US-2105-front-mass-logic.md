# US-2105: Frontend - Configuration & Wizard Logic for Mass Mode

**Role**: Frontend Engineer  
**Objective**: Handle visual configurations and wizard routing specific to Mass Generation.

## Tasks
- In `Step2_Config`, if `isMassGeneration` is ON:
    - Display all 3 formats (9:16, 1:1, 16:9) as selected (lock them).
    - Lock the Speed parameter at X1.
- In `StudioWizard`, modify the navigation logic to skip `Step3_Preview` and go directly to `Step4_Export` when `isMassGeneration` is ON.

## Technical Requirements
- Visual feedback in `Step2_Config` that options are locked for production efficiency.
- Seamless transition from Step 2 to Step 4.

## Acceptance Criteria
- [ ] In Mass Mode, Step 2 correctly shows locked/multi-selected formats.
- [ ] Clicking "Next" in Step 2 navigates directly to Step 4.
- [ ] The "Previous" button in Step 4 returns to Step 2.
