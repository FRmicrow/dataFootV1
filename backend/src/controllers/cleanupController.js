import db from '../config/database.js';

export const getCleanupCandidates = async (req, res) => {
    const { clubId } = req.query;

    try {
        // --- 1. Find Duplicates (Same Player, Club, Season) ---
        // We find groups of records that share Player + Club + Season.

        // Base Query for duplicate groups
        let dupSql = `
            SELECT s.player_id, s.club_id, s.season, count(*) as count
            FROM V2_player_statistics s
        `;
        let dupParams = [];

        if (clubId) {
            dupSql += ` WHERE s.club_id = ? `;
            dupParams.push(clubId);
        }

        dupSql += `
            GROUP BY s.player_id, s.club_id, s.season
            HAVING count(*) > 1
        `;

        const potentialDupes = await db.all(dupSql, dupParams);

        let mergeCandidates = [];
        for (const group of potentialDupes) {
            const stats = await db.all(`
               SELECT s.*, c.competition_name, p.first_name, p.last_name, p.photo_url, cl.club_name, cl.country_id
               FROM V2_player_statistics s
               JOIN V2_players p ON s.player_id = p.player_id
               JOIN V2_clubs cl ON s.club_id = cl.club_id
               LEFT JOIN V2_competitions c ON s.competition_id = c.competition_id
               WHERE s.player_id = ? AND s.club_id = ? AND s.season = ?
            `, [group.player_id, group.club_id, group.season]);

            // We return all fields so the user can see them and decide
            mergeCandidates.push({
                type: 'duplicate',
                items: stats
            });
        }

        // --- 2. Unknown Competitions (NULL competition_id) ---
        let unknownSql = `
            SELECT s.*, p.first_name, p.last_name, p.photo_url, cl.club_name, cl.country_id, co.country_name
            FROM V2_player_statistics s
            JOIN V2_players p ON s.player_id = p.player_id
            JOIN V2_clubs cl ON s.club_id = cl.club_id
            LEFT JOIN V2_countries co ON cl.country_id = co.country_id
            WHERE s.competition_id IS NULL
        `;

        const unknownParams = [];
        if (clubId) {
            unknownSql += " AND s.club_id = ?";
            unknownParams.push(clubId);
        }

        const unknowns = await db.all(unknownSql, unknownParams);

        // Enhance Unknowns with suggestions (Limit if no filter)
        const limit = clubId ? 1000 : 50;
        const processingList = unknowns.slice(0, limit);

        const enhancedUnknowns = [];
        for (const u of processingList) {
            let suggestion = null;
            let rule = null;

            // Heuristic 1: > 15 matches => National League
            if (u.matches_played > 15 && u.country_id) {
                const league = await db.get(`
                    SELECT * FROM V2_competitions 
                    WHERE country_id = ? AND trophy_type_id = 7
                    LIMIT 1
                `, [u.country_id]);

                if (league) {
                    suggestion = league;
                    rule = "Match Count > 15 (Likely League)";
                }
            }

            // Heuristic 2: Check other players in same club/season
            if (!suggestion) {
                const teammateLeague = await db.get(`
                    SELECT c.*, count(*) as cnt
                    FROM V2_player_statistics s
                    JOIN V2_competitions c ON s.competition_id = c.competition_id
                    WHERE s.club_id = ? AND s.season = ? AND c.trophy_type_id = 7
                    GROUP BY c.competition_id
                    ORDER BY cnt DESC
                    LIMIT 1
                `, [u.club_id, u.season]);

                if (teammateLeague) {
                    suggestion = teammateLeague;
                    rule = "Teammates in this League";
                }
            }

            enhancedUnknowns.push({
                ...u,
                suggestion,
                suggestionRule: rule
            });
        }

        res.json({
            mergeCandidates,
            unknowns: enhancedUnknowns,
            totalUnknowns: unknowns.length,
            showing: processingList.length
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};

export const mergeStats = async (req, res) => {
    const { keepId, removeId } = req.body;
    try {
        await db.run("DELETE FROM V2_player_statistics WHERE stat_id = ?", [removeId]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const assignCompetition = async (req, res) => {
    const { statId, competitionId } = req.body;
    try {
        await db.run("UPDATE V2_player_statistics SET competition_id = ? WHERE stat_id = ?", [competitionId, statId]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getCompetitionsForSelect = async (req, res) => {
    const { countryId } = req.query;
    try {
        let sql = "SELECT * FROM V2_competitions";
        let params = [];
        if (countryId) {
            sql += " WHERE country_id = ?";
            params.push(countryId);
        }
        sql += " ORDER BY competition_name";
        const comps = await db.all(sql, params);
        res.json(comps);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const initializeRegions = async (req, res) => {
    try {
        // 1. Insert Regions (as Countries)
        const regions = [
            { id: 1, name: 'World', code: 'WLD' },
            { id: 2, name: 'Europe', code: 'EUR' },
            { id: 3, name: 'Asia', code: 'ASI' },
            { id: 4, name: 'Africa', code: 'AFR' },
            { id: 5, name: 'America', code: 'AME' }, // Covers North & South for now as requested
            { id: 6, name: 'Oceania', code: 'OCE' }
        ];

        for (const r of regions) {
            // Check if exists
            const exists = await db.get("SELECT country_id FROM V2_countries WHERE country_id = ?", [r.id]);
            if (!exists) {
                // Using a dummy flag link or empty
                await db.run(`
                    INSERT INTO V2_countries (country_id, country_name, country_code, region) 
                    VALUES (?, ?, ?, 'Region')
                `, [r.id, r.name, r.code]);
            }
        }

        // 2. Auto-assign Competitions based on Name
        const mappings = [
            { regionId: 2, percentLike: '%UEFA%' },
            { regionId: 2, percentLike: '%Euro%' },
            { regionId: 2, percentLike: '%Champions League%' }, // Often Europe if not qualified
            { regionId: 5, percentLike: '%CONMEBOL%' },
            { regionId: 5, percentLike: '%CONCACAF%' },
            { regionId: 5, percentLike: '%Libertadores%' },
            { regionId: 5, percentLike: '%Sudamericana%' },
            { regionId: 5, percentLike: '%America%' }, // Copa America
            { regionId: 3, percentLike: '%AFC%' },
            { regionId: 3, percentLike: '%Asian%' },
            { regionId: 4, percentLike: '%CAF%' },
            { regionId: 4, percentLike: '%African%' },
            { regionId: 6, percentLike: '%OFC%' },
            { regionId: 6, percentLike: '%Oceania%' },
            { regionId: 1, percentLike: '%FIFA%' },
            { regionId: 1, percentLike: '%World Cup%' },
            { regionId: 1, percentLike: '%International%' },
            { regionId: 1, percentLike: '%Olympics%' }
        ];

        let updatedCount = 0;
        for (const m of mappings) {
            const result = await db.run(`
                UPDATE V2_competitions 
                SET country_id = ? 
                WHERE competition_name LIKE ? 
                AND (country_id IS NULL OR country_id NOT IN (SELECT country_id FROM V2_countries WHERE region != 'Region'))
            `, [m.regionId, m.percentLike]);
            // Note: The extra check prevents overwriting specific national leagues if they happen to match keywords, 
            // though unlikely with these specific keywords. 
            // Better to just overwrite NULL or specific known placeholders, 
            // but for now we overwrite everything matching the keyword as these are typically international.

            // Simplified update:
            await db.run(`
                UPDATE V2_competitions 
                SET country_id = ? 
                WHERE competition_name LIKE ? AND country_id > 200
            `, [m.regionId, m.percentLike]);
            // Why > 200? Assuming real countries start at 213 (from previous check). 
            // This prevents overwriting valid country assignments if they exist and we want to replace them with Region ONLY if they definitely match.
            // Actually, competitions like "UEFA Champions League" might curently have country_id=1 (which was old?).
            // Let's just force update for these keywords.

            const resUpdate = await db.run(`UPDATE V2_competitions SET country_id = ? WHERE competition_name LIKE ?`, [m.regionId, m.percentLike]);
            updatedCount += resUpdate.changes || 0;
        }

        res.json({ success: true, message: `Regions initialized and ${updatedCount} competitions updated.` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};
