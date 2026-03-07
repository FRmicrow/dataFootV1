import footballApi from '../footballApi.js';
import db from '../../config/database.js';

class OddsService {
    /**
     * Parse and upsert odds data into V3_Odds 
     * @param {Array} oddsData Array of odds from API-Football
     * @returns {Object} statistics about imported odds
     */
    static async processOdds(oddsData) {
        if (!oddsData || !Array.isArray(oddsData) || oddsData.length === 0) {
            return { total: 0, inserted: 0, updated: 0 };
        }

        let insertedOrUpdated = 0;

        // Uses a transaction for better performance
        const stmt = db.db.prepare(`
            INSERT INTO V3_Odds 
                (fixture_id, bookmaker_id, bookmaker_name, bet_id, bet_name, value_label, value_odd) 
            VALUES 
                (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(fixture_id, bookmaker_id, bet_id, value_label) 
            DO UPDATE SET 
                value_odd = excluded.value_odd,
                updated_at = CURRENT_TIMESTAMP
        `);

        const insertMany = db.db.transaction(async items => {
            let count = 0;
            for (const item of items) {
                // Ensure fixture exists in V3_Fixtures before inserting
                const fixtureExists = await db.get('SELECT 1 FROM V3_Fixtures WHERE fixture_id = ?', [item.fixture_id]);
                if (fixtureExists) {
                    stmt.run(
                        item.fixture_id,
                        item.bookmaker_id,
                        item.bookmaker_name,
                        item.bet_id,
                        item.bet_name,
                        item.value_label,
                        item.value_odd
                    );
                    count++;
                }
            }
            return count;
        });

        const batchToInsert = [];

        for (const record of oddsData) {
            const fixtureId = record.fixture?.id;
            if (!fixtureId) continue;

            const bookmakers = record.bookmakers || [];

            for (const bookmaker of bookmakers) {
                for (const bet of bookmaker.bets || []) {
                    for (const value of bet.values || []) {
                        batchToInsert.push({
                            fixture_id: fixtureId,
                            bookmaker_id: bookmaker.id,
                            bookmaker_name: bookmaker.name,
                            bet_id: bet.id,
                            bet_name: bet.name,
                            value_label: String(value.value),
                            value_odd: String(value.odd)
                        });
                    }
                }
            }
        }

        if (batchToInsert.length > 0) {
            insertedOrUpdated = insertMany(batchToInsert);
        }

        return {
            total: batchToInsert.length,
            processed: insertedOrUpdated
        };
    }

    /**
     * Import odds for a specific league and season.
     * This is the most efficient way to fetch odds from API-Football.
     * GET /odds?league={leagueId}&season={seasonYear}
     */
    static async importOddsByLeagueSeason(leagueId, seasonYear) {
        try {
            console.log(`📡 Fetching odds for League: ${leagueId}, Season: ${seasonYear}`);
            const response = await footballApi.makeRequest('/odds', {
                league: leagueId,
                season: seasonYear
            }, `odds-league-${leagueId}-season-${seasonYear}`);

            const data = response?.response || [];
            console.log(`📊 Found odds for ${data.length} fixtures in League ${leagueId}. Processing...`);

            const stats = await this.processOdds(data);
            console.log(`✅ [Odds Import] L${leagueId}/S${seasonYear}: Processed ${stats.processed}/${stats.total} odd values.`);
            return stats;
        } catch (error) {
            console.error(`❌ [Odds Import Error] L${leagueId}/S${seasonYear}:`, error.message);
            throw error;
        }
    }

    /**
     * Import historical odds.
     * Loops over active leagues and seasons to backfill the database.
     */
    static async importHistoricalOdds(leagueId, seasonYear) {
        // Now just a wrapper for importOddsByLeagueSeason
        console.log(`🚀 Starting historical odds import for League ${leagueId} / Season ${seasonYear}`);
        return this.importOddsByLeagueSeason(leagueId, seasonYear);
    }

    /**
     * Helper to import upcoming odds.
     * Since we can fetch all odds for a league/season, 
     * we query the odds for the active season of our tracked leagues.
     */
    static async importNextWeekOdds() {
        console.log(`🚀 Starting upcoming week odds import based on tracked leagues...`);

        // Fetch current active leagues mapped to their current season
        const currentTracking = await db.all(`
            SELECT league_id, season_year 
            FROM V3_League_Seasons 
            WHERE is_current = 1
        `);

        if (!currentTracking || currentTracking.length === 0) {
            console.log("⚠️ No active current seasons found in V3_League_Seasons.");
            return [];
        }

        const results = [];
        for (const track of currentTracking) {
            try {
                const stats = await this.importOddsByLeagueSeason(track.league_id, track.season_year);
                results.push({ league_id: track.league_id, season_year: track.season_year, ...stats });

                // Pause to respect API rate limiting
                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error(`⚠️ Failed to import odds for L${track.league_id}/S${track.season_year}`);
                results.push({ league_id: track.league_id, error: err.message });
            }
        }

        console.log(`✅ Next Week Odds Import finished.`);
        return results;
    }
}

export default OddsService;
