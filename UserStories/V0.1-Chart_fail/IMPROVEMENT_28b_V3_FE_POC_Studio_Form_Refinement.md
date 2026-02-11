# IMPROVEMENT_28b_V3_FE_POC_Studio_Form_Refinement

## Develop this feature as Frontend Agent - Following the US related:
`IMPROVEMENT_28b_V3_FE_POC_Studio_Form_Refinement`

Refine the Studio configuration form to support conditional dropdowns and dual player selection modes.

---

**Role**: Frontend Expert Agent  
**Objective**: Fix the form UX to match the improved filtering and selection logic.

## 📖 Improvements Needed

### 1. Dynamic Stat Selector
❌ **Wrong**: Hardcoded stat options.  
✅ **Correct**: Fetch from `GET /api/v3/studio/stats` and populate dynamically.

- [ ] On page load, call `/api/v3/studio/stats`.
- [ ] Render dropdown with real DB column names and labels.

### 2. Scope Filter (Checkbox + Conditional Dropdowns)
❌ **Wrong**: Single "Scope" dropdown with "All Data" option.  
✅ **Correct**: Two checkboxes that reveal dropdowns.

#### New Layout:
```
Filters:
☐ Specific Leagues
    [Disabled dropdown until checked]
☐ Specific Countries  
    [Disabled dropdown until checked]
```

- [ ] **Checkbox: "Filter by League"**:
    - When checked → dropdown appears with all imported leagues (from `GET /api/v3/leagues/imported`).
    - Multi-select enabled (use a library like `react-select` or custom checkboxes).
- [ ] **Checkbox: "Filter by Country"**:
    - When checked → dropdown appears with all countries (from `GET /api/v3/countries`).
    - Multi-select enabled.
- [ ] **Validation**: At least one filter must be active before "Generate" button is enabled.

### 3. Player Selection Mode (Top N vs Manual)
❌ **Wrong**: Only "Top N" slider.  
✅ **Correct**: Toggle between two modes.

#### New Layout:
```
Player Selection:
⚪ Top N Players (by selected stat)
   [Slider: 5 ━━━●━━ 20]

⚪ Manual Selection
   [Multi-select autocomplete: "Search players..."]
```

- [ ] **Radio button toggle**: `Top N` or `Manual Selection`.
- [ ] **Top N mode**: Show the slider (5-20). Backend sorts by stat DESC.
- [ ] **Manual mode**: Show autocomplete field (reuse from `/api/v3/search?type=player`). Selected players appear as chips below the input.
- [ ] **Logic**: If Manual is selected, `top_n` is ignored in the API call. Pass `players=2982,6898,...` instead.

### 4. Year Range Labels
- [ ] Add labels showing the selected range: `"2010 → 2024 (15 years)"`.
- [ ] Validate that `year_start < year_end`.
