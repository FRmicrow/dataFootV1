# Football Player Database - Schema Documentation

## Database Overview

This database uses a V2 schema for managing football player data, clubs, competitions, and statistics.

---

## Core Tables

### 🌍 **V2_countries**
Primary reference table for all countries/regions.

| Column | Type | Description |
|--------|------|-------------|
| `country_id` | INTEGER PK | Unique identifier |
| `country_name` | TEXT UNIQUE | Country name |
| `country_code` | TEXT UNIQUE | ISO code (FRA, ESP, ENG) |
| `importance_rank` | INTEGER | Sorting priority (1-5 for major leagues) |
| `flag_url` | TEXT | Country flag image URL |
| `flag_small_url` | TEXT | Small flag image URL |
| `continent` | TEXT | Continent name |
| `created_at` | DATETIME | Creation timestamp |

---

### 🏆 **V2_trophy_type**
Categories of trophies/competitions.

| Column | Type | Description |
|--------|------|-------------|
| `trophy_type_id` | INTEGER PK | Unique identifier |
| `type_name` | TEXT UNIQUE | UEFA, FIFA, Domestic League, etc. |
| `type_order` | INTEGER | Display ordering |
| `created_at` | DATETIME | Creation timestamp |

---

### 🏟️ **V2_competitions**
All football competitions (leagues, cups, tournaments).

| Column | Type | Description |
|--------|------|-------------|
| `competition_id` | INTEGER PK | Unique identifier |
| `competition_name` | TEXT | Full competition name |
| `competition_short_name` | TEXT | Abbreviation (UCL, EPL, La Liga) |
| `trophy_type_id` | INTEGER FK | → V2_trophy_type |
| `country_id` | INTEGER FK | → V2_countries (NULL for international) |
| `level` | INTEGER | Tier level (1 = top tier) |
| `is_active` | BOOLEAN | Currently active |
| `start_year` | INTEGER | Year founded |
| `end_year` | INTEGER | Year ended (NULL if active) |
| `api_id` | INTEGER | External API reference |
| `created_at` | DATETIME | Creation timestamp |

**Relationships:**
- `trophy_type_id` → `V2_trophy_type.trophy_type_id`
- `country_id` → `V2_countries.country_id`

---

### ⚽ **V2_clubs**
Football clubs/teams.

| Column | Type | Description |
|--------|------|-------------|
| `club_id` | INTEGER PK | Unique identifier |
| `club_name` | TEXT | Full club name |
| `club_short_name` | TEXT | Abbreviated name |
| `country_id` | INTEGER FK | → V2_countries |
| `city` | TEXT | City location |
| `stadium_name` | TEXT | Home stadium |
| `stadium_capacity` | INTEGER | Stadium capacity |
| `founded_year` | INTEGER | Year founded |
| `club_logo_url` | TEXT | Club logo image URL |
| `is_active` | BOOLEAN | Currently active |
| `api_id` | INTEGER | External API reference |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

**Relationships:**
- `country_id` → `V2_countries.country_id`

---

### 👤 **V2_players**
Football players.

| Column | Type | Description |
|--------|------|-------------|
| `player_id` | INTEGER PK | Unique identifier |
| `first_name` | TEXT | First name |
| `last_name` | TEXT | Last name |
| `date_of_birth` | DATE | Birth date |
| `nationality_id` | INTEGER FK | → V2_countries (primary nationality) |
| `photo_url` | TEXT | Player photo URL |
| `position` | TEXT | GK, DEF, MID, FWD |
| `preferred_foot` | TEXT | Left, Right, Both |
| `height_cm` | INTEGER | Height in centimeters |
| `weight_kg` | INTEGER | Weight in kilograms |
| `birth_country` | TEXT | Country of birth |
| `birth_place` | TEXT | City of birth |
| `is_active` | BOOLEAN | Currently active |
| `api_id` | INTEGER | External API reference |
| `fully_imported` | BOOLEAN | Basic info imported flag |
| `last_full_sync` | DATETIME | Timestamp of last career audit/sync |
| `is_history_complete` | BOOLEAN | Flag for fully backfilled career |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

**Relationships:**
- `nationality_id` → `V2_countries.country_id`

---

## Statistics & History Tables

### 📊 **V2_player_statistics**
Player performance statistics by season and competition.

| Column | Type | Description |
|--------|------|-------------|
| `stat_id` | INTEGER PK | Unique identifier |
| `player_id` | INTEGER FK | → V2_players |
| `club_id` | INTEGER FK | → V2_clubs |
| `competition_id` | INTEGER FK | → V2_competitions (NULL for all) |
| `season` | TEXT | Season (e.g., '2023-24') |
| `year` | INTEGER | Year for easier querying |
| `matches_played` | INTEGER | Total matches |
| `matches_started` | INTEGER | Matches started |
| `minutes_played` | INTEGER | Total minutes |
| `goals` | INTEGER | Goals scored |
| `assists` | INTEGER | Assists |
| `yellow_cards` | INTEGER | Yellow cards |
| `red_cards` | INTEGER | Red cards |
| `clean_sheets` | INTEGER | Clean sheets (GK/DEF) |
| `penalty_goals` | INTEGER | Penalty goals |
| `penalty_misses` | INTEGER | Penalty misses |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

**Unique Constraint:** `(player_id, club_id, competition_id, season)`

**Relationships:**
- `player_id` → `V2_players.player_id` (CASCADE DELETE)
- `club_id` → `V2_clubs.club_id`
- `competition_id` → `V2_competitions.competition_id`

---

### 📜 **V2_player_club_history**
Player transfer history.

| Column | Type | Description |
|--------|------|-------------|
| `history_id` | INTEGER PK | Unique identifier |
| `player_id` | INTEGER FK | → V2_players |
| `club_id` | INTEGER FK | → V2_clubs |
| `season_start` | TEXT | Start season (e.g., '2023-24') |
| `season_end` | TEXT | End season (NULL if current) |
| `year_start` | INTEGER | Start year |
| `year_end` | INTEGER | End year (NULL if current) |
| `is_loan` | BOOLEAN | Loan transfer |
| `shirt_number` | INTEGER | Jersey number |
| `created_at` | DATETIME | Creation timestamp |

**Relationships:**
- `player_id` → `V2_players.player_id` (CASCADE DELETE)
- `club_id` → `V2_clubs.club_id`

---

### 🏅 **V2_player_trophies**
Trophies won by players.

| Column | Type | Description |
|--------|------|-------------|
| `player_trophy_id` | INTEGER PK | Unique identifier |
| `player_id` | INTEGER FK | → V2_players |
| `club_id` | INTEGER FK | → V2_clubs (NULL for individual awards) |
| `competition_id` | INTEGER FK | → V2_competitions |
| `season` | TEXT | Season won (e.g., '2023-24') |
| `year` | INTEGER | Year won |
| `is_team_trophy` | BOOLEAN | Team trophy vs individual award |
| `was_key_player` | BOOLEAN | Significant contributor |
| `appearances_in_competition` | INTEGER | Matches played |
| `goals_in_competition` | INTEGER | Goals in trophy run |
| `created_at` | DATETIME | Creation timestamp |

**Relationships:**
- `player_id` → `V2_players.player_id` (CASCADE DELETE)
- `club_id` → `V2_clubs.club_id`
- `competition_id` → `V2_competitions.competition_id`

---

### 🎖️ **V2_individual_awards**
Individual awards (Ballon d'Or, Golden Boot, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `award_id` | INTEGER PK | Unique identifier |
| `award_name` | TEXT UNIQUE | Award name |
| `award_type` | TEXT | Player, Goalkeeper, Young Player |
| `trophy_type_id` | INTEGER FK | → V2_trophy_type |
| `organizing_body` | TEXT | FIFA, UEFA, League |
| `is_active` | BOOLEAN | Currently awarded |
| `created_at` | DATETIME | Creation timestamp |

**Relationships:**
- `trophy_type_id` → `V2_trophy_type.trophy_type_id`

---

### 🏆 **V2_player_individual_awards**
Individual awards won by players.

| Column | Type | Description |
|--------|------|-------------|
| `player_award_id` | INTEGER PK | Unique identifier |
| `player_id` | INTEGER FK | → V2_players |
| `award_id` | INTEGER FK | → V2_individual_awards |
| `year` | INTEGER | Year won |
| `season` | TEXT | Season (if seasonal) |
| `rank` | INTEGER | Placement (1st, 2nd, 3rd) |
| `created_at` | DATETIME | Creation timestamp |

**Unique Constraint:** `(player_id, award_id, year, rank)`

**Relationships:**
- `player_id` → `V2_players.player_id` (CASCADE DELETE)
- `award_id` → `V2_individual_awards.award_id`

---

### 🌐 **V2_player_nationalities**
Multiple nationalities for players.

| Column | Type | Description |
|--------|------|-------------|
| `player_nationality_id` | INTEGER PK | Unique identifier |
| `player_id` | INTEGER FK | → V2_players |
| `country_id` | INTEGER FK | → V2_countries |
| `is_primary` | BOOLEAN | Primary nationality |

**Unique Constraint:** `(player_id, country_id)`

**Relationships:**
- `player_id` → `V2_players.player_id` (CASCADE DELETE)
- `country_id` → `V2_countries.country_id`

---

### 🏟️ **V2_national_teams**
National team information.

| Column | Type | Description |
|--------|------|-------------|
| `national_team_id` | INTEGER PK | Unique identifier |
| `country_id` | INTEGER FK | → V2_countries |
| `federation_name` | TEXT | Federation name |
| `code` | TEXT | Team code |
| `confederation_name` | TEXT | Confederation (UEFA, CONMEBOL) |
| `founded_year` | INTEGER | Year founded |
| `national_logo` | TEXT | Logo URL |

**Relationships:**
- `country_id` → `V2_countries.country_id`

---

### 🏆 **V2_club_trophies**
Trophies won by clubs.

| Column | Type | Description |
|--------|------|-------------|
| `club_trophy_id` | INTEGER PK | Unique identifier |
| `club_id` | INTEGER FK | → V2_clubs |
| `competition_id` | INTEGER FK | → V2_competitions |
| `year` | INTEGER | Year won |

**Unique Constraint:** `(club_id, competition_id, year)`

**Relationships:**
- `club_id` → `V2_clubs.club_id` (CASCADE DELETE)
- `competition_id` → `V2_competitions.competition_id`

---

## Utility Tables

### 📥 **V2_import_status**
Track import progress for leagues/seasons.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Unique identifier |
| `league_id` | INTEGER | League being imported |
| `season` | INTEGER | Season year |
| `status` | TEXT | IN_PROGRESS, COMPLETED, FAILED |
| `total_players` | INTEGER | Total players to import |
| `imported_players` | INTEGER | Players imported so far |
| `updated_at` | DATETIME | Last update timestamp |

**Unique Constraint:** `(league_id, season)`

---

### ❓ **V2_unresolved_competitions**
Competitions that couldn't be automatically matched.

| Column | Type | Description |
|--------|------|-------------|
| `unresolved_id` | INTEGER PK | Unique identifier |
| `player_id` | INTEGER FK | → V2_players |
| `club_id` | INTEGER FK | → V2_clubs |
| `season` | TEXT | Season |
| `league_name` | TEXT | Competition name from API |
| `league_api_id` | INTEGER | API competition ID |
| `matches_played` | INTEGER | Matches played |
| `goals` | INTEGER | Goals scored |
| `assists` | INTEGER | Assists |
| `resolved` | BOOLEAN | Has been resolved |
| `resolved_competition_id` | INTEGER FK | → V2_competitions |
| `created_at` | DATETIME | Creation timestamp |
| `resolved_at` | DATETIME | Resolution timestamp |

**Unique Constraint:** `(player_id, club_id, season, league_name)`

**Relationships:**
- `player_id` → `V2_players.player_id`
- `club_id` → `V2_clubs.club_id`
- `resolved_competition_id` → `V2_competitions.competition_id`

---

## Entity Relationship Diagram

```
┌─────────────────┐
│  V2_countries   │
│  (country_id)   │◄──────────┐
└─────────────────┘           │
        ▲                     │
        │                     │
        │                     │
┌───────┴──────────┐    ┌─────┴──────────┐
│   V2_players     │    │   V2_clubs     │
│   (player_id)    │    │   (club_id)    │
└──────────────────┘    └────────────────┘
        ▲                     ▲
        │                     │
        │                     │
        ├─────────────────────┤
        │                     │
┌───────┴─────────────────────┴────┐
│     V2_player_statistics         │
│  (player_id, club_id,            │
│   competition_id, season)        │
└──────────────────────────────────┘
                │
                │
                ▼
┌─────────────────────────────┐
│     V2_competitions         │
│     (competition_id)        │◄──────┐
└─────────────────────────────┘       │
                ▲                     │
                │                     │
┌───────────────┴─────────┐   ┌───────┴──────────┐
│  V2_player_trophies     │   │ V2_trophy_type   │
│  (player_id,            │   │ (trophy_type_id) │
│   competition_id)       │   └──────────────────┘
└─────────────────────────┘
```

---

## Key Design Principles

1. **Normalization**: Data is properly normalized to avoid redundancy
2. **Referential Integrity**: Foreign keys maintain data consistency
3. **Cascade Deletes**: Player deletions cascade to related records
4. **Unique Constraints**: Prevent duplicate entries
5. **Timestamps**: Track creation and modification times
6. **API Integration**: External API IDs for synchronization
7. **Flexibility**: NULL values allow for incomplete data
8. **Performance**: Indexed foreign keys for fast queries

---

## Common Queries

### Get Player's Complete Statistics
```sql
SELECT p.*, ps.*, c.club_name, comp.competition_name
FROM V2_players p
JOIN V2_player_statistics ps ON p.player_id = ps.player_id
JOIN V2_clubs c ON ps.club_id = c.club_id
LEFT JOIN V2_competitions comp ON ps.competition_id = comp.competition_id
WHERE p.player_id = ?
ORDER BY ps.year DESC, ps.season DESC;
```

### Get Team's Players for a Season
```sql
SELECT DISTINCT p.*, ps.season
FROM V2_players p
JOIN V2_player_statistics ps ON p.player_id = ps.player_id
WHERE ps.club_id = ? AND ps.season = ?
ORDER BY p.last_name;
```

### Get Competition Standings
```sql
SELECT c.club_name, 
       SUM(ps.goals) as total_goals,
       COUNT(DISTINCT ps.player_id) as player_count
FROM V2_player_statistics ps
JOIN V2_clubs c ON ps.club_id = c.club_id
WHERE ps.competition_id = ? AND ps.season = ?
GROUP BY c.club_id
ORDER BY total_goals DESC;
```

---

**Database Version:** V2  
**Last Updated:** 2026-02-05  
**Total Tables:** 15 (V2 schema)
