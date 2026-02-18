# US_28_B_V3_FE_Studio_Wizard_Interface

## Develop this feature as Frontend Agent - Following the US related:
`US_28_B_V3_FE_Studio_Wizard_Interface`

Build the Studio Wizard Step 1 & 2 that strictly manipulates the Configuration Object.

---

**Role**: Frontend Expert Agent  
**Objective**: Create the UI to build the `filters` and `visual` configuration objects defined in the contract.

## 📖 Interface Contract

### 1. State Structure (The "Truth")
The entire wizard is driven by this React state:
```javascript
const [config, setConfig] = useState({
  filters: {
    stat: null,
    scope: { leagues: [], years: [2015, 2024] },
    selection: { mode: "top_n", value: 10, players: [] }
  },
  visual: {
    type: "bar_race",
    theme: "v3_dark",
    format: "9:16",
    speed: 1.0
  },
  data: null // Populated after Step 1 fetch
});
```

### 2. Step 1: Data Source (Query Builder)
- **Goal**: Populate `config.filters` and fetch `config.data`.
- **UI Components**:
    - **Stat Dropdown**: Fetch from endpoint.
    - **Timeline Slider**: Min/Max years.
    - **Scope Filter**: "By League" or "By Country" -> Multi-select dropdown.
    - **Player Selection**: Radio (Top N / Manual).
- **Action**: "Next" button calls `POST /api/v3/studio/query`.
    - If success: `setConfig(prev => ({ ...prev, data: response }))` and move to Step 2.
    - If error: Show toast.

### 3. Step 2: visual Configuration
- **Goal**: Populate `config.visual`.
- **UI Components**:
    - **Chart Type**: Cards (Bar Race, Line, Radar).
    - **Format**: Buttons (9:16, 1:1, 16:9).
    - **Theme**: Dropdown.
    - **Speed**: Slider.

## ✅ Acceptance Criteria
1.  **State Isolation**: Step 1 component only updates `filters`. Step 2 component only updates `visual`.
2.  **Validation**: "Next" button disabled if strict criteria aren't met (e.g., no stat selected, or range start > end).
3.  **Data Fetch**: The API response must be stored exactly as received in `config.data` (matching the Backend Contract).
4.  **Mock Mode**: If API is unavailable, providing a fallback mock JSON for dev testing is allowed (but final goal is real data).

## 🛠 Design Requirements
- Use **V3 Context** if needed to share state between steps.
- Dark mode UI with clear validation feedback.
