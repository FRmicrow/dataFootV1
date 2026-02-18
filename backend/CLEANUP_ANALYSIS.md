# Player Statistics Duplicate Cleanup

## Analysis Summary

**Database:** `database.sqlite`  
**Table:** `V2_player_statistics`

### Current State
- **Total Records:** 535,580
- **Duplicate Groups:** 55,876
- **Records to Delete:** 63,003
- **Affected Player-Seasons:** 55,350

### Duplicate Criteria
Records are considered duplicates when they have:
- Same `player_id`
- Same `club_id`
- Same `year`
- Same `matches_played`
- Same `goals`
- Same `assists`
- **BUT** different `competition_id`

### Example Duplicates
```
Player 11665, Club 33, Year 2020:
  - stat_id: 150713, competition_id: 18989 (La Liga) ← KEEP
  - stat_id: 247337, competition_id: 1 (Unknown) ← DELETE

Player 11665, Club 441, Year 2009:
  - stat_id: 385131, competition_id: 2 (Europa League) ← KEEP
  - stat_id: 380446, competition_id: NULL (Unknown) ← DELETE
```

## Cleanup Strategy

**Keep:** Entry with the **LOWEST competition_id**  
**Priority Order:**
1. Lowest numbered competition_id (e.g., 1, 2, 3...)
2. NULL competition_id (treated as highest, deleted first)

## Execution Instructions

### Option 1: Run SQL Script (Recommended)

```bash
cd /Users/dominiqueparsis/statFootV3/backend
sqlite3 database.sqlite < cleanup_player_stats_duplicates.sql
```

This will:
1. Start a transaction
2. Delete 63,003 duplicate records
3. Keep 472,577 clean records
4. Show verification results
5. Commit the changes

### Option 2: Manual SQL

```sql
-- Connect to database
sqlite3 database.sqlite

-- Run the cleanup
.read cleanup_player_stats_duplicates.sql

-- Verify results
SELECT COUNT(*) FROM V2_player_statistics;
-- Should show: 472,577 (535,580 - 63,003)
```

## Verification Queries

### Before Cleanup
```sql
-- Count total duplicates
SELECT COUNT(*) FROM (
    SELECT player_id, club_id, year, matches_played, goals, assists, COUNT(*) as cnt
    FROM V2_player_statistics
    GROUP BY player_id, club_id, year, matches_played, goals, assists
    HAVING COUNT(*) > 1
);
-- Result: 55,876
```

### After Cleanup
```sql
-- Should return 0
SELECT COUNT(*) FROM (
    SELECT player_id, club_id, year, matches_played, goals, assists, COUNT(*) as cnt
    FROM V2_player_statistics
    GROUP BY player_id, club_id, year, matches_played, goals, assists
    HAVING COUNT(*) > 1
);
-- Expected: 0
```

## Safety Features

- ✅ Uses `BEGIN TRANSACTION` / `COMMIT` for atomicity
- ✅ Can be rolled back if needed (use `ROLLBACK` instead of `COMMIT`)
- ✅ Shows verification results after execution
- ✅ Preserves most complete data (lowest competition_id)

## Backup Recommendation

Before running, create a backup:
```bash
cp database.sqlite database.sqlite.backup
```

## Files Created

1. **cleanup_player_stats_duplicates.sql** - The cleanup script
2. **CLEANUP_ANALYSIS.md** - This documentation

---

**Ready to execute when you are!** 🎯
