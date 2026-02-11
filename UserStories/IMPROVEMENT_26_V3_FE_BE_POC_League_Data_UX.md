# IMPROVEMENT_26_V3_FE_BE_POC_League_Data_UX

## Develop this feature as Frontend + Backend Agent - Following the US related:
`IMPROVEMENT_26_V3_FE_BE_POC_League_Data_UX`

Improve the "League Data" page by sorting cards by country rank, adding a League/Cup badge, and making entire cards clickable.

---

**Role**: Frontend + Backend Expert Agent  
**Objective**: Enhance the League Data page for better UX and clarity.

## 📖 User Story
**As a** User,  
**I want** the League Data page to be sorted by country importance, clearly distinguish leagues from cups, and allow me to click anywhere on a card to navigate,  
**So that** I can find and access league data faster and more intuitively.

## ✅ Acceptance Criteria

### 1. Backend: Sorting by Country Rank
- [ ] **Endpoint**: `GET /api/v3/leagues/imported`
- [ ] **Modification**: JOIN with `V3_Countries` to include `importance_rank`.
- [ ] **Sort**: `ORDER BY c.importance_rank ASC, l.name ASC`.
- [ ] **Response**: Include `country_rank`, `league_type` in the response payload.

### 2. Frontend: Country Rank Sorting
- [ ] **Component**: The "League Data" card grid.
- [ ] **Logic**: Cards are sorted by `country_rank` (ascending). Leagues from France appear before England, England before Spain, etc.
- [ ] **Visual Grouping** (optional): Add a subtle country header or flag separator between country groups.

### 3. Frontend: League / Cup Badge
- [ ] **Badge**: Small pill badge on each league card.
    - `League` → 🏆 Green badge.
    - `Cup` → 🥇 Amber/Gold badge.
- [ ] **Position**: Top-right corner of the card, or next to the league name.

### 4. Frontend: Full Card Clickable
- [ ] **Current**: Only the "View" button is clickable.
- [ ] **Fix**: Wrap the entire card in a `<Link>` or add an `onClick` handler that navigates to the league season page.
- [ ] **UX**: Add a subtle hover effect (scale + shadow) to indicate clickability.

## 🛠 Technical Notes
- **Files**:
    - `backend/src/controllers/v3/importControllerV3.js` (or wherever `/leagues/imported` is handled)
    - `frontend/src/components/v3/ImportV3Page.jsx` or the "League Data" component
- **Dependency**: Requires `IMPROVEMENT_26_V3_DB_POC_Country_Rank_Sync` to be completed first.
