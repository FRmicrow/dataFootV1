import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database.js', () => ({
    default: {
        all: vi.fn(),
        get: vi.fn(),
    },
}));

vi.mock('../../utils/logger.js', () => ({
    default: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('./StandingsV4Service.js', () => ({
    default: {
        calculateStandings: vi.fn(),
    },
}));

// Import AFTER mocks are registered
const { default: MatchPreviewContentServiceV4 } = await import('./MatchPreviewContentServiceV4.js');
const { default: db } = await import('../../config/database.js');
const { default: StandingsV4Service } = await import('./StandingsV4Service.js');

const coreRow = {
    match_id: '100001',
    competition_id: '9',
    season: '2025/2026',
    match_date: new Date('2026-05-10T19:00:00Z'),
    matchday: 35,
    round_label: 'Regular Season - 35',
    home_club_id: '11',
    away_club_id: '281',
    home_score: null,
    away_score: null,
    competition_name: 'Premier League',
    competition_logo: 'https://cdn.example.com/pl.png',
    home_name: 'Arsenal',
    home_short_name: 'ARS',
    home_logo: 'https://cdn.example.com/ars.png',
    away_name: 'Manchester City',
    away_short_name: 'MCI',
    away_logo: 'https://cdn.example.com/mci.png',
    venue_name: 'Emirates Stadium',
    venue_city: 'London',
};

describe('MatchPreviewContentServiceV4', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getMatchPreview', () => {
        it('returns notFound when the match does not exist', async () => {
            db.get.mockResolvedValueOnce(null); // fetchMatchCore returns null

            const result = await MatchPreviewContentServiceV4.getMatchPreview('999999');

            expect(result).toEqual({ notFound: true });
        });

        it('assembles a valid DTO for an upcoming match with complete data', async () => {
            // fetchMatchCore
            db.get.mockResolvedValueOnce(coreRow);

            // Standings (called twice: home, away)
            StandingsV4Service.calculateStandings.mockResolvedValue([
                { team_id: '11', rank: 2, played: 34, points: 76, win: 24, draw: 4, lose: 6,
                  goals_for: 78, goals_against: 30, goals_diff: 48 },
                { team_id: '281', rank: 1, played: 34, points: 82, win: 26, draw: 4, lose: 4,
                  goals_for: 89, goals_against: 28, goals_diff: 61 },
            ]);

            // fetchRecentForm home → all W/L/D rows
            db.all.mockResolvedValueOnce([
                { home_club_id: '11', away_club_id: '42', home_score: 2, away_score: 0, match_date: '2026-04-20' },
                { home_club_id: '30', away_club_id: '11', home_score: 1, away_score: 1, match_date: '2026-04-13' },
                { home_club_id: '11', away_club_id: '65', home_score: 3, away_score: 1, match_date: '2026-04-06' },
                { home_club_id: '15', away_club_id: '11', home_score: 2, away_score: 0, match_date: '2026-03-30' },
                { home_club_id: '11', away_club_id: '88', home_score: 2, away_score: 2, match_date: '2026-03-22' },
            ]);
            // fetchRecentForm away
            db.all.mockResolvedValueOnce([
                { home_club_id: '281', away_club_id: '31', home_score: 4, away_score: 1, match_date: '2026-04-19' },
                { home_club_id: '19', away_club_id: '281', home_score: 0, away_score: 2, match_date: '2026-04-12' },
                { home_club_id: '281', away_club_id: '46', home_score: 3, away_score: 0, match_date: '2026-04-05' },
                { home_club_id: '281', away_club_id: '22', home_score: 5, away_score: 1, match_date: '2026-03-29' },
                { home_club_id: '12', away_club_id: '281', home_score: 1, away_score: 3, match_date: '2026-03-21' },
            ]);

            // fetchSeasonXgAvg (home, away)
            db.get.mockResolvedValueOnce({ xg_avg: 2.1 }); // home
            db.get.mockResolvedValueOnce({ xg_avg: 2.6 }); // away

            // fetchHomeAwayRecord (home-home, away-away)
            db.get.mockResolvedValueOnce({ played: 16, wins: 13, draws: 2, losses: 1 });
            db.get.mockResolvedValueOnce({ played: 16, wins: 11, draws: 3, losses: 2 });

            // fetchH2H
            db.all.mockResolvedValueOnce([
                { match_id: '9001', date: new Date('2025-11-18'), competition_name: 'Premier League',
                  home_name: 'Manchester City', away_name: 'Arsenal', home_score: 2, away_score: 1,
                  home_club_id: '281' },
                { match_id: '9002', date: new Date('2025-03-10'), competition_name: 'Premier League',
                  home_name: 'Arsenal', away_name: 'Manchester City', home_score: 0, away_score: 0,
                  home_club_id: '11' },
            ]);

            // fetchPrediction
            db.get.mockResolvedValueOnce({
                prediction_json: { '1': 0.38, N: 0.27, '2': 0.35 },
                confidence_score: 0.71,
                model_name: 'catboost_v4_2',
                created_at: new Date('2026-04-22T08:00:00Z'),
            });

            const result = await MatchPreviewContentServiceV4.getMatchPreview('100001');

            expect(result.notFound).toBeUndefined();
            expect(result.data.match.match_id).toBe('100001');
            expect(result.data.home.name).toBe('Arsenal');
            expect(result.data.away.name).toBe('Manchester City');
            expect(result.data.home.standings.position).toBe(2);
            expect(result.data.away.standings.position).toBe(1);
            expect(result.data.home.recent_form).toHaveLength(5);
            expect(result.data.prediction.probs.home_win).toBeCloseTo(0.38, 2);
            expect(result.data.h2h.summary.total).toBe(2);
            expect(result.data.data_gaps).toEqual([]);
            expect(typeof result.data.generated_at).toBe('string');
        });

        it('reports data_gaps when ML prediction is missing', async () => {
            db.get.mockResolvedValueOnce(coreRow);
            StandingsV4Service.calculateStandings.mockResolvedValue([
                { team_id: '11', rank: 2, played: 34, points: 76, win: 24, draw: 4, lose: 6,
                  goals_for: 78, goals_against: 30, goals_diff: 48 },
                { team_id: '281', rank: 1, played: 34, points: 82, win: 26, draw: 4, lose: 4,
                  goals_for: 89, goals_against: 28, goals_diff: 61 },
            ]);
            db.all.mockResolvedValueOnce([]); // home form
            db.all.mockResolvedValueOnce([]); // away form
            db.get.mockResolvedValueOnce({ xg_avg: null }); // home xg
            db.get.mockResolvedValueOnce({ xg_avg: null }); // away xg
            db.get.mockResolvedValueOnce({ played: 0 });    // home record
            db.get.mockResolvedValueOnce({ played: 0 });    // away record
            db.all.mockResolvedValueOnce([]);               // h2h empty
            db.get.mockResolvedValueOnce(null);             // prediction missing

            const result = await MatchPreviewContentServiceV4.getMatchPreview('100001');

            expect(result.data.prediction).toBeNull();
            expect(result.data.h2h).toBeNull();
            expect(result.data.data_gaps).toEqual(
                expect.arrayContaining(['h2h', 'home_away_record', 'ml_prediction', 'recent_form', 'xg'])
            );
        });

        it('handles prediction payload in 1/N/2 shape', async () => {
            db.get.mockResolvedValueOnce(coreRow);
            StandingsV4Service.calculateStandings.mockResolvedValue([]);
            db.all.mockResolvedValueOnce([]);
            db.all.mockResolvedValueOnce([]);
            db.get.mockResolvedValueOnce({ xg_avg: null });
            db.get.mockResolvedValueOnce({ xg_avg: null });
            db.get.mockResolvedValueOnce({ played: 0 });
            db.get.mockResolvedValueOnce({ played: 0 });
            db.all.mockResolvedValueOnce([]);
            db.get.mockResolvedValueOnce({
                prediction_json: JSON.stringify({ '1': 0.5, N: 0.3, '2': 0.2 }),
                confidence_score: 0.6,
                model_name: 'xgb_v1',
                created_at: '2026-04-22T08:00:00Z',
            });

            const result = await MatchPreviewContentServiceV4.getMatchPreview('100001');
            expect(result.data.prediction.probs.home_win).toBeCloseTo(0.5, 2);
            expect(result.data.prediction.probs.draw).toBeCloseTo(0.3, 2);
            expect(result.data.prediction.probs.away_win).toBeCloseTo(0.2, 2);
        });
    });

    describe('getUpcomingMatches', () => {
        it('returns a valid list of upcoming matches', async () => {
            db.all.mockResolvedValueOnce([
                {
                    match_id: '100001',
                    match_date: new Date('2026-05-10T19:00:00Z'),
                    competition_id: '9',
                    competition_name: 'Premier League',
                    competition_logo: 'https://cdn.example.com/pl.png',
                    home_club_id: '11',
                    home_name: 'Arsenal',
                    home_logo: 'https://cdn.example.com/ars.png',
                    away_club_id: '281',
                    away_name: 'Manchester City',
                    away_logo: 'https://cdn.example.com/mci.png',
                    venue_name: 'Emirates Stadium',
                },
            ]);

            const data = await MatchPreviewContentServiceV4.getUpcomingMatches({
                limit: 10,
                fromDate: '2026-05-01',
                toDate: '2026-05-30',
            });

            expect(data.matches).toHaveLength(1);
            expect(data.matches[0].match_id).toBe('100001');
            expect(data.total).toBe(1);
            expect(data.from_date).toBe('2026-05-01');
            expect(data.to_date).toBe('2026-05-30');
        });

        it('applies default fromDate/toDate when none given', async () => {
            db.all.mockResolvedValueOnce([]);

            const data = await MatchPreviewContentServiceV4.getUpcomingMatches({});
            expect(data.matches).toEqual([]);
            expect(data.from_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(data.to_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});
