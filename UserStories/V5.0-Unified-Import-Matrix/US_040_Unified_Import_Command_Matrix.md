# US_040: Unified Import Command Matrix

## User Story
**As a** Data Manager  
**I want** a centralized high-density matrix view of all competitions and their data types  
**So that** I can instantly visualize missing data gaps and manage imports from a single interface.

## Acceptance Criteria
- **Given** the new Import Hub is loaded  
- **When** I view the Matrix  
- **Then** I see **Competitions** as rows and **Seasons** as columns (sorted by importance then year).
- **Given** a specific "Competition x Season" cell  
- **When** I hover or view the cell  
- **Then** I see 4 distinct status indicators: **[C]** Core, **[E]** Events, **[L]** Lineups, **[T]** Trophies.
- **Given** the status indicators  
- **Then** they must follow this color logic:
    - 🔴 **Missing**: No data detected in the database.
    - 🟡 **Partial**: Data exists but the import pillar flag is not explicitly set to 1.
    - 🟢 **Complete**: Import pillar flag is set to 1.
- **When** I click a "Missing" or "Partial" indicator  
- **Then** that specific data pillar is added to the **Batch Staging Queue**.
- **When** I click the "Sync All Missing" button on a **Competition Row**  
- **Then** the system must identify all missing/partial pillars across all available seasons for that competition and start the **Full League Import Process** immediately.
- **When** the import process is running  
- **Then** a **Centralized Logger Console** must appear, showing the real-time progress of each data pillar for each season.
- **When** I view a tooltip on a pillar indicator  
- **Then** it must display the **Last Sync Date** for that specific pillar.

## Functional Notes
- The "Sync All Missing" button is a shortcut to avoid clicking individual pillars for a league that needs a full backfill.
- The matrix should support a "Mass Select" for a whole Competition row to quickly queue all missing pillars for that league across all years.
- The view should replace the current 4 disparate import pages with a single entry point.

## Technical Notes
- **Frontend**: Use a grid layout or a performant table. Consider virtualization if the league list grows significantly.
- **Backend API**: New endpoint `/api/v3/import/matrix-status` required to aggregate flags and sync dates from `V3_League_Seasons`.
- **SSE (Server-Sent Events)**: The backend must stream detailed progress (e.g., "Importing Premier League 2023: Fixture 45/380") to feed the frontend logger.
- **UI State**: The "Batch Queue" should be managed globally or at the page level to allow multi-league batching before execution.
