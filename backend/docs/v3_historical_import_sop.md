# V3 Historical Data - Standard Operating Procedure (SOP)

This document provides a comprehensive guide for future AI agents on how to maintain, expand, and import historical football data (1950–2010) into the `statFootV3` ecosystem.

## 🎯 Mission Statement
The **V3 Historical Branch** aims to restore every major football archive with **100% architectural integrity**. This means:
- **Zero Duplicates**: No phantom matches or ghost team variants.
- **High Fidelity**: Including lineups, events (goals/cards/subs), and coach data.
- **Standardized Rounds**: All matchdays follow the canonical `Regular Season - X` naming.
- **Unified Assets**: Every team must point to a legitimate ID with a logo/API-link.

---

## 🏗️ Architecture Overview

The pipeline operates on the **V3 Schema**, a high-precision table set:
- `V3_Teams`: Canonical team repository (API-linked + high-fidelity auto-created).
- `V3_Team_Aliases`: Persistent mapping of raw names to canonical IDs.
- `V3_Fixtures`: Unified match warehouse.
- `V3_Fixture_Events`: Granular match events.
- `V3_Fixture_Lineups`: Starting XIs and substitutes.
- `V3_Import_Log`: State-tracking for resumable ingestion.

---

## 🚀 The A-Z Import Pipeline

To import a new league (e.g., LaLiga 1998–1999), follow these steps in order:

### Phase 1: Sourcing & Preparation
1.  **JSON Data**: Ensure source JSON files (Transfermarkt format) are available in a dedicated directory.
2.  **Registry Update**: Check `backend/scripts/v3/historical_league_registry.json`. If the league identifier is missing, add it with its `league_id` and `country_id`.

### Phase 2: Master Ingestion
Run the universal master importer. It is idempotent (safe to re-run).
```bash
# Example: Using --master to create fixtures if they don't exist
node backend/scripts/v3/import_historical_master.js --path ./data/laliga/1998-1999/ --master
```
> [!NOTE]
> The importer uses `team_resolver_multi.js`, which automatically resolves aliases or creates "Ghost" teams if a match isn't found in the first 5 steps of its resolution pipeline.

### Phase 3: Team Deduplication
After ingestion, you will likely have "Ghost" teams (auto-created without API IDs). Merge them into official teams:
```bash
node backend/scripts/v3/dedup_v3_teams.js
```
The script uses Jaro-Winkler similarity (0.88+ threshold) to merge losers into winners, updating all related tables (fixtures, stats, etc.).

### Phase 4: Fixture Deduplication
If data was partially imported from multiple sources, prune redundant records:
```bash
node backend/scripts/v3/dedup_v3_fixtures.js
```
*Winners are chosen based on detail level (presence of lineups/events/TM-IDs).*

### Phase 5: Matchday Harmonization
Standardize the `round` column to ensure UI consistency:
```bash
node backend/scripts/v3/harmonize_matchdays.js
```
This re-calculates rounds based on the number of teams and chronological sequence.

---

## 🛠️ Tooling Reference

| Script | Purpose | Key Arguments |
| :--- | :--- | :--- |
| `import_historical_master.js` | Core Ingester | `--path`, `--league`, `--season`, `--master`, `--dry-run` |
| `dedup_v3_teams.js` | Ghost Team Merger | Automatic (scans all countries) |
| `dedup_v3_fixtures.js` | Precision Pruner | Automatic (global) |
| `harmonize_matchdays.js` | Round Standardizer | Automatic (scans all completed imports) |
| `audit_pre2010_coverage.js` | Reporting | Generates coverage metrics per league/season |

---

## 🧪 Quality Assurance (QA)

Before marking a season as "Done" in the `V3_Import_Log`:
1.  Run `node backend/scripts/v3/audit_pre2010_coverage.js`.
2.  Verify no obvious "Ghost Teams" remain in `V3_Teams` for that country.
3.  Check that all matches for the season are mapped to their respective `Regular Season - X` rounds.

---

## 📅 Accomplishments (as of March 2026)
- **Ligue 1 Pilot**: Seasons 2004–2010 fully restored with 100% detail coverage.
- **Serie A Pilot**: Seasons 2004–2010 successfully imported and harmonized.
- **Pipeline Stability**: Deduplication and harmonization logic is now production-grade.

---
*Documentation drafted by Antigravity for the statFootV3 Engineering Team.*
