# Technical Specification: V29-ML-Hub-Rework

## Vision & Objectives
Rework the Machine Learning Hub into a premium "Command Center" that provides clarity, power, and modularity.
- **UX Premium**: Sleek, responsive, and data-dense interface using DesignSystemV3.
- **Clarity**: Unified dashboard for service status and model health.
- **Performance Intelligence**: League-by-league leaderboard of model accuracy.
- **Operational Control**: Direct frontend control for model creation and testing.

## UI Blueprint

### 1. Command Center (Main Dashboard)
- **Top Row**: Glassmorphism cards for `Model Engine Status`, `Active Predictors`, `Coverage (%)`, and `Global Precision`.
- **Primary View**: A consolidated feed of latest analytical tasks and system health.

### 2. League Performance Leaderboard (NEW)
- **Table/Grid**: Shows all leagues with their current assigned model.
- **Metrics**: Accuracy, Brier Score, and Log Loss per league.
- **Sorting**: Easily identify "Golden Leagues" (high accuracy) vs "Risk Leagues" (low accuracy).

### 3. Predictive Test Lab (NEW)
- **Single Fixture Tester**: Input a Fixture ID or select from upcoming matches.
- **Live Run**: Trigger a synchronous prediction via `/predict/fixture/{fixture_id}`.
- **Deep Insight**: Display probability breakdown (Home/Draw/Away) plus submodel signals (Corners, Cards).

### 4. Model Factory (Reworked Orchestrator)
- **League-Specific Builds**: Select a league and season to trigger a Forge Build (3 horizons).
- **Progress Tracking**: Real-time status of training pipelines.

## Data Contract

### Existing Endpoints (Reuse/Optimize)
- `GET /forge/models`: Fetch all registry models for the leaderboard.
- `GET /predict/fixture/{fixture_id}`: Primary endpoint for the Test Lab.
- `POST /forge/build-models`: Trigger for the Model Factory.
- `GET /ml-platform/simulations/overview`: Feed for simulation data.

### Frontend Components (V3)
- `src/components/v3/modules/ml/MachineLearningHubV29.jsx` (New Entry Point)
- `src/components/v3/modules/ml/submodules/MLLeaderboard.jsx`
- `src/components/v3/modules/ml/submodules/MLTestLab.jsx`
- `src/components/v3/modules/ml/submodules/MLModelFactory.jsx`

## Logic & Edge Cases
- **Service Offline**: Graceful "System Offline" state with reconnect button.
- **No Model for League**: Logic to recommend "Building Model" if a league has no active entry in registry.
- **High Latency**: Loading skeletons for high-compute prediction requests.
