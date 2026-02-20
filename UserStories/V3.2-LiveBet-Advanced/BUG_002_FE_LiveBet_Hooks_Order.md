# BUG_002 - [FE] React Hooks Order Violation in LiveBetMatchDetails

## Title
[FE] Fix "Rendered more hooks than during the previous render" in LiveBetMatchDetails

## Issue Description
**Severity**: High (Component crashes and fails to render)
**Component**: `frontend/src/components/v3/live-bet/LiveBetMatchDetails.jsx`

During the addition of the "Save Odds" feature (US_016), a React Hooks Rules violation was introduced. A `useState` hook (`saveState`) and its handler (`handleSaveOdds`) were declared at the bottom of the component, **after** several conditional early returns (`if (loading) return...`, `if (error) return...`).

When the component's state changes (e.g., loading finishes), React detects a different number of hooks being called compared to the initial render, causing an unrecoverable crash (`chunk-NUMECXU6.js:11678 Uncaught Error: Rendered more hooks than during the previous render`).

## User Story
**As a** User
**I want** to view the Match Details page without the application crashing
**So that** I can analyze the odds and use the "Save Odds" functionality safely.

## Acceptance Criteria
### AC 1: React Hook Ordering
- **Given** the `LiveBetMatchDetails.jsx` component
- **When** the component is parsed and executed
- **Then** all React hooks (`useState`, `useEffect`, `useContext`, etc.) MUST be declared at the absolute top of the functional component.
- **And** no hooks can be declared inside loops, conditions, or after `return` statements.

### AC 2: Component Stability
- **Given** a fixture ID
- **When** I navigate to `/live-bet/match/:id`
- **Then** the page loads the skeleton/spinner first (loading state).
- **And** successfully transitions to the data display (or error state) without throwing a Hook Order exception in the console.

## Technical Resolution (Instructions for Frontend Agent)
1. Open `LiveBetMatchDetails.jsx`.
2. Locate the following code block near line 50-60:
   ```javascript
   const [saveState, setSaveState] = useState('idle');
   const handleSaveOdds = async () => { ... }
   ```
3. Move this entire block to the top of the component, immediately below the existing `const [error, setError] = useState(null);` and above the `useEffect` hook.
4. Ensure no other hooks exist below the line `if (loading) return ...;`.

*(Note: A hotfix has been applied to the file, but the Frontend Agent must ensure this pattern is strictly followed for all future additions to this complex component).*
