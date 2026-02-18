# Intelligent Competition Detection System

## Overview

This system implements a multi-tier approach to accurately identify competitions during player data import, dramatically reducing orphaned/missing competition data.

## Problem Statement

Previously, the import process would:
- Create duplicate competition entries for the same league
- Fail to match existing competitions in the database
- Leave many player statistics with NULL competition_id
- Require extensive manual cleanup

## Solution: 4-Tier Detection Strategy

### Tier 1: Existing Competition Lookup
**Most Reliable** - Searches the V2_competitions table

1. **API ID Match** - Matches by league.id from API (most accurate)
2. **Exact Name Match** - Matches by exact competition_name
3. **Fuzzy Name Match** - Handles case/whitespace variations

### Tier 2: Similar Player Analysis
**Data-Driven Inference** - Analyzes existing player data

- Finds players from the same club and season
- Looks for similar match counts (±3 matches)
- Infers competition based on what similar players played in
- **Example**: If 10 Liverpool players in 2021 with ~38 matches all have competition_id=39 (Premier League), a new Liverpool player with 35 matches likely played in the Premier League too

### Tier 3: Club History Analysis
**Club Pattern Recognition** - Looks at club's typical competitions

- Finds the most common competition for a club in a specific season
- Useful when match count varies significantly
- **Example**: If 20 Barcelona players in 2020 have competition_id=140 (La Liga), assume that's the primary competition

### Tier 4: Default Domestic League
**Country-Based Fallback** - Uses country's primary league

- Gets the top-tier domestic league for the club's country
- Based on trophy_type_id (lower = more prestigious)
- **Example**: If all else fails for an English club, default to Premier League

## When Detection Fails

If all 4 tiers fail to identify a competition:

1. **No Auto-Creation** - System does NOT automatically create a new competition entry (prevents duplicates)
2. **Logging** - Records the unresolved competition in `V2_unresolved_competitions` table
3. **Manual Review** - Admin can review and manually assign the correct competition

## Database Schema

### V2_unresolved_competitions Table

```sql
CREATE TABLE V2_unresolved_competitions (
    unresolved_id INTEGER PRIMARY KEY,
    player_id INTEGER,
    club_id INTEGER,
    season TEXT,
    league_name TEXT,
    league_api_id INTEGER,
    matches_played INTEGER,
    goals INTEGER,
    assists INTEGER,
    resolved BOOLEAN DEFAULT 0,
    resolved_competition_id INTEGER,
    created_at DATETIME,
    resolved_at DATETIME
);
```

## API Endpoints

### Get Unresolved Competitions
```
GET /api/admin/unresolved-competitions
```

Returns all competitions that couldn't be automatically detected, sorted by:
- Matches played (DESC) - prioritize important data
- Created date (DESC) - newest first

Response:
```json
[
  {
    "unresolved_id": 1,
    "player_id": 123,
    "first_name": "Mohamed",
    "last_name": "Salah",
    "club_id": 40,
    "club_name": "Liverpool",
    "country_name": "England",
    "season": "2021",
    "league_name": "Premier League",
    "matches_played": 38,
    "goals": 23,
    "assists": 13,
    "resolved": 0
  }
]
```

### Resolve Competition Manually
```
POST /api/admin/resolve-competition
Body: {
  "unresolvedId": 1,
  "competitionId": 39
}
```

- Updates the player_statistics record with the correct competition_id
- Marks the unresolved record as resolved
- Records resolution timestamp

## Import Flow

### Before (Old System)
```
API Data → Check if competition exists → NO → Create new entry → Duplicate!
```

### After (New System)
```
API Data 
  → Tier 1: Check existing competitions (API ID, name)
  → Tier 2: Analyze similar players (same club/season/matches)
  → Tier 3: Check club's common competitions
  → Tier 4: Use country's default league
  → Still NULL? → Log for manual review
  → Import with detected/NULL competition_id
```

## Benefits

1. **90% Reduction** in orphaned competitions (estimated)
2. **No Duplicates** - Stops creating duplicate competition entries
3. **Intelligent Inference** - Uses existing data to make smart guesses
4. **Manual Fallback** - Provides clean interface for edge cases
5. **Data Quality** - Ensures V2_competitions table stays clean

## Configuration

### Competition Creation Policy

The system now follows a **conservative creation policy**:

- ✅ **Create** if league has an API ID (official league)
- ❌ **Don't Create** if league has no API ID (friendly matches, etc.)
- 📋 **Log for Review** when creation is skipped

This prevents pollution of the V2_competitions table with one-off friendly matches or incorrectly named leagues.

## Usage During Import

The intelligent detection is automatically used during:

1. **Deep League Import** (`importDeepLeaguePlayers`)
2. **Club Player Import** (`importClubPlayers`)
3. **Individual Player Import** (`importLeaguePlayers`)

No changes needed to import workflows - it's transparent!

## Monitoring

### Check Unresolved Count
```sql
SELECT COUNT(*) FROM V2_unresolved_competitions WHERE resolved = 0;
```

### View Top Unresolved by Matches
```sql
SELECT 
    p.first_name || ' ' || p.last_name as player,
    c.club_name,
    u.season,
    u.league_name,
    u.matches_played
FROM V2_unresolved_competitions u
JOIN V2_players p ON u.player_id = p.player_id
JOIN V2_clubs c ON u.club_id = c.club_id
WHERE u.resolved = 0
ORDER BY u.matches_played DESC
LIMIT 20;
```

## Future Enhancements

### Potential Tier 5: AI/Web Search
- Use GenAI to search for competition information
- Cross-reference with Wikipedia, official league sites
- Validate with multiple sources before auto-assigning

### Potential Tier 6: User Feedback Learning
- Track manual resolutions
- Build a mapping table of common mismatches
- Auto-apply learned mappings in future imports

## Maintenance

### Periodic Cleanup
Run this monthly to clean up old resolved records:

```sql
DELETE FROM V2_unresolved_competitions 
WHERE resolved = 1 
AND resolved_at < date('now', '-6 months');
```

### Competition Table Health Check
```sql
-- Find duplicate competitions
SELECT competition_name, COUNT(*) as count
FROM V2_competitions
GROUP BY competition_name
HAVING count > 1;
```

## Support

For issues or questions about the intelligent detection system:
1. Check the backend logs for detection attempts
2. Review the V2_unresolved_competitions table
3. Verify V2_competitions table has major leagues populated
4. Ensure club country_id is correctly set

---

**Version**: 1.0  
**Last Updated**: 2026-02-04  
**Author**: Intelligent Competition Detection Service
