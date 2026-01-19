# Football Player Database Application

A local web application for searching, importing, and managing football player data using the API-Football v3 API. Built with Node.js, React, and SQLite for a completely local experience.

## 🎯 Features

- **Player Search**: Search for any football player using the API-Football database
- **Smart Import**: Import complete player profiles including:
  - Club statistics by season
  - National team statistics
  - Trophies and achievements
  - All stored locally in SQLite
- **Offline Browsing**: View all imported player data without making external API calls
- **Rate Limiting**: Intelligent API request queue system respecting the 10 requests/minute limit
- **Modern UI**: Clean, gradient-styled interface with responsive design

## 📋 Prerequisites

- **Node.js** version 18 or higher
- **npm** (comes with Node.js)

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Initialize Database

```bash
npm run init-db
```

You should see:
```
✅ Database initialized successfully!
Tables created:
  - players
  - teams
  - leagues
  - seasons
  - player_club_stats
  - national_teams
  - player_national_stats
  - trophies
  - player_trophies
```

### 3. Start Backend Server

```bash
npm start
```

The backend server will start on `http://localhost:3001`

### 4. Install Frontend Dependencies

Open a new terminal:

```bash
cd frontend
npm install
```

### 5. Start Frontend Development Server

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### 6. Open in Browser

Navigate to `http://localhost:5173` in your web browser.

## 📁 Project Structure

```
statFootV3/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # SQLite configuration
│   │   ├── services/
│   │   │   ├── apiQueue.js          # Rate limiting & queue system
│   │   │   └── footballApi.js       # API-Football integration
│   │   ├── routes/
│   │   │   └── api.js               # Express routes
│   │   ├── controllers/
│   │   │   ├── searchController.js  # Search functionality
│   │   │   ├── importController.js  # Import logic
│   │   │   └── playerController.js  # Database queries
│   │   └── server.js                # Express server
│   ├── scripts/
│   │   └── initDatabase.js          # Database initialization
│   ├── database.sqlite              # SQLite database (created after init)
│   ├── package.json
│   ├── .env                         # API configuration
│   └── .gitignore
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ImportPage.jsx       # Player search & import
    │   │   ├── DatabasePage.jsx     # Player grid view
    │   │   └── PlayerDetail.jsx     # Detailed player stats
    │   ├── services/
    │   │   └── api.js               # Frontend API client
    │   ├── App.jsx                  # Main app component
    │   ├── App.css                  # Styling
    │   └── main.jsx                 # React entry point
    ├── package.json
    ├── vite.config.js
    └── index.html
```

## 🔌 API Endpoints

### Backend API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?name={playerName}` | Search players via API-Football |
| POST | `/api/import/:playerId` | Import a player into the database |
| GET | `/api/players` | Get all players from local database |
| GET | `/api/player/:id` | Get complete player data with stats |
| GET | `/api/queue-status` | Get current API queue status |
| GET | `/health` | Health check endpoint |

## 📊 Database Schema

### Core Tables

**players**: Player profile information
- `id`, `api_player_id`, `first_name`, `last_name`, `age`, `nationality`, `photo_url`

**teams**: Club teams
- `id`, `api_team_id`, `name`, `logo_url`

**leagues**: Football leagues
- `id`, `api_league_id`, `name`, `country`

**seasons**: Season labels
- `id`, `label` (e.g., "2023/2024"), `year`

### Statistics Tables

**player_club_stats**: Club performance by season
- Links: `player_id → players`, `team_id → teams`, `league_id → leagues`, `season_id → seasons`
- Stats: `matches`, `goals`, `assists`, `minutes_played`

**player_national_stats**: National team performance
- Links: `player_id → players`, `national_team_id → national_teams`, `season_id → seasons`
- Stats: `matches`, `goals`, `assists`

**player_trophies**: Trophies won
- Links: `player_id → players`, `trophy_id → trophies`, `season_id → seasons`, `team_id → teams` (optional)

## ⚙️ How It Works

### API Rate Limiting

The application implements a sophisticated queue system to handle API-Football's rate limit of **10 requests per minute**:

1. **Request Queue**: All API requests are added to a FIFO queue
2. **Rate Tracking**: Tracks the number of requests made in the last 60 seconds
3. **Automatic Throttling**: Pauses processing when the limit is reached
4. **Smart Retry**: If a request fails due to rate limiting (HTTP 429), it's automatically retried after 60 seconds
5. **Deduplication**: Prevents duplicate requests from being queued

### Import Process

When you import a player:

1. **Profile Fetch**: Retrieves basic player information
2. **Season Discovery**: Gets available seasons from the API
3. **Statistics Download**: Imports stats for the last 10 seasons
4. **Data Normalization**: Separates club and national team statistics
5. **Trophy Import**: Fetches and stores all trophies won
6. **Database Storage**: All data is stored in the local SQLite database

⚠️ **Note**: Importing a player with a long career may take several minutes due to rate limiting.

## 🎨 User Interface

### Pages

1. **Import Page** (`/import`)
   - Search for players by name
   - View search results with team info
   - Import button for each player
   - Real-time import status feedback

2. **Database Page** (`/database`)
   - Grid view of all imported players
   - Player cards with photo, name, age, nationality
   - Click to view detailed stats

3. **Player Detail Page** (`/player/:id`)
   - Three-tab interface:
     - **Club**: Statistics grouped by club and season
     - **National Team**: International statistics
     - **Trophies**: All trophies won
   - All data from local database (no API calls)

## 🔧 Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
API_FOOTBALL_KEY=92dd9cdae2f05e395cf02b5f51f38efb
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
PORT=3001
```

### Frontend Configuration

The frontend is configured to proxy API requests to the backend. See `frontend/vite.config.js`.

## 🐛 Troubleshooting

### Database Issues

If you encounter database errors:

```bash
cd backend
rm database.sqlite  # Delete existing database
npm run init-db     # Reinitialize
```

### Port Already in Use

If port 3001 or 5173 is already in use, you can change them:

- Backend: Edit `PORT` in `backend/.env`
- Frontend: Edit `server.port` in `frontend/vite.config.js`

### API Rate Limit Errors

If you see many rate limit errors:
- Wait 1 minute before trying again
- Import players one at a time
- Check the queue status at `/api/queue-status`

### Missing Dependencies

If you get module not found errors:

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📝 Development Scripts

### Backend

```bash
npm start        # Start production server
npm run dev      # Start with auto-reload (Node.js 18+ required)
npm run init-db  # Initialize/reset database
```

### Frontend

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🔐 Security Notes

- The `.env` file containing your API key is included in `.gitignore`
- Never commit your API key to version control
- The application is designed for local use only
- SQLite database is stored locally and not synced

## 🎯 Architecture Principles

This application follows these design principles:

- **Local-First**: All data stored locally in SQLite
- **Simple & Maintainable**: Clear code structure, no over-engineering
- **Rate Limit Compliance**: Strict adherence to API limits
- **Offline Capable**: Browse imported data without internet
- **Modular Design**: Easy to extend and modify

## 📄 License

This is a personal project for local use. API-Football data is subject to their terms of service.

## 🙏 Credits

- **API-Football**: Player data provider
- **Node.js & Express**: Backend framework
- **React**: Frontend framework
- **SQLite**: Local database
- **better-sqlite3**: Fast SQLite driver
- **Vite**: Frontend build tool

---

**Enjoy managing your football player database! ⚽**
