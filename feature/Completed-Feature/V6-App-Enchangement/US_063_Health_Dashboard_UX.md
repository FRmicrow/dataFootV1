# US_063: DB Health Dashboard & Prescription UX

**Role: Frontend Developer**

## User Story
**As a** Data Manager  
**I want** a dedicated dashboard to visualize database health  
**So that** I can manage data gaps and duplicates through a clean, decision-oriented interface.

## Acceptance Criteria
- **Given** the Admin section  
- **When** I click "DB Health"  
- **Then** I see a summary of:
    - Count of Missing Data Gaps.
    - Count of Duplicate Candidates.
    - Total Data Consistency score (%).
- **Given** the "Prescription List"  
- **When** I review a candidate merge  
- **Then** it must show a side-by-side comparison of the two entities (e.g., "Player A vs Player B").
- **When** I click "Resolve Gap"  
- **Then** the UI must show a real-time progress bar for the targeted re-import.
- **Given** a completed cleanup  
- **Then** the UI must generate a downloadable "Health Report" (PDF/Text) of the changes made.

## Functional Notes
- The goal is to make a "Medical" themed dashboard where the DB is the patient.
- Decision-making should be streamlined: "Merge All", "Skip", "Manual Edit".

## Technical Notes
- **Component**: Create `HealthCenterPage` in the `v3` components.
- Use high-contrast indicators for "Critical" gaps vs "Minor" anomalies.
- Integrate with the Telemetry Logger from US_043 to show real-time repair progress.
