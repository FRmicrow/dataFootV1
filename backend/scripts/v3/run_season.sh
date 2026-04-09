#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Default to 2009 if no argument provided
YEAR=${1:-2009}

echo "=========================================================="
echo "🚀 Starting Ligue 1 Historical Pipeline for Season ${YEAR}..."
echo "=========================================================="

echo "▶️ [0/7] Purging Existing Season Data..."
node -e "import db from './src/config/database.js'; await db.init(); await db.run(\"DELETE FROM v3_fixtures WHERE league_id = 1 AND season_year = ${YEAR}\"); await db.run(\"DELETE FROM v3_player_stats WHERE league_id = 1 AND season_year = ${YEAR}\"); await db.run(\"DELETE FROM v3_standings WHERE league_id = 1 AND season_year = ${YEAR}\"); process.exit();"

echo ""
echo "▶️ [1/7] Ingesting Fixtures & Match Metadata..."
node scripts/v3/ingest_fixtures.js $YEAR

echo ""
echo "▶️ [2/7] Ingesting Active Players..."
node scripts/v3/ingest_players.js $YEAR

echo ""
echo "▶️ [3/7] Re-ingesting Lineups (Exact & Fuzzy Matching)..."
node scripts/v3/reingest_lineups.js $YEAR

echo ""
echo "▶️ [4/7] Re-mapping Orphaned Match Events (Goals/Assists/Cards)..."
node scripts/v3/remap_events.js $YEAR

echo ""
echo "▶️ [5/7] Deduplicating Split Player Profiles..."
node scripts/v3/dedup_players.js $YEAR

echo ""
echo "▶️ [6/7] Repairing & Synchronizing Fixture Player Stats..."
node scripts/v3/repair_player_stats.js $YEAR

echo ""
echo "▶️ [7/7] Aggregating Final UI Data (Standings & Overall Stats)..."
node scripts/v3/populate_ui_data.js $YEAR

echo ""
echo "=========================================================="
echo "✅ Pipeline Complete! Season ${YEAR} data is now live."
echo "=========================================================="
