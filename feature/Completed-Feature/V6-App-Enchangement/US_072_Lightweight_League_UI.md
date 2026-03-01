# US_072: Lightweight League UI Components (Mini-Cards)

**Role: Frontend Developer**

## User Story
**As a** User  
**I want** a visually lightweight "Mini-Card" or "List Row" layout for leagues  
**So that** I can see dozens of competitions on a single screen without fatigue.

## Acceptance Criteria
- **Given** the League List  
- **When** rendered  
- **Then** all legacy "V3 Migration" and "Data Progress" text labels must be removed.
- **Given** a single League entry  
- **When** viewed  
- **Then** it must use a "Mini-Card" format:
    - Small Circle Logo (max 32px).
    - Competition Name (Semi-bold, 14px).
    - Type Indicator (Tiny icon/dot for Cup vs League).
    - Rank Badge (Small, subtle circle).
- **Given** the page header  
- **When** rendered  
- **Then** it must strictly show the page title (e.g., "Competitions") and a count of total active leagues, with no legacy POC descriptions.

## Functional Notes
- Move from "Big Boxy Cards" to "Compact Information Rows".
- High density is the priority for the "Senior Product" aesthetic.

## Technical Notes
- Componentize the `LeagueMiniItem`.
- Ensure the hover state is subtle (light background or border change).
- Keep the `onClick` functionality to navigate to the Season Overview.
- Use CSS Grid for the Mini-Card layout (e.g., `grid-template-columns: 40px 1fr 60px`).
