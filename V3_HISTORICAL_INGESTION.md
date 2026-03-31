# 🏟️ Historical Football Data Ingestion (V3 Schema)

This document serves as the master reference for future agents and developers on how the historical football data pipeline (1950–2010) is structured and how to expand it.

---

## 🏗️ Architecture Overview

The pipeline is designed to transform raw Transfermarkt/JSON archives into the **V3 SQL Schema**, ensuring absolute consistency with modern API-Football data.

### Key Components
1. **Registry (`historical_league_registry.json`)**: The source of truth for league IDs and folder mapping.
2. **Master Importer (`import_historical_master.js`)**: The logic-heavy ingestion engine.
3. **Harmonizer (`harmonize_matchdays.js`)**: Standardizes all rounds to `Regular Season - X`.
4. **Deduplicators (`dedup_v3_teams.js`, `dedup_v3_fixtures.js`)**: Resolves "ghost" variants and overlapping imports.

---

## 🚀 Process A-to-Z: Importing a New League

Follow these steps to ingest a new historical league or season.

### 1. Data Preparation
Place the raw JSON files (formatted as matchdays) in the `external/TODO/` directory.
- Format: `external/TODO/[LeagueName]/[Year]/matchday_X.json`

### 2. Registry Update
Add the league to `backend/scripts/v3/historical_league_registry.json`.
```json
{
  "id": 19,
  "name": "Bundesliga",
  "path": "Bundesliga",
  "country_id": 5
}
```

### 3. Execution
Run the master importer from the backend root:
```bash
docker exec statfoot-backend node scripts/v3/import_historical_master.js --league "Bundesliga" --year 1977
```
*Tip: Use `--all` to process all registered leagues.*

### 4. Post-Import Sanitization (CRITICAL)
Always run the cleanup suite after a move to ensure architectural integrity:
```bash
# 1. Merge team variants (e.g. 'Schalke 04' vs 'Fc Schalke 04')
docker exec statfoot-backend node scripts/v3/dedup_v3_teams.js

# 2. Scrub redundant match records
docker exec statfoot-backend node scripts/v3/dedup_v3_fixtures.js

# 3. Restore canonical round numbering
docker exec statfoot-backend node scripts/v3/harmonize_matchdays.js
```

---

## 🛠️ Troubleshooting & Rules

### The "Round 35" Bug (Hallucination)
If the frontend shows more matchdays than exist in reality, it means **team duplicates** exist. 
- **Cause**: The same team was imported under two different names (e.g., as an orphan without CountryID).
- **Fix**: Re-run the `dedup_v3_teams.js` script with the Orphan Sweep enabled.

### Round Naming
All historical rounds must follow the `Regular Season - X` format. Do not use `Matchday X` or `Round X`. The `harmonize_matchdays.js` script enforces this.

### Performance
The `dedup_v3_teams.js` script processes by country batching to avoid Memory (OOM) crashes. If it fails, check the `country_id` distribution.

---

## 📊 Inventory of Covered Leagues
- **Major**: Ligue 1, Premier League, La Liga, Serie A,尊 Bundesliga, Eredivisie.
- **Cups**: DFB Pokal, Coupe de France, UEFA Champions League.
- **Period**: 1950 - 2010 (Varies by league).

> [!NOTE]
> All completed imports are moved from `external/TODO/` to `external/externalDONE/` to avoid redundant processing.
