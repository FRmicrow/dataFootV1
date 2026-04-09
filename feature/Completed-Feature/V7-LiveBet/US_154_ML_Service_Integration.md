# User Story 154: ML Service Integration & Improvement

**Feature Type**: Infrastructure / MLE
**Role**: ML Engineer
**Accountable**: ML Agent

---

## Goal
Leverage and enhance the existing `ml-service` to serve as a high-performance inference and training engine for the Live Bet system.

## Core Task
Refactor the existing Python-based ML infrastructure to handle unified feature intake and provide a standardized API for the Node.js backend.

## Functional Requirements
- **Unified API Contract**: Standardize input (JSON Features) and output (Probabilities) schema.
- **Service Wrap**: Ensure the Python service is containerized or running as a robust background process (e.g., using FastAPI or Flask).
- **Model Versioning**: Implement a simple registry to track which model version (e.g., `v1.2.0-rf-1x2`) generated a specific prediction.
- **Performance Profiling**: Optimize bottlenecks in the existing service to ensure batch inference for 50 matches is sub-second.

## Technical Requirements
- **Location**: Work within the `/Users/dominiqueparsis/statFootV3/ml-service` directory.
- **Communication**: Use HTTP or a lightweight message queue between Backend and ML Service.
- **Dependency Management**: Ensure `requirements.txt` is updated and use the local `venv`.

## Acceptance Criteria
- Node.js backend can successfully call the ML service and receive a prediction.
- Error handling: if ML service is down, Backend falls back to the "Heuristic" (Poisson-only) local prediction.
- ML service logs detailed metrics on prediction accuracy vs runtime.
- Codebase is cleaned of any legacy/unused model prototypes.
