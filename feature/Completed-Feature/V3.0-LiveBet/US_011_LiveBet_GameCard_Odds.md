# US_011 - Game Card Odds Integration

## Title
Display 1N2 and O/U 2.5 Odds on Game Card

## User Story
**As a** Punter  
**I want** to see the Winner odds and the Over/Under 2.5 goals odds directly on the card  
**So that** I can quickly evaluate the "Good Bet" potential of a match without opening detailed views.

## Acceptance Criteria
### AC 1: Win/Draw/Loss Odds (1N2)
- **Given** I am viewing a Game Card for an upcoming match
- **When** the odds are available
- **Then** the card displays three distinct odds:
  1.  Home Win
  2.  Draw
  3.  Away Win
- **And** the values are formatted to 2 decimal places (e.g., `2.15`).

### AC 2: "Good Bet" (O/U 2.5) Indicator
- **Given** I am viewing the Game Card
- **When** the Over/Under 2.5 goals market is available
- **Then** a separate section labeled "Goals" displays:
  -   Over 2.5: Odds (e.g., `1.85`)
  -   Under 2.5: Odds (e.g., `1.95`)
- **And** if odd is missing, a placeholder "-" is displayed.

### AC 3: Bookmaker Preference Order
- **Given** fetch results contain multiple bookmakers
- **When** displaying the primary odds
- **Then** the system checks for **Winamax** (first priority).
- **And** if unavailable, checks for **Unibet** (second priority).
- **And** if both are missing, uses the **first available** bookmaker.

### AC 4: Refresh/Stability
- **Given** odds change frequently
- **When** the page is reloaded
- **Then** the displayed odds update (subject to cache expiry).
- **But** minor fluctuations should not trigger UI jank.

## Functional Notes
- **Visual Clarity**: Odds should be bold and easy to read.
- **Color Codes**: Use standard red/green arrows (optional) if we track movement, but for V1 static values are fine.
- **Missing Data**: If *no* odds are found for a match, hide the section entirely to keep the card clean.

## Technical Notes
### API Integration
- **Endpoint**: `GET https://v3.football.api-sports.io/odds?fixture={id}`
- **Response Structure**:
    - `response[0].bookmakers`: Array of providers.
    - `bookmakers[i].bets`: Array of markets.
        - Market ID `1` = Match Winner (1N2).
        - Market ID `5` = Goals Over/Under (Wait, confirm ID).
        - Value formatting: Ensure correct decimal places.

### Bookmaker IDs (API-Football)
- **Winamax**: ID `52` (Unverified, check API docs).
- **Unibet**: ID `11` (Unverified, check API docs).
- **Logic**: Implement a helper function `getPreferredOdds(bookmakers)`:
    ```javascript
    const PREFERRED_IDS = [52, 11]; // Winamax, Unibet
    // Find first match in preference list, else return index 0
    ```

### Caching Strategy (Critical)
- Odds expire fast but are expensive to call per-match in a list view.
- **Bulk Fetch**: Use `odds?date=YYYY-MM-DD` endpoint instead of `fixture={id}` to fetch *all* odds for the day in one go. Map these to the rendered list by `fixture.id`.
- **TTL**: Cache this bulk response for 10-15 minutes.
