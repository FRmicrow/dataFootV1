-- Merge Duplicate Competitions - Keep Lowest ID
-- This script consolidates duplicate competition entries

BEGIN TRANSACTION;

-- 1. UEFA Champions League: Keep ID 1, merge 43929
UPDATE V2_player_statistics SET competition_id = 1 WHERE competition_id = 43929;
DELETE FROM V2_competitions WHERE competition_id = 43929;

-- 2. UEFA Europa Conference League: Keep ID 3, merge 47440
UPDATE V2_player_statistics SET competition_id = 3 WHERE competition_id = 47440;
DELETE FROM V2_competitions WHERE competition_id = 47440;

-- 3. UEFA Europa League: Keep ID 2, merge 47373
UPDATE V2_player_statistics SET competition_id = 2 WHERE competition_id = 47373;
DELETE FROM V2_competitions WHERE competition_id = 47373;

-- 4. UEFA European Championship Qualifiers (ID 47656) - Keep as separate competition
-- This is different from the main UEFA European Championship (ID 8)

-- 5. UEFA Nations League: Keep ID 9, merge 47399
UPDATE V2_player_statistics SET competition_id = 9 WHERE competition_id = 47399;
DELETE FROM V2_competitions WHERE competition_id = 47399;

-- 6. UEFA Super Cup: Keep ID 4, merge 47396
UPDATE V2_player_statistics SET competition_id = 4 WHERE competition_id = 47396;
DELETE FROM V2_competitions WHERE competition_id = 47396;

COMMIT;

-- Verify the merges
SELECT '=== Merge Summary ===' as status;
SELECT 
    c.competition_id,
    c.competition_name,
    COUNT(ps.stat_id) as player_stats_count
FROM V2_competitions c
LEFT JOIN V2_player_statistics ps ON c.competition_id = ps.competition_id
WHERE c.competition_name LIKE 'UEFA%'
GROUP BY c.competition_id, c.competition_name
ORDER BY c.competition_id;

-- Display final count
SELECT '=== Total UEFA competitions after merge ===' as info, COUNT(*) as count 
FROM V2_competitions 
WHERE competition_name LIKE 'UEFA%';
