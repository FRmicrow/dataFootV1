# User Story 172: Intelligence Hub UI (The Cockpit)

**Feature Type**: UX Overhaul
**Role**: Frontend Developer
**Accountable**: Frontend Agent

---

## Goal
Design a professional, high-density "Control Room" for analyze betting value, making it look like an institutional-grade financial terminal.

## Core Task
Build the "Edge Dashboard" in the frontend, incorporating visualization of model vs market discrepancies.

## Functional Requirements
- **Edge Dashboard**: A sortable grid listing all "Value Bets" for the day.
- **Probability vs Odds Overlay**: Use a progress bar or double-bar chart to show `Model %` vs `Implied %`.
- **Value Card**: Highlight the "Top Bet of the Day" with high confidence.
- **Market Breakdown**: Visual distribution of probabilities for O/U markets (e.g., 0.5, 1.5, 2.5 on a single chart).
- **Filtering System**: Filter by League, Min Edge, Risk Classification, and Bookmaker (Winamax/Unibet only).

## Technical Requirements
- **Design System**: Use V3 glassmorphism and high-contrast typography (Outfit/Inter).
- **Libraries**: Use `Recharts` for distribution gradients.
- **Real-time Updates**: Reflect odds movements with pulsing indicators (Green/Red).

## Acceptance Criteria
- UX is clean, professional, and data-dense.
- Selecting a match shows a comprehensive "Value Breakdown" panel.
- The "Edge" value is the most prominent number in the grid.
- No "casino-style" blinking banners; only analytical indicators.
