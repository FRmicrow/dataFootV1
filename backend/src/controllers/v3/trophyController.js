import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import logger from '../../utils/logger.js';

/**
 * Import trophies for a specific player from API-Football
 */
export const importPlayerTrophies = async (req, res) => {
    const { playerId } = req.body;

    if (!playerId) return res.status(400).json({ success: false, error: "Missing playerId" });

    try {
        // Step 1: Get the correct API ID from V3_Players using the Local ID
        const player = await db.get("SELECT api_id, is_trophy_synced FROM V3_Players WHERE player_id = ?", [playerId]);

        if (!player || !player.api_id) {
            logger.warn({ playerId }, 'Player not found in V3_Players or missing API ID');
            return res.status(404).json({ success: false, error: "Player not found or missing API ID" });
        }

        const { forceRefresh = false } = req.body;
        if (!forceRefresh && player.is_trophy_synced) {
            logger.info({ playerId }, 'Skipping player trophies import because already synced');
            return res.json({ success: true, data: { count: 0, inserted: 0, skipped: true } });
        }

        const apiId = player.api_id;

        // Step 2: Call API using the correct API ID
        const response = await footballApi.getPlayerTrophies(apiId);
        // API returns { response: [...] }
        const trophies = response.response || [];

        let inserted = 0;

        for (const t of trophies) {
            // Check for valid season
            if (!t.season || t.season === 'NULL') {
                continue;
            }

            const sql = `
                INSERT INTO V3_Trophies (player_id, league_name, country, season, place, trophy)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(player_id, trophy, season) DO NOTHING
             `;
            // API-Football structure: { league: "Name", country: "...", season: "...", place: "..." }
            // 'trophy' key might be missing. Use 'league' as the trophy name.
            const trophyName = t.trophy || t.league;
            const params = [playerId, t.league, t.country, t.season, t.place, trophyName];

            try {
                // db.run is synchronous/wrapper in database_v3.js
                await db.run(sql, params);
                inserted++;
            } catch (err) {
                logger.error({ err, playerId }, 'Error inserting trophy');
            }
        }
        // Update sync flags
        await db.run(
            "UPDATE V3_Players SET is_trophy_synced = true, last_sync_trophies = CURRENT_TIMESTAMP WHERE player_id = ?",
            [playerId]
        );

        res.json({ success: true, data: { count: trophies.length, inserted } });
    } catch (e) {
        logger.error({ err: e, playerId }, 'Trophy import failed for player');
        res.status(500).json({ success: false, message: e.message });
    }
};

/**
 * Get trophies for a player from local DB
 */
export const getPlayerTrophiesLocal = async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT t.*, c.flag_small_url as country_flag, c.importance_rank 
            FROM V3_Trophies t
            LEFT JOIN V3_Countries c ON t.country = c.name
            WHERE t.player_id = ? 
            ORDER BY c.importance_rank ASC, t.season DESC
        `;
        const rows = await db.all(sql, [id]);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/**
 * Get players in a league who don't have trophy data yet (Smart Import Candidate List)
 */
export const getPlayersMissingTrophies = async (req, res) => {
    const { leagueId } = req.query;

    if (!leagueId) return res.status(400).json({ success: false, error: "Missing leagueId" });

    try {
        // Find players who have stats in this league but NO entries in V3_Trophies
        const sql = `
            SELECT DISTINCT p.player_id, p.name, p.photo_url
            FROM V3_Player_Stats s
            JOIN V3_Players p ON s.player_id = p.player_id
            WHERE s.league_id = ?
            AND p.player_id NOT IN (SELECT DISTINCT player_id FROM V3_Trophies)
            ORDER BY p.name
            LIMIT 500
        `;

        // Synchronous call
        const rows = await db.all(sql, [leagueId]);
        res.json({ success: true, data: rows });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/**
 * Get list of available player nationalities for import selection
 */
export const getNationalities = async (req, res) => {
    try {
        const sql = `
            SELECT nationality, COUNT(*) as count 
            FROM V3_Players 
            WHERE nationality IS NOT NULL
            GROUP BY nationality 
            ORDER BY count DESC
        `;
        const rows = await db.all(sql);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/**
 * Get players by nationality for batch trophy import
 */
export const getPlayersByNationality = async (req, res) => {
    const { country } = req.query;
    if (!country) return res.status(400).json({ success: false, error: "Missing country" });

    try {
        const sql = `
            SELECT p.player_id, p.name, p.photo_url, 
                   (CASE WHEN t.player_id IS NOT NULL THEN 1 ELSE 0 END) as has_trophies
            FROM V3_Players p
            LEFT JOIN (SELECT DISTINCT player_id FROM V3_Trophies) t ON p.player_id = t.player_id
            WHERE p.nationality = ?
            ORDER BY p.name
        `;
        const rows = await db.all(sql, [country]);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
