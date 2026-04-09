#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ML_DIR="$ROOT_DIR/ml-service"
LOG_DIR="$ML_DIR/logs"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"
nohup "$ML_DIR/venv/bin/python" "$ML_DIR/run_overnight_pipeline.py" \
  >> "$LOG_DIR/overnight_pipeline_launcher.log" 2>&1 &

echo $! > "$ML_DIR/overnight_pipeline.pid"
echo "overnight pipeline pid=$(cat "$ML_DIR/overnight_pipeline.pid")"
echo "logs: $LOG_DIR"
