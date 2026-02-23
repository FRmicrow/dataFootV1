# User Story 153: Narrative Context Encoder

**Feature Type**: Data Engineering
**Role**: Data Analyst / Data Engineer
**Accountable**: Data Agent

---

## Goal
Enrich the quantitative model with "Soft" narrative data that significantly influences match outcomes in real life.

## Core Task
Develop a logic layer that classifies matches based on rivalry, stakes, and high-pressure context.

## Functional Requirements
- **Derby Detection**: Automatically identify "Derbies" using a mapping of city/region or historical rivalry (e.g., El Clasico).
- **Match Stakes Classifier**:
    - **High Stakes**: Title deciders, Relegation play-offs, Champions League Knockouts.
    - **Friendly/Dead Rubber**: Matches with no impact on standings.
- **Pressure Index**: Boolean flag for "Potential Champion" playing against "Relegation candidate".
- **Travel Impact**: Calculate distance traveled by the away team (km) as a fatigue feature.

## Technical Requirements
- **Metadata Storage**: Use `V3_Leagues.metadata` or a new mapping table.
- **Distance Logic**: Implement a lat/long distance calculator for team cities.
- **Workflow**: Integrate these flags into the `FeatureEngine`.

## Acceptance Criteria
- Model successfully utilizes the "Derby" flag to adjust variance.
- Relegation matches are correctly flagged for increased "Defensive Resilience" projections.
- "Dead Rubber" matches show higher predicted goal variance.
- System identifies at least 50 global "Classic Ribalries" automatically.
