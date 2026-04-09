# Documentation du Schéma Harmonisé V3 - StatFoot

## 🏗 Système de Migration
Le projet utilise désormais un système de migration structuré :
- **Dossier** : `backend/src/migrations/registry/`
- **Suivi** : Table `V3_Migrations` (id, name, applied_at)
- **Service** : `MigrationService.js`

## 📊 Schéma des Tables Principales (V3)

### 🌍 V3_Countries
Référentiel des pays.
- `country_id` (PK), `name`, `code`, `api_id`, `flag_url`

### 🏆 V3_Leagues
Compétitions officielles.
- `league_id` (PK), `api_id`, `name`, `type`, `logo_url`, `country_id`, `importance_rank`, `is_live_enabled`, `is_discovered`

### 📅 V3_League_Seasons
Suivi des éditions par saison.
- `league_season_id` (PK), `league_id`, `season_year`, `start_date`, `end_date`, `is_current`
- **Flags d'import** : `imported_fixtures`, `imported_players`, `imported_standings`, `imported_events`, `imported_lineups`, `imported_trophies`, `imported_fixture_stats`, `imported_player_stats`
- **Flags de synchronisation** (Dernière date) : `last_sync_core`, `last_sync_events`, etc.
- **État** : `sync_status` (NONE, PARTIAL, FULL)

### 🏟️ V3_Teams & V3_Venues
Clubs et stades.
- `V3_Teams` : `team_id`, `api_id`, `name`, `logo_url`, `is_national`, `venue_id`
- `V3_Venues` : `venue_id`, `api_id`, `name`, `address`, `city`, `capacity`, `surface`, `image_url`

### 👤 V3_Players & V3_Player_Stats
Données joueurs et performances granulaires.
- `V3_Players` : Profil global (nom, age, nationalité, api_id, etc.).
- `V3_Player_Stats` : Statistiques détaillées (apps, goals, assists, passes, tackles, etc.) par saison/équipe/ligue.

### 🎲 Odds & Predictions
- `V3_Odds_History` : Historique des cotes (fixture_id, bookmaker, market, values).
- `V3_Predictions` : Prédictions générées (fixture_id, edge_value, confidence_score, risk_level).

### 🛠 Administration & Forge
- `V3_Import_Status` : Registre détaillé de l'état d'import par pilier (core, events, lineups, etc.).
- `V3_Forge_Simulations` : Suivi des simulations de stratégies (status, stage, heartbeat, results).
- `V3_Health_Prescriptions` : Recommandations de maintenance DB.

---

## 🔧 Maintenance
Toutes les modifications de schéma doivent passer par l'ajout d'un script dans `backend/src/migrations/registry/`.
Le format de nommage recommandé est `YYYYMMDD_XX_Description.js`.
