import db from '../../config/database.js';
import logger from '../../utils/logger.js';

export const getTypicalLineup = async (req, res) => {
    try {
        const teamId = req.params.id; // Usually a club_id or slug from V4
        const { year, competition } = req.query;

        if (!year) return res.status(400).json({ success: false, error: "Missing year parameter" });

        // Resolve teamId if it's a slug
        let resolvedTeamId = teamId;
        if (isNaN(teamId)) {
            const club = await db.get(`SELECT club_id FROM v4.clubs WHERE slug = ?`, [teamId]);
            if (club) resolvedTeamId = club.club_id;
        }

        // 1. Identify the most used formation from v4.matches
        let matchQuery = `
            SELECT 
                CASE 
                    WHEN m.home_club_id = ? THEN m.home_formation 
                    ELSE m.away_formation 
                END AS formation,
                COUNT(*) as usage_count
            FROM v4.matches m
            WHERE (m.home_club_id = ? OR m.away_club_id = ?)
            AND m.season_label = ?
        `;
        const matchParams = [resolvedTeamId, resolvedTeamId, resolvedTeamId, year];

        if (competition) {
            matchQuery += ` AND m.competition_id = ?::BIGINT`;
            matchParams.push(competition);
        }

        matchQuery += ` 
            AND CASE WHEN m.home_club_id = ? THEN m.home_formation ELSE m.away_formation END IS NOT NULL
            GROUP BY formation 
            ORDER BY usage_count DESC 
            LIMIT 1
        `;
        matchParams.push(resolvedTeamId);

        const topFormationRow = await db.get(matchQuery, matchParams);

        if (!topFormationRow || !topFormationRow.formation) {
            return res.json({ success: true, data: { message: "No lineup data found for this selection.", formation: null, roster: [] } });
        }

        const topFormation = topFormationRow.formation;
        const totalMatchesReq = await db.get(
            `SELECT COUNT(*) as c FROM v4.matches WHERE (home_club_id = ? OR away_club_id = ?) AND season_label = ?` + 
            (competition ? ` AND competition_id = ?::BIGINT` : ''),
            competition ? [resolvedTeamId, resolvedTeamId, year, competition] : [resolvedTeamId, resolvedTeamId, year]
        );
        const totalWinsReq = await db.get(
            `SELECT COUNT(*) as c FROM v4.matches WHERE (
                (home_club_id = ? AND home_score > away_score) OR 
                (away_club_id = ? AND away_score > home_score)
            ) AND season_label = ? 
            AND CASE WHEN home_club_id = ? THEN home_formation ELSE away_formation END = ?` +
            (competition ? ` AND competition_id = ?::BIGINT` : ''),
            competition ? [resolvedTeamId, resolvedTeamId, year, resolvedTeamId, topFormation, competition] 
                        : [resolvedTeamId, resolvedTeamId, year, resolvedTeamId, topFormation]
        );

        const winRate = Math.round((Number(totalWinsReq?.c || 0) / Number(topFormationRow.usage_count || 1)) * 100);

        // 2. Fetch the roster ordered by matches started in this formation
        const rosterQuery = `
            SELECT 
                p.person_id::text AS player_id,
                p.full_name AS name,
                COALESCE(p.photo_url, ?) AS photo_url,
                MODE() WITHIN GROUP (ORDER BY NULLIF(ml.role_code, '')) as position,
                COUNT(ml.match_lineup_id)::int as appearances
            FROM v4.match_lineups ml
            JOIN v4.matches m on m.match_id = ml.match_id
            JOIN v4.people p on p.person_id = ml.player_id
            WHERE ml.club_id = ?
            AND m.season_label = ?
            AND ml.is_starter = true
            AND CASE WHEN m.home_club_id = ? THEN m.home_formation ELSE m.away_formation END = ?
            ${competition ? ` AND m.competition_id = ?::BIGINT` : ''}
            GROUP BY p.person_id, p.full_name, p.photo_url
            ORDER BY appearances DESC
            LIMIT 30
        `;
        const DEFAULT_PHOTO = 'https://tmssl.akamaized.net//images/foto/normal/default.jpg?lm=1';
        const rosterParams = [DEFAULT_PHOTO, resolvedTeamId, year, resolvedTeamId, topFormation];
        if (competition) rosterParams.push(competition);

        const roster = await db.all(rosterQuery, rosterParams);

        if (!roster || roster.length === 0) {
            return res.json({ success: true, data: { message: "No roster found for this formation.", formation: topFormation, roster: [], usage: topFormationRow.usage_count, win_rate: winRate } });
        }

        res.json({
            success: true,
            data: {
                club_id: teamId,
                formation: topFormation,
                usage: topFormationRow.usage_count,
                win_rate: winRate,
                roster: roster
            }
        });

    } catch (error) {
        logger.error({ err: error }, "Error in getTypicalLineup V4");
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const getClubTacticalSummary = async (req, res) => {
    try {
        const teamId = req.params.id;
        const { year, competition, history } = req.query;

        // Resolve teamId if it's a slug
        let resolvedTeamId = teamId;
        if (isNaN(teamId)) {
            const club = await db.get(`SELECT club_id FROM v4.clubs WHERE slug = ?`, [teamId]);
            if (club) resolvedTeamId = club.club_id;
        }

        if (history === 'true') {
            // Aggregate history from team_season_xg and match_stats
            const historyQuery = `
                SELECT 
                    m.season_label,
                    COUNT(m.match_id)::int as matches,
                    SUM(CASE WHEN (m.home_club_id = ? AND m.home_score > m.away_score) OR (m.away_club_id = ? AND m.away_score > m.home_score) THEN 1 ELSE 0 END)::int as wins,
                    SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END)::int as draws,
                    SUM(CASE WHEN (m.home_club_id = ? AND m.home_score < m.away_score) OR (m.away_club_id = ? AND m.away_score < m.home_score) THEN 1 ELSE 0 END)::int as losses,
                    SUM(CASE WHEN m.home_club_id = ? THEN m.home_score ELSE m.away_score END)::int as goals_scored,
                    SUM(CASE WHEN m.home_club_id = ? THEN m.away_score ELSE m.home_score END)::int as goals_conceded,
                    SUM(CASE WHEN (m.home_club_id = ? AND m.away_score = 0) OR (m.away_club_id = ? AND m.home_score = 0) THEN 1 ELSE 0 END)::int as clean_sheets,
                    -- Stats across matches 
                    AVG(CASE WHEN m.home_club_id = ? THEN ms.home_poss_ft ELSE ms.away_poss_ft END) as possession,
                    AVG(100) as pass_accuracy -- Not available in v4.match_stats
                FROM v4.matches m
                LEFT JOIN v4.match_stats ms ON ms.match_id = m.match_id
                WHERE (m.home_club_id = ? OR m.away_club_id = ?)
                ${competition ? ` AND m.competition_id = ?::BIGINT` : ''}
                GROUP BY m.season_label
                ORDER BY m.season_label DESC
            `;
            
            const p = [resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId];
            if (competition) p.push(competition);

            const results = await db.all(historyQuery, p);

            const formattedHistory = {};
            for (const row of results) {
                const matches = Number(row.matches || 1);
                const points = (Number(row.wins) * 3) + Number(row.draws);
                formattedHistory[row.season_label] = {
                    win_rate: Math.round((Number(row.wins) / matches) * 100),
                    points_per_match: (points / matches).toFixed(2),
                    goals_scored_per_match: (Number(row.goals_scored) / matches).toFixed(2),
                    goals_conceded_per_match: (Number(row.goals_conceded) / matches).toFixed(2),
                    clean_sheet_pct: Math.round((Number(row.clean_sheets) / matches) * 100),
                    possession: Math.round(Number(row.possession || 0)),
                    pass_accuracy: 0,
                    shot_conversion: null // hard to aggregate dynamically without heavy logic
                };
            }
            return res.json({ success: true, data: formattedHistory });
        } else {
            if (!year) return res.status(400).json({ success: false, error: "Missing year parameter" });

            // Stats from match_stats (averages) + matches for the requested season
            const overviewQuery = `
                WITH match_data AS (
                    SELECT 
                        m.match_id,
                        m.home_club_id = ? as is_home,
                        CASE WHEN m.home_club_id = ? THEN m.home_score ELSE m.away_score END as goals_scored,
                        CASE WHEN m.home_club_id = ? THEN m.away_score ELSE m.home_score END as goals_conceded,
                        CASE WHEN m.home_club_id = ? THEN ms.home_poss_ft ELSE ms.away_poss_ft END as possession,
                        0 as pass_accuracy,
                        CASE WHEN m.home_club_id = ? THEN ms.home_corners_ft ELSE ms.away_corners_ft END as corners,
                        CASE WHEN m.home_club_id = ? THEN ms.home_shots_ft ELSE ms.away_shots_ft END as total_shots,
                        CASE WHEN m.home_club_id = ? THEN ms.home_shots_ot_ft ELSE ms.away_shots_ot_ft END as shots_on_target,
                        0 as saves,
                        CASE WHEN m.home_club_id = ? THEN ms.home_yellows_ft ELSE ms.away_yellows_ft END as yellow_cards
                    FROM v4.matches m
                    LEFT JOIN v4.match_stats ms ON ms.match_id = m.match_id
                    WHERE (m.home_club_id = ? OR m.away_club_id = ?)
                    AND m.season_label = ?
                    ${competition ? ` AND m.competition_id = ?::BIGINT` : ''}
                )
                SELECT 
                    is_home,
                    COUNT(match_id)::int as matches,
                    SUM(goals_scored)::int as goals_scored,
                    SUM(goals_conceded)::int as goals_conceded,
                    SUM(CASE WHEN goals_scored > goals_conceded THEN 1 ELSE 0 END)::int as wins,
                    SUM(CASE WHEN goals_conceded = 0 THEN 1 ELSE 0 END)::int as clean_sheets,
                    AVG(possession) as possession,
                    AVG(pass_accuracy) as pass_accuracy,
                    AVG(corners) as corners,
                    AVG(total_shots) as total_shots,
                    AVG(shots_on_target) as shots_on_target,
                    AVG(saves) as saves,
                    AVG(yellow_cards) as yellow_cards
                FROM match_data
                GROUP BY is_home
            `;
            const args = [resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, resolvedTeamId, year];
            if (competition) args.push(competition);

            const rows = await db.all(overviewQuery, args);

            if (!rows || rows.length === 0) {
                return res.json({ success: true, data: null });
            }

            // Also get XG from team_season_xg
            let xgArgs = [resolvedTeamId, year];
            let xgQuery = `SELECT xg, xga, npxg, npxga FROM v4.team_season_xg WHERE club_id = ? AND season_label = ?`;
            if (competition) {
                xgQuery += ` AND competition_id = ?::BIGINT`;
                xgArgs.push(competition);
            }
            const xgRows = await db.all(xgQuery, xgArgs);
            // Aggregate XG if multiple comps
            let totalXg = 0, totalXga = 0;
            xgRows.forEach(r => { totalXg += Number(r.xg||0); totalXga += Number(r.xga||0); });

            let all = { matches: 0, wins: 0, goals_scored: 0, goals_conceded: 0, clean_sheets: 0, possession: 0, pass_accuracy: 0, corners: 0, total_shots: 0, shots_on_target: 0, saves: 0, yellow_cards: 0 };
            let home = null;
            let away = null;

            rows.forEach(r => {
                if (r.is_home) home = r;
                else away = r;

                all.matches += Number(r.matches);
                all.wins += Number(r.wins);
                all.goals_scored += Number(r.goals_scored);
                all.goals_conceded += Number(r.goals_conceded);
                all.clean_sheets += Number(r.clean_sheets);
                all.possession += Number(r.possession||0) * Number(r.matches);
                all.pass_accuracy += Number(r.pass_accuracy||0) * Number(r.matches);
                all.corners += Number(r.corners||0) * Number(r.matches);
                all.total_shots += Number(r.total_shots||0) * Number(r.matches);
                all.shots_on_target += Number(r.shots_on_target||0) * Number(r.matches);
                all.saves += Number(r.saves||0) * Number(r.matches);
                all.yellow_cards += Number(r.yellow_cards||0) * Number(r.matches);
            });

            if (all.matches > 0) {
                all.possession = Math.round(all.possession / all.matches);
                all.pass_accuracy = Math.round(all.pass_accuracy / all.matches);
                all.corners_per_match = (all.corners / all.matches).toFixed(1);
                all.shots_per_match = (all.total_shots / all.matches).toFixed(1);
                all.shots_on_target_per_match = (all.shots_on_target / all.matches).toFixed(1);
                all.saves_per_match = (all.saves / all.matches).toFixed(1);
                all.yellow_cards_per_match = (all.yellow_cards / all.matches).toFixed(1);
                all.goals_scored_per_match = (all.goals_scored / all.matches).toFixed(2);
                all.goals_conceded_per_match = (all.goals_conceded / all.matches).toFixed(2);
                all.clean_sheet_pct = Math.round((all.clean_sheets / all.matches) * 100);
                all.shot_conversion = all.total_shots > 0 ? Math.round((all.goals_scored / all.total_shots) * 100) : 0;
            }

            all.expected_goals = totalXg.toFixed(2);
            all.expected_goals_against = totalXga.toFixed(2);

            const formatSplit = (s) => {
                if (!s) return null;
                return {
                    win_rate: Math.round((Number(s.wins) / Number(s.matches)) * 100),
                    goals_scored_per_match: (Number(s.goals_scored) / Number(s.matches)).toFixed(2),
                    possession: Math.round(Number(s.possession))
                };
            };

            res.json({
                success: true,
                data: {
                    all,
                    home: formatSplit(home),
                    away: formatSplit(away)
                }
            });
        }
    } catch (error) {
        logger.error({ err: error }, "Error in getClubTacticalSummary V4");
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};
