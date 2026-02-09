# V3 Database Schema Documentation

## 🏗 Overview
The V3 schema is a complete redesign aligned with the **API-Football architecture**. It prioritizes precise data tracking, historical accuracy, and comprehensive statistics.

## 🔑 Key Concepts

### 1. Seasons as Tracking Hubs
The `V3_League_Seasons` table acts as the "Source of Truth" for data status. It tracks both API coverage and import progress for every competition edition.
- **Coverage Flags**: `coverage_standings`, `coverage_players`, etc. (What the API provides).
- **Import Flags**: `imported_standings`, `imported_fixtures`, `imported_players` (What we have actually fetched).

### 2. Analytical Statistics (`V3_Player_Stats`)
This table is expanded to capture over 50 data points from the API, including detailed breakdowns of:
- **Games**: Apps, lineups, minutes, rating, position.
- **Performance**: Shots, Goals (assists/conceded/saves), Passes (total/key/accuracy).
- **Defense/Control**: Tackles, Duels, Dribbles.
- **Discipline**: Fouls, Cards (yellow/red), Penalties.

### 3. Competitions Management
- **`V3_Standings`**: Stores the complete league table for any given season/group.
- **`V3_Fixtures`**: Stores match-by-match results, including halftime/fulltime scores and venue information.

## 📊 Core Tables

### 🌍 **V3_Countries**
Base regions.
- `country_id`, `name`, `code`, `api_id`

### 🏆 **V3_Leagues** & **V3_League_Seasons**
- **`V3_Leagues`**: The competition brand (e.g., "Premier League", "World Cup").
- **`V3_League_Seasons`**: The specific tracker for a year (e.g., "2023").

### 🏟️ **V3_Teams** & **V3_Venues**
Clubs and their primary stadiums.
- `V3_Teams`: Linked to `V3_Venues`. Stores `api_id`, `is_national_team` (flag for club vs country), and basic info.

### 👤 **V3_Players** & **V3_Player_Stats**
- **`V3_Players`**: Global profile snapshot.
- **`V3_Player_Stats`**: High-granularity seasonal metrics.

### 📅 **Standings & Results** (US-V3-POC-006)
- **`V3_Standings`**: League rankings with wins, draws, losses, and goal difference.
- **`V3_Fixtures`**: All match results with detailed scores.

## 🛠 Usage Example
To check which leagues have missing player data for 2023:
```sql
SELECT 
    l.name, 
    ls.season_year
FROM V3_Leagues l
JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
WHERE ls.season_year = 2023 AND ls.imported_players = 0;
```
