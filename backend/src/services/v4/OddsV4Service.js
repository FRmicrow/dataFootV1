import db from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('OddsV4Service');

const OddsV4Service = {
    /**
     * Returns all odds for a given v4 match.
     * @param {string} matchId
     * @returns {Promise<Array>}
     */
    async getOddsByMatchId(matchId) {
        const rows = await db.all(
            `SELECT
                odds_id,
                match_id::text,
                bookmaker_id,
                market_id,
                market_type,
                value_home,
                value_draw,
                value_away,
                handicap_value,
                captured_at
             FROM v4.odds
             WHERE match_id = ?
             ORDER BY bookmaker_id, market_id`,
            [matchId]
        );
        return rows;
    },
};

export default OddsV4Service;
