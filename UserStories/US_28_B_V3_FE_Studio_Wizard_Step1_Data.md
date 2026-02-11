# US_28_B_V3_FE_Studio_Wizard_Step1_Data

## Develop this feature as Frontend Agent - Following the US related:
`US_28_B_V3_FE_Studio_Wizard_Step1_Data`

Build Step 1 of the Studio Wizard: The Data Selection Form.

---

**Role**: Frontend Expert Agent  
**Objective**: Create a clean, validated form to define the data source.

## 📖 User Story
**As a** Studio User,  
**I want** to select the exact data scope (Stat, League, Player set) via a guided form,  
**So that** I ensure the data is relevant before I start visualizing it.

## ✅ Acceptance Criteria

### 1. Wizard Layout Shell
- [ ] **Component**: `v3/studio/StudioWizard.jsx`
- [ ] **Steps Indicator**: `1. Data` -> `2. Chart` -> `3. Preview` -> `4. Export`.
- [ ] **Navigation**: "Next" button disabled until current step is valid.

### 2. Step 1 Form Fields
- [ ] **Stat Selector**: Dropdown populated by `/api/v3/studio/meta/stats`.
- [ ] **Scope Filter**:
    - **Radio**: "By League" OR "By Country".
    - **Dynamic Dropdown**: Multi-select Leagues or Countries based on radio selection.
- [ ] **Time Range**:
    - Range Slider or Two Inputs (Start Year / End Year).
    - Validation: Start <= End.
- [ ] **Player Selection**:
    - **Radio**: "Top N Players" OR "Specific Players".
    - **Top N**: Slider (5 to 20).
    - **Specific**: Autocomplete Search (calls `/meta/players`).

### 3. Data Fetching Action
- [ ] **Action**: When clicking "Next":
    - Call `POST /api/v3/studio/query`.
    - Store response in Wizard State (`wizardData`).
    - Only proceed to Step 2 if API call succeeds.
- [ ] **Error Handling**: Show toast if query returns 0 results.

## 🛠 Technical Notes
- **State Management**: Use a parent `StudioContext` or prop drilling to hold the wizard state.
- **Design**: Use V3 Dark Theme (cards, glassmorphism) to feel premium.
