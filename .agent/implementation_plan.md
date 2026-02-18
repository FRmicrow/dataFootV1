# Implementation Plan: StatFoot V3 Improvements

## Priority 1: Data Import & Integrity
1. **Fix "Research Players by Team" Import**
   - Use same API call as "Search Players" 
   - Implement multi-threaded import (Promise.all with batching)
   - Technical considerations: API rate limits, database locks

2. **Fix National Team Tab**
   - Filter out club data from national team display
   - Only show national_team_stats, not club_stats

3. **Mass Refresh Data**
   - Respect current filters (country, club)
   - Additive only (no deletion)
   - Batch processing with progress tracking

## Priority 2: Trophies Enhancement
1. **Implement Trophies API Integration**
   - Add `/trophies?player={id}` endpoint to footballApi.js
   - Create trophy import logic in importController
   - Store in player_trophies table

2. **Improve Trophies Display**
   - Sort by year (newest first)
   - Group by club, then national team
   - Remove "type" column

## Priority 3: Club Data
1. **Fix Club Import/Display**
   - Implement `/teams?name={name}` API
   - Populate club information properly
   - Fix empty data display

## Priority 4: Filtering & Search
1. **Enhanced Player Filters**
   - Country, Club, Name, Nationality
   - Multi-select support

2. **Club Page Improvements**
   - Display by country → alphabetical
   - Filters: name, country

3. **Trophy Filters**
   - Dropdown per category (championship, cup, international, national)
   - Multi-select support
   - Works for both clubs and players

## Technical Considerations

### Multi-threaded Import
- **Approach**: Use Promise.all with batching (5-10 concurrent requests)
- **Risks**: 
  - API rate limiting (429 errors)
  - Database write conflicts
  - Memory usage with large batches
- **Mitigation**:
  - Implement retry logic with exponential backoff
  - Use sequential database writes
  - Monitor API quota

### Database Performance
- Add indexes on frequently filtered columns
- Use transactions for batch operations
- Implement connection pooling if needed
