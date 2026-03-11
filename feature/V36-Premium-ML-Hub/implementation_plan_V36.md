# Implementation Plan - V36: Premium ML Hub Rework

This feature transforms the ML Hub into a high-end intelligence center, providing deep transparency into model performance at the league and club levels, and clear visibility into upcoming predictions.

## Proposed Changes

### [Component] Backend - ML Analytics Extensions

#### [MODIFY] [mlController.js](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/controllers/v3/mlController.js)
- Implement `getMLClubEvaluation`: Group simulation results by club to show hit rate/accuracy per team.
- Implement `getUpcomingPredictions`: A unified list of matches in status `NS` (Not Started) with their processed ML risk analysis.

#### [MODIFY] [ml_routes.js](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/backend/src/routes/v3/ml_routes.js)
- Register `GET /ml-platform/simulations/club-evaluation`.
- Register `GET /ml-platform/predictions/upcoming`.

---

### [Component] Frontend - Premium ML Dashboard

#### [MODIFY] [MachineLearningHub.jsx](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/MachineLearningHub.jsx)
- Update navigation to prioritize the new "Intelligence" view.

#### [NEW] [MLIntelligenceDashboard.jsx](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/submodules/MLIntelligenceDashboard.jsx)
- The main entry point using a clean, professional grid layout.
- Integration of "Status Metrics" (Model Health, Training status).

#### [NEW] [ModelDossier.jsx](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/submodules/ModelDossier.jsx)
- Displays "What the models do": Feature importance, target descriptions (1X2, Corners, Cards).

#### [NEW] [ClubPerformanceMatrix.jsx](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/submodules/ClubPerformanceMatrix.jsx)
- A table/grid showing accuracy metrics per club.

#### [NEW] [PredictionCalendar.jsx](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/submodules/PredictionCalendar.jsx)
- A timeline of future matches with their ML labels and probabilities.

## Verification Plan

### Automated Tests
- Test new endpoints for JSON structure and data filtering.
- Ensure the frontend builds without errors after adding new components.

### Manual Verification
- Verify the new "Intelligence" page in the browser.
- Check club performance metrics for consistency with individual match results.
- Ensure future predictions appear correctly for upcoming fixtures.
