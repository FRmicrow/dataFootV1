import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

// Union-Find (path-compressed) to detect team clusters = groups
function detectGroupsByFixtures(fixtures) {
    const parent = {};

    function find(x) {
        if (!(x in parent)) parent[x] = x;
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }

    function union(a, b) {
        parent[find(a)] = find(b);
    }

    for (const f of fixtures) {
        union(f.home_team_id, f.away_team_id);
    }

    // Collect teams per root
    const groupMap = {};
    const rootFirstDate = {};
    for (const f of fixtures) {
        const root = find(f.home_team_id);
        if (!groupMap[root]) groupMap[root] = new Set();
        groupMap[root].add(f.home_team_id);
        groupMap[root].add(f.away_team_id);

        const t = new Date(f.date).getTime();
        if (!rootFirstDate[root] || t < rootFirstDate[root]) rootFirstDate[root] = t;
    }

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Object.entries(groupMap)
        .sort(([a], [b]) => rootFirstDate[a] - rootFirstDate[b])
        .map(([, teamSet], i) => ({
            name: `Groupe ${letters[i] ?? i + 1}`,
            teamIds: [...teamSet],
        }));
}

function calculateStandings(teamIds, teamInfos, fixtures) {
    const stats = {};
    for (const id of teamIds) {
        stats[id] = { team_id: id, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 };
    }

    for (const f of fixtures) {
        if (f.goals_home == null || f.goals_away == null) continue;
        if (!['FT', 'AET', 'PEN'].includes(f.status_short)) continue;

        const home = stats[f.home_team_id];
        const away = stats[f.away_team_id];
        if (!home || !away) continue;

        home.played++; away.played++;
        home.goals_for += f.goals_home; home.goals_against += f.goals_away;
        away.goals_for += f.goals_away; away.goals_against += f.goals_home;

        if (f.goals_home > f.goals_away) {
            home.won++; home.points += 3; away.lost++;
        } else if (f.goals_home < f.goals_away) {
            away.won++; away.points += 3; home.lost++;
        } else {
            home.drawn++; home.points++;
            away.drawn++; away.points++;
        }
    }

    return teamIds
        .map(id => ({
            ...stats[id],
            name: teamInfos[id]?.name ?? '?',
            logo: teamInfos[id]?.logo ?? null,
            goal_diff: stats[id].goals_for - stats[id].goals_against,
        }))
        .sort((a, b) =>
            b.points - a.points ||
            b.goal_diff - a.goal_diff ||
            b.goals_for - a.goals_for
        );
}

export const getGroupStandings = async (req, res) => {
    try {
        const { id, year } = req.params;

        const fixtures = await db.all(`
            SELECT f.fixture_id, f.round, f.date, f.status_short,
                   f.goals_home, f.goals_away,
                   f.home_team_id, f.away_team_id,
                   ht.name as home_team_name, ht.logo_url as home_team_logo,
                   at.name as away_team_name, at.logo_url as away_team_logo
            FROM V3_Fixtures f
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE f.league_id = $1 AND f.season_year = $2
              AND (
                f.round ILIKE 'Group Stage%'
                OR f.round ILIKE 'League Stage%'
                OR f.round ~ E'^Group [A-Za-z]'
              )
            ORDER BY f.date ASC
        `, cleanParams([id, year]));

        if (fixtures.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Build team info lookup
        const teamInfos = {};
        for (const f of fixtures) {
            teamInfos[f.home_team_id] = { name: f.home_team_name, logo: f.home_team_logo };
            teamInfos[f.away_team_id] = { name: f.away_team_name, logo: f.away_team_logo };
        }

        // Detect whether explicit group letters exist in round names (e.g. "Group A", "Group B - 2")
        const hasExplicitGroups = fixtures.some(f => /^Group\s+[A-Z](\s|$|-)/i.test(f.round));
        // Detect League Stage format (UCL/UEL 2024+) — single unified phase, no letter groups
        const isLeagueStage = !hasExplicitGroups && fixtures.every(f => /^League Stage/i.test(f.round));

        let groups;
        if (hasExplicitGroups) {
            const groupMap = new Map();
            for (const f of fixtures) {
                const m = f.round.match(/^Group\s+([A-Z])/i);
                if (!m) continue;
                const key = `Groupe ${m[1].toUpperCase()}`;
                if (!groupMap.has(key)) groupMap.set(key, new Set());
                groupMap.get(key).add(f.home_team_id);
                groupMap.get(key).add(f.away_team_id);
            }
            groups = [...groupMap.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, teamSet]) => ({ name, teamIds: [...teamSet] }));
        } else {
            groups = detectGroupsByFixtures(fixtures);
            // Rename single-cluster League Stage competitions
            if (isLeagueStage && groups.length === 1) {
                groups[0].name = 'Phase de Ligue';
            }
        }

        // Build standings per group
        let result = groups.map(g => {
            const groupFixtures = fixtures.filter(
                f => g.teamIds.includes(f.home_team_id) && g.teamIds.includes(f.away_team_id)
            );
            return {
                name: g.name,
                standings: calculateStandings(g.teamIds, teamInfos, groupFixtures),
            };
        });

        // Filter out suspicious micro-groups (2 teams, ≤1 match) when real groups exist alongside them
        const hasRealGroups = result.some(g => g.standings.length >= 3);
        if (hasRealGroups) {
            result = result.filter(g => {
                if (g.standings.length > 2) return true;
                // Keep 2-team group only if it has played matches (real group, e.g. WC 1950 Group 4)
                // but filter if 0 matches played (orphan fixture mislabeled as Group Stage)
                const totalPlayed = g.standings.reduce((sum, t) => sum + t.played, 0);
                return totalPlayed > 0;
            });
        }

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
