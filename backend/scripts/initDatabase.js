import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');

console.log('Initializing database at:', dbPath);

// Initialize SQL.js
const SQL = await initSqlJs();

// Create or load database
let db;
if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// Create tables
const schema = `
-- Players table
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_player_id INTEGER UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  age INTEGER,
  nationality TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_team_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT
);

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_league_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT
);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT UNIQUE NOT NULL,
  year INTEGER NOT NULL
);

-- Player club statistics
CREATE TABLE IF NOT EXISTS player_club_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  matches INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  UNIQUE(player_id, team_id, league_id, season_id)
);

-- Player national team statistics (using same structure, team_id references national team in teams table)
CREATE TABLE IF NOT EXISTS player_national_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  matches INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  UNIQUE(player_id, team_id, league_id, season_id)
);

-- Trophies table
CREATE TABLE IF NOT EXISTS trophies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT
);

-- Player trophies
CREATE TABLE IF NOT EXISTS player_trophies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  team_id INTEGER,
  season_id INTEGER NOT NULL,
  trophy_id INTEGER NOT NULL,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (trophy_id) REFERENCES trophies(id),
  UNIQUE(player_id, trophy_id, season_id)
);

-- Club standings table
CREATE TABLE IF NOT EXISTS standings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  rank INTEGER,
  points INTEGER,
  goals_diff INTEGER,
  form TEXT,
  status TEXT,
  description TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  UNIQUE(team_id, league_id, season_id)
);

-- Club trophies table
CREATE TABLE IF NOT EXISTS team_trophies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  trophy_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  place TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (trophy_id) REFERENCES trophies(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  UNIQUE(team_id, trophy_id, season_id)
);

-- Club detailed statistics per league/season
CREATE TABLE IF NOT EXISTS team_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  league_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  UNIQUE(team_id, league_id, season_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_api_id ON players(api_player_id);
CREATE INDEX IF NOT EXISTS idx_teams_api_id ON teams(api_team_id);
CREATE INDEX IF NOT EXISTS idx_leagues_api_id ON leagues(api_league_id);
CREATE INDEX IF NOT EXISTS idx_player_club_stats_player ON player_club_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_club_stats_team ON player_club_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_player_club_stats_season ON player_club_stats(season_id);
CREATE INDEX IF NOT EXISTS idx_player_national_stats_player ON player_national_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_trophies_player ON player_trophies(player_id);
CREATE INDEX IF NOT EXISTS idx_standings_team ON standings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_statistics_team ON team_statistics(team_id);

-- League classifications table
CREATE TABLE IF NOT EXISTS league_classifications (
  league_id INTEGER PRIMARY KEY,
  competition_type TEXT NOT NULL CHECK(competition_type IN ('championship', 'cup', 'international')),
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_league_classifications_type ON league_classifications(competition_type);
`;

// Execute schema
db.run(schema);

// Save database to file
const data = db.export();
writeFileSync(dbPath, data);

console.log('✅ Database initialized successfully!');
console.log('Tables created:');
console.log('  - players');
console.log('  - teams');
console.log('  - leagues');
console.log('  - seasons');
console.log('  - player_club_stats');
console.log('  - national_teams');
console.log('  - player_national_stats');
console.log('  - trophies');
console.log('  - player_trophies');

db.close();
