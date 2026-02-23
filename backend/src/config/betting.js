/**
 * Betting Configuration
 * Centralized settings for bookmakers, markets, and ingestion logic.
 */

export const BOOKMAKER_PRIORITY = [
    { id: 52, name: 'Winamax' },
    { id: 11, name: 'Unibet' }
];

export const TARGET_MARKETS = {
    MATCH_WINNER: 1,
    HOME_AWAY: 2,
    SECOND_HALF_WINNER: 3,
    ASIAN_HANDICAP: 4,
    GOALS_OVER_UNDER: 5,
    GOALS_OVER_UNDER_HT: 6,
    HT_FT: 7,
    BTTS: 8,
    CORRECT_SCORE: 9,
    FIRST_HALF_WINNER: 10,
    DOUBLE_CHANCE: 12
};

export const DEFAULT_BOOKMAKER = { id: 0, name: 'Fallback' };
