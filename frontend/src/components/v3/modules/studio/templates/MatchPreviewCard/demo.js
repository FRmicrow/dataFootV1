/**
 * Demo data for MatchPreviewCard.
 *
 * IMPORTANT: This is visual placeholder only. In production, the data
 * must always come from the V4 backend via useMatchPreviewBackend().
 * The Studio displays a clear "DEMO" badge when this fallback is used.
 */
const demoData = {
  match: {
    match_id: 'demo-001',
    competition_id: '9',
    competition_name: 'Premier League',
    competition_logo: null,
    season: '2025/2026',
    matchday: 35,
    round_label: 'Regular Season — 35',
    match_date: '2026-05-10T19:00:00Z',
    kickoff_time: '19:00',
    venue_name: 'Emirates Stadium',
    venue_city: 'London',
  },
  home: {
    club_id: '11',
    name: 'Arsenal',
    short_name: 'ARS',
    logo_url: null,
    primary_color: null,
    standings: {
      position: 2,
      played: 34,
      points: 76,
      wins: 24,
      draws: 4,
      losses: 6,
      goals_for: 78,
      goals_against: 30,
      goal_diff: 48,
    },
    recent_form: ['W', 'D', 'W', 'L', 'W'],
    season_xg_avg: 2.1,
    home_away_record: { played: 16, wins: 13, draws: 2, losses: 1, win_rate: 0.813 },
  },
  away: {
    club_id: '281',
    name: 'Manchester City',
    short_name: 'MCI',
    logo_url: null,
    primary_color: null,
    standings: {
      position: 1,
      played: 34,
      points: 82,
      wins: 26,
      draws: 4,
      losses: 4,
      goals_for: 89,
      goals_against: 28,
      goal_diff: 61,
    },
    recent_form: ['W', 'W', 'W', 'D', 'W'],
    season_xg_avg: 2.6,
    home_away_record: { played: 16, wins: 11, draws: 3, losses: 2, win_rate: 0.688 },
  },
  h2h: {
    last_meetings: [
      {
        match_id: '9001',
        date: '2025-11-18T15:30:00Z',
        competition_name: 'Premier League',
        home_name: 'Manchester City',
        away_name: 'Arsenal',
        home_score: 2,
        away_score: 1,
      },
      {
        match_id: '9002',
        date: '2025-03-10T16:00:00Z',
        competition_name: 'Premier League',
        home_name: 'Arsenal',
        away_name: 'Manchester City',
        home_score: 0,
        away_score: 0,
      },
      {
        match_id: '9003',
        date: '2024-10-08T19:45:00Z',
        competition_name: 'Premier League',
        home_name: 'Manchester City',
        away_name: 'Arsenal',
        home_score: 3,
        away_score: 1,
      },
    ],
    summary: { home_wins: 0, draws: 1, away_wins: 2, total: 3 },
  },
  prediction: {
    probs: { home_win: 0.38, draw: 0.27, away_win: 0.35 },
    confidence_score: 0.71,
    model_name: 'catboost_v4_2',
    created_at: '2026-04-22T08:00:00Z',
  },
  data_gaps: [],
  generated_at: '2026-04-23T16:32:00Z',
};

export default demoData;
