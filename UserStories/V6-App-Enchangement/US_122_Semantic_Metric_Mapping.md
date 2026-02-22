# User Story: Semantic Metric Mapping

**ID:** US_122
**Feature:** Content Studio Overhaul
**Version:** V6
**Type:** UX Improvement / Refactor
**Accountable Agent:** Full Stack Developer

## Mission
Translate technical database field names into professional scouting terminology and ensure the "Career" view defaults to cumulative totals where applicable.

## Acceptance Criteria
1.  **Semantic Translation**:
    *   `goals_total` → `Goals`
    *   `goals_assists` → `Assists`
    *   `games_appearences` → `Apps`
    *   `games_rating` → `Rating`
    *   `careerTotals` table headers should reflect professional scouting terminology.
2.  **Terminology Harmonization**:
    *   Rename sections from "Stats" or "Records" to "Performance Metrics".
    *   Rename "Appearances" to "Apps" in compact tables.
3.  **Default View Logic**:
    *   Set "Cumulative" as the default aggregation if applicable in the career summary.
4.  **Professional Polish**:
    *   Ensure all tooltips and labels use standardized sports analytics abbreviations.
