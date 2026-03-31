#!/bin/bash

# Universal Historical Multi-League Orchestrator
# Runs the master importer for all defined leagues and seasons.

# Exit on error
set -e

# Configuration
START_YEAR=2008
END_YEAR=1950  # Adjust based on data availability

# League ID to Directory Name mapping
# 1: Ligue 1, 2: Serie A, 3: LaLiga, 4: Bundesliga, 5: Premier League
declare -A LEAGUE_MAP
LEAGUE_MAP[1]="Ligue1FixtureDetail"
LEAGUE_MAP[2]="SerieAFixtureDetail"
LEAGUE_MAP[3]="LaLigaFixtureDetail"
LEAGUE_MAP[4]="BundesligaFixtureDetail"

# Directories
BASE_DIR="/Users/domp6/Projet Dev/NinetyXI/dataFootV1"
SCRIPTS_DIR="$BASE_DIR/backend/scripts/v3"
DATA_ROOT="$BASE_DIR/externalData/ExtractionTodo"

echo "=========================================================="
echo "🚀 Starting Global Historical Import ($START_YEAR -> $END_YEAR)"
echo "=========================================================="

# Create logs directory if not exists
mkdir -p "$BASE_DIR/logs/historical_import"

for LEAGUE_ID in "${!LEAGUE_MAP[@]}"; do
    DIR_NAME="${LEAGUE_MAP[$LEAGUE_ID]}"
    echo ""
    echo "----------------------------------------------------------"
    echo "🏆 Processing League: $DIR_NAME (ID: $LEAGUE_ID)"
    echo "----------------------------------------------------------"

    for (( YEAR=$START_YEAR; YEAR>=$END_YEAR; YEAR-- )); do
        SEASON_DIR="$DATA_ROOT/$DIR_NAME/$YEAR-$(($YEAR + 1))"
        
        if [ ! -d "$SEASON_DIR" ]; then
            # Try alternative folder naming if applicable (some might just be YEAR)
            SEASON_DIR="$DATA_ROOT/$DIR_NAME/$YEAR"
        fi

        if [ -d "$SEASON_DIR" ]; then
            echo "📅 Season $YEAR... "
            
            LOG_FILE="$BASE_DIR/logs/historical_import/import_${LEAGUE_ID}_${YEAR}.log"
            
            # Run the importer
            # We use --master to create fixtures since pre-2010 usually doesn't exist
            node "$SCRIPTS_DIR/import_historical_master.js" \
                --league "$LEAGUE_ID" \
                --season "$YEAR" \
                --path "$SEASON_DIR" \
                --master \
                > "$LOG_FILE" 2>&1
            
            if [ $? -eq 0 ]; then
                echo "✅ Done. (Log: $LOG_FILE)"
            else
                echo "❌ FAILED. Check $LOG_FILE"
            fi
        else
            echo "⏭️  Skipping $YEAR (Directory not found: $SEASON_DIR)"
        fi
    done
done

echo ""
echo "=========================================================="
echo "🏆 Global Import Process Finished!"
echo "=========================================================="
