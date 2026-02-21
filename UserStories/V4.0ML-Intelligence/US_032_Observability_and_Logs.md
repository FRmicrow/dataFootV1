# US_032: Enhanced Observability & Error Stream

## 🎯 High-Level Objective
Transform the log viewer into a professional "Operations Center" where the user can see exactly why rows are being processed or why they failed. Transparent logs prevent "Mystery Failures."

## 📋 Requirements
1. **Multi-Stream Logs**: Separate the raw terminal output into three UI tabs/views:
   - **Activity**: General progress (e.g., *"Processing Match 459/1000"*).
   - **Success**: Matches successfully added to the Store.
   - **Issues**: Matches skipped or failed due to missing logic (e.g., *"Skipped: Player statistics not found"*).
2. **Persistence**: Logs should be stored in a file so refreshing the page doesn't lose the history of the current "Empowerment" session.
3. **Data Health Check**: A pre-calculating tool that warns the user: *"Premier League is 98% complete, but Ligue 1 is missing lineups for 2012 - suggest re-import before empowering."*

## ✅ Acceptance Criteria (AC)
- [ ] Log window uses color-coding: Blue (Info), Green (Success), Red (Warning/Error).
- [ ] Log entry format: `[HH:mm:ss] [League] [FixtureID] [Status] Message`.
- [ ] User can download the session log as a `.txt` file for debugging.
- [ ] The dashboard shows a "Global Progress" bar summarizing all leagues triggered.

## 🛠️ Technical Implementation Notes
- **Streaming**: Move from polling `logs?lines=50` to a more robust `tail` logic in the backend.
- **Python**: Standardize `logger.info` and `logger.warning` formats to make regex parsing easier for the Frontend.
