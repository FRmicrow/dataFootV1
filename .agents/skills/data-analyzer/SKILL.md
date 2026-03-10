---
name: data-analyzer
description: Specialized skill for analyzing, normalizing, and processing football match data (JSON/CSV) and xG (Expected Goals) statistics. Use this when working with data in Scrapbyvideo/, xGData/, or ScreenData/.
---

# Data Analyzer Skill

This skill provides expertise in handling the specific data formats used in the `statFootV3` project.

## Data Domains
- **Match Results**: Found in `Scrapbyvideo/` (structured by league and season).
- **xG Data**: Consolidated JSON files in `xGData/matchXG/`.
- **Raw Screens**: OCR data or screenshot extractions in `ScreenData/`.

## Responsibilities
- **Normalization**: Ensure team names and league identifiers are consistent across different data sources.
- **Validation**: Check for missing matches, duplicate entries, or statistical anomalies (e.g., negative xG).
- **Transformation**: Convert raw extraction results into the consolidated formats required by the database or ML models.

## Integration
- Works in tandem with the `project-context` skill to ensure data is correctly ingested into the backend via the established API services.
- Supports the `ml-service` by providing clean, pre-processed training or inference data.
