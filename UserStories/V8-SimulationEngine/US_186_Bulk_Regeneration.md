# 👤 US_186: Bulk Forge Worker
**Accountable Agent**: Backend Developer / Infrastructure
**Feature Type**: Background Processing
**Mission**: Implementation of a background task runner capable of re-simulating the entire 15-year database.

---

## 🎯 Strategic Objective
Enable massive-scale model validation. When a core algorithm changes, the system must be able to "replay" all history to verify the improvement.

## 📋 Functional Requirements
- **Worker Process**: Dedicated node process to handle heavy simulation loops.
- **Priority Queue**: Prioritize active/tracked leagues over secondary ones.
- **Fail-Safe Resume**: Save progress to the DB every 10 fixtures to prevent data loss on crash.

## ✅ Acceptance Criteria
- User can trigger "Simulate All Leagues" without hanging the server.
- Telemetry UI shows a "Total Completion" progress bar for the bulk job.
