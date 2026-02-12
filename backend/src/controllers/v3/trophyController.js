import db from '../../config/database_v3.js';
import footballApi from '../../services/footballApi.js';

/**
 * Import trophies for a specific player from API-Football
 */
export const importPlayerTrophies = async (req, res) => {
    const { playerId } = req.body;

    if (!playerId) return res.status(400).json({ error: "Missing playerId" });

    try {
        // Step 1: Get the correct API ID from V3_Players using the Local ID
        const player = db.get("SELECT api_id FROM V3_Players WHERE player_id = ?", [playerId]);

        if (!player || !player.api_id) {
            console.error(`Player ${playerId} not found in V3_Players or missing API ID.`);
            // If checking existence fails, maybe fallback? But safer to skip.
            return res.status(404).json({ error: "Player not found or missing API ID" });
        }

        const apiId = player.api_id;

        // Step 2: Call API using the correct API ID
        const response = await footballApi.getPlayerTrophies(apiId);
        // API returns { response: [...] }
        const trophies = response.response || [];

        let inserted = 0;

        for (const t of trophies) {
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
                db.run(sql, params);
                inserted++;
            } catch (err) {
                console.error("Error inserting trophy:", err.message);
            }
        }

        res.json({ success: true, count: trophies.length, inserted });
    } catch (e) {
        console.error(`Trophy import failed for player ${playerId}`, e);
        res.status(500).json({ error: e.message });
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
        const rows = db.all(sql, [id]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/**
 * Get players in a league who don't have trophy data yet (Smart Import Candidate List)
 */
export const getPlayersMissingTrophies = async (req, res) => {
    const { leagueId } = req.query;

    if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

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
        const rows = db.all(sql, [leagueId]);
        res.json(rows);

    } catch (e) {
        res.status(500).json({ error: e.message });
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
        const rows = db.all(sql);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/**
 * Get players by nationality for batch trophy import
 */
export const getPlayersByNationality = async (req, res) => {
    const { country } = req.query;
    if (!country) return res.status(400).json({ error: "Missing country" });

    try {
        const sql = `
            SELECT p.player_id, p.name, p.photo_url, 
                   (CASE WHEN t.player_id IS NOT NULL THEN 1 ELSE 0 END) as has_trophies
            FROM V3_Players p
            LEFT JOIN (SELECT DISTINCT player_id FROM V3_Trophies) t ON p.player_id = t.player_id
            WHERE p.nationality = ?
            ORDER BY p.name
        `;
        const rows = db.all(sql, [country]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
