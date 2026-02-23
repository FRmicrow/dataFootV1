# US_175: Bookmaker Priority Logic

## Context
Our analytical model and volatility tracking rely on consistent data sources. For European/French markets, Winamax (52) and Unibet (11) offer the highest liquidity and representative prices. We need to ensure that our ingestion engine strictly follows a hierarchy when multiple bookmakers are available.

## Mission
Refine the odds selection logic in all ingestion services to strictly prioritize Winamax (52) over Unibet (11), and use others only as fallbacks.

### Hierarchy Rules
1. **Primary**: Winamax (ID: 52)
2. **Secondary**: Unibet (ID: 11)
3. **Tertiary**: First available bookmaker from API response.

## Technical Plan

### 1. Refactor Selection Logic
Update `bulkOddsService.js` and `liveBetService.js` to implement the strict $52 > 11 > \text{Fallback}$ logic.

### 2. Centralize Priority Config
Consider moving the `PREFERRED_BOOKIES` array to a shared config or a dedicated utility to ensure consistency across the backend.

### 3. Service Impact
Ensure that `MarketVolatilityService` (captured snapshots) and `probabilityService` are using the same prioritized source data to prevent inconsistencies in the feature store.

## Success Criteria
- [ ] Winamax is always picked if present in the API response.
- [ ] Unibet is picked only if Winamax is missing.
- [ ] Fallback logic is preserved for leagues where preferred bookies don't offer coverage.
- [ ] Log messages indicate which bookmaker was selected for ingestion.
