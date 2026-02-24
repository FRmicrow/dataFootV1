# US_062: Health Prescription & Data Recovery System

**Role: Backend Developer / Fullstack**

## User Story
**As a** Data Manager  
**I want** the system to generate "Health Prescriptions" for data gaps and anomalies  
**So that** I can manually review and trigger data repairs (re-imports or merges) as needed.

## Acceptance Criteria
- **Given** a full DB scan  
- **When** the auditor detects a "Data Gap" (e.g., Mbappe missing 2018 season)  
- **Then** it must create a `V3_Health_Prescription` record with type `MISSING_DATA`.
- **Given** a "Health Prescription" list  
- **When** I trigger a "Repair" via the API  
- **Then** the system must:
    - **MISSING_DATA**: Trigger a targeted import for the specific season/player.
    - **DUPLICATE_CANDIDATE**: Execute the merge logic from US_061.
    - **DATA_INCONSISTENCY**: Clear and re-import the impacted matches/stats.
- **Given** a completed prescription  
- **Then** mark it as `RESOLVED` and store the result in the audit logs.

## Functional Notes
- This puts the Power User (Product Owner) in control of the API costs and data integrity.
- No automated mass-reimports are allowed; everything must be "Prescribed" and then "Triggered".

## Technical Notes
- **API Endpoint**: `POST /api/v3/health/prescribe` (generates the list).
- **API Endpoint**: `POST /api/v3/health/execute` (processes the choice).
- Use a job queue (Bull or similar) to handle the async re-imports triggered by prescriptions.
