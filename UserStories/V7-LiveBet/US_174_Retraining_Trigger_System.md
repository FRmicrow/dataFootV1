# User Story 174: Retraining Trigger System

**Feature Type**: Infrastructure
**Role**: MLE / Backend Developer
**Accountable**: ML Agent

---

## Goal
Manage the refresh cycle of the Machine Learning models to ensure they stay adapted to the latest league form and player transfers.

## Core Task
Develop a "Model Orcheestrator" that handles both automated weekly training and manual triggers.

## Functional Requirements
- **Automated Weekly Cycle**: A cron job that triggers the training pipeline every Monday at 04:00 AM (after weekend fixture settlement).
- **Manual Trigger Button**: Add a "Retrain Model" button in the Admin/Monitoring panel.
- **Job Status Tracking**: Show "Training in progress..." status in the UI with a timestamp of the last successful model update.
- **Failover Logic**: If a retraining fails, keep the previous model in production and log the error.

## Technical Requirements
- **Orchestrator**: Implement a controller that calls the `ml-service` training endpoint.
- **Feedback Loop**: ML service must report training metrics (Log-loss improve/decline) to the backend.
- **Asynchronous Execution**: Training must run in the background without blocking the API.

## Acceptance Criteria
- Clicking "Retrain Now" starts the pipeline.
- Dashboard shows "Last Retrained: 2 hours ago".
- The model is updated seamlessly (no server restart required for hot-reloading weights).
