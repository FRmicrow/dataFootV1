#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Data is available from 2009 down to 1950.
# 2009 is already processed, so we process 2008 down to 1950.
# You can tweak the START and END years below.
START_YEAR=2008
END_YEAR=1950

echo "=========================================================="
echo "🧹 Running Global Team Deduplication..."
node --max-old-space-size=4096 scripts/v3/auto_dedupe_teams.js
echo "=========================================================="

# Loop backwards from start to end
FAILED_SEASONS=""

for (( YEAR=$START_YEAR; YEAR>=$END_YEAR; YEAR-- ))
do
    echo ""
    echo "=========================================================="
    echo "📅 Processing Season: $YEAR - $(($YEAR + 1))"
    echo "=========================================================="
    
    # Call the parametrized season script with memory limit
    export NODE_OPTIONS="--max-old-space-size=4096"
    if ./scripts/v3/run_season.sh $YEAR; then
        echo "✅ Successfully completed season $YEAR."
    else
        echo "❌ FAILED season $YEAR. Skipping to next..."
        FAILED_SEASONS="$FAILED_SEASONS $YEAR"
    fi
done

echo "=========================================================="
if [ -z "$FAILED_SEASONS" ]; then
    echo "🏆 All historical seasons have been ingested successfully!"
else
    echo "⚠️ Completed with errors. Failed seasons:$FAILED_SEASONS"
fi
echo "=========================================================="
