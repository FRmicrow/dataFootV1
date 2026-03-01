# US_043: Real-Time Import Telemetry & Progress Logger

## User Story
**As a** Data Manager  
**I want** a detailed real-time progress console during imports  
**So that** I can monitor the exact status of long-running data ingestion tasks and detect bottlenecks.

## Acceptance Criteria
- **Given** an import process is active  
- **When** I view the **Import Hub Console**  
- **Then** I see a **Master Progress Bar** for the entire batch.
- **Given** a multi-season import  
- **Then** each season in the batch must have a **Dynamic Checklist** or progress sub-bar.
- **When** the backend streams an update via SSE  
- **Then** the console must display:
    - **Step Description**: "Fetching player stats for Haaland..."
    - **Counter**: "67/1500 Players"
    - **Rate Limit Status**: "Throttling (440 req/min reached)" (if applicable)
- **When** a pillar (e.g., Lineups) completes  
- **Then** the UI must show a **Success Checkmark** and the duration of the task.
- **Given** an error occurs  
- **Then** the console must highlight the specific match or player that failed without stopping the entire batch.

## Functional Notes
- The logger should be "Detachable" or persistent so the user can browse other parts of the admin while the import continues.
- Provide a "Download Log" button at the end of the process for debugging.

## Technical Notes
- **Frontend**: Use a dedicated `LoggerConsole` component with a scroll-to-bottom feature.
- **Data Flow**: Use a React Context or a robust state manager to shared `importStatus` across the app if the user navigates away.
- **Streaming**: Handle high-velocity log events from the Node.js backend to prevent UI freezing (throttle UI updates if necessary).
