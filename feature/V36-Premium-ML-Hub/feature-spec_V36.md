# Feature Spec - V36: Premium ML Hub Rework

## Vision
Transform the ML Hub into a premium intelligence dashboard that combines high-level accuracy tracking with deep transparency into model logic (the "What") and granular performance metrics (Leagues and Clubs).

## Design System V3 Alignment
- **Layout**: 12-column grid system.
- **Typography**: ds-text-* utilities for consistent scale.
- **Components**: MetricCard for KPIs, Card for section grouping, Table for dense analytics.

## Key Views

### 1. Dashboard: ML Intelligence Center
- **KPI Row**: Algorithmic Confidence (Avg Hit Rate), Logic Calibration (Brier), Predictive Coverage (Leagues/Clubs covered).
- **Intelligence Feed**: Real-time recent analyses.
- **System Pulse**: Live health of the ML service.

### 2. Visibility: The Model Dossier
- **Purpose**: Explain "what the models do".
- **Sections**:
    - **Outcome Model (1X2)**: Description of momentum & team context features.
    - **Specialized Markets (Corners/Cards)**: Feature sets including rolling stats and xG.
    - **Feature Importance**: Dynamic visualizations of which data points influence models most.

### 3. Deep Dive: Performance Analytics
- **League Matrix**: Accuracy and Brier scores per competition.
- **Club Dossier**: **[NEW]** Performance metrics for matches involving specific clubs.

### 4. Foresight: The Prediction Calendar
- **Purpose**: Show future matches and their predicted results.
- **Filtering**: By League, by Confidence level.

## Technical Requirements
- New Backend Endpoints for club-level performance grouping.
- Unified Frontend routing.
- Context-driven state management for performance filters.
