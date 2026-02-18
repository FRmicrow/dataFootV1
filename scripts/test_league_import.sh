#!/bin/bash
# Test the new optimized league import endpoint
# Usage: ./test_league_import.sh <LEAGUE_ID> <SEASON>
# Example: ./test_league_import.sh 39 2023 (Premier League 2023)

LEAGUE_ID=${1:-39}
SEASON=${2:-2023}

echo "Testing Optimized Import for League $LEAGUE_ID, Season $SEASON..."

curl -N -X POST http://localhost:3001/api/admin/import-league-optimized \
  -H "Content-Type: application/json" \
  -d "{\"leagueId\": $LEAGUE_ID, \"season\": $SEASON}"

echo ""
echo "Test completed."
