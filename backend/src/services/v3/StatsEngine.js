import dbV3 from '../../config/database_v3.js';
import footballApi from '../footballApi.js';
/**
 * Stats Engine Service V3
 * Handles high-performance aggregation for dynamic standings and statistics.
 */
class StatsEngine {

    /**
     * Calculate Dynamic Standings for a specific range of rounds
     * @param {number} leagueId 
     * @param {number} season 
     * @param {number} fromRound (inclusive)
     * @param {number} toRound (inclusive)
     * @returns {Promise<Array>} Sorted standings table
     */
    static async getDynamicStandings(leagueId, season, fromRound = 1, toRound = 50) {
        // 1. Fetch Fixtures in Range
        // Optimization: SQLite handles thousands of rows easily, so fetching ~380 matches is fine.
        const matches = dbV3.all(`
            SELECT 
                f.round,
                f.home_team_id, f.away_team_id,
                f.goals_home, f.goals_away,
                t1.name as home_name, t1.logo_url as home_logo,
                t2.name as away_name, t2.logo_url as away_logo
            FROM V3_Fixtures f
            JOIN V3_Teams t1 ON f.home_team_id = t1.team_id
            JOIN V3_Teams t2 ON f.away_team_id = t2.team_id
            WHERE f.league_id = ? 
            AND f.season_year = ? 
            AND f.status_short = 'FT'
        `, [leagueId, season]);

        if (!matches || matches.length === 0) return [];

        // 2. Helper to parse round
        const parseRound = (r) => {
            const m = r.match(/(\d+)$/);
            return m ? parseInt(m[1]) : 999;
        };

        // 3. Aggregate Stats
        const table = new Map(); // teamId -> { stats }

        const initTeam = (id, name, logo) => {
            if (!table.has(id)) {
                table.set(id, {
                    team_id: id,
                    team_name: name,
                    team_logo: logo,
                    played: 0,
                    win: 0,
                    draw: 0,
                    lose: 0,
                    goals_for: 0,
                    goals_against: 0,
                    goals_diff: 0,
                    points: 0,
                    form: [] // Last 5 matches in range W/D/L
                });
            }
        };

        const matchesInRange = matches.filter(m => {
            const r = parseRound(m.round);
            return r >= fromRound && r <= toRound;
        });

        // Sort by date/round for accurate form calculation
        matchesInRange.sort((a, b) => parseRound(a.round) - parseRound(b.round));

        matchesInRange.forEach(m => {
            const home = m.home_team_id;
            const away = m.away_team_id;
            const gh = m.goals_home;
            const ga = m.goals_away;

            initTeam(home, m.home_name, m.home_logo);
            initTeam(away, m.away_name, m.away_logo);

            const tHome = table.get(home);
            const tAway = table.get(away);

            if (gh === null || ga === null) return; // Skip if no score

            tHome.played++;
            tAway.played++;
            tHome.goals_for += gh;
            tHome.goals_against += ga;
            tHome.goals_diff += (gh - ga);
            tAway.goals_for += ga;
            tAway.goals_against += gh;
            tAway.goals_diff += (ga - gh);

            if (gh > ga) {
                tHome.win++;
                tHome.points += 3;
                tHome.form.push('W');
                tAway.lose++;
                tAway.form.push('L');
            } else if (gh < ga) {
                tAway.win++;
                tAway.points += 3;
                tAway.form.push('W');
                tHome.lose++;
                tHome.form.push('L');
            } else {
                tHome.draw++;
                tHome.points += 1;
                tHome.form.push('D');
                tAway.draw++;
                tAway.points += 1;
                tAway.form.push('D');
            }
        });

        // 4. Format Output & Sort
        const result = Array.from(table.values()).map(t => ({
            ...t,
            // Keep only last 5 form chars, reversed (Newest -> Oldest) or Standard (Oldest -> Newest)?
            // Standard representation usually L-R is Oldest-Newest, or Newest-Oldest.
            // Let's do Newest First for display usually, but here just slice last 5.
            form: t.form.slice(-5).join('')
        }));

        // Sort: Points DESC, GD DESC, GF DESC
        result.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goals_diff !== a.goals_diff) return b.goals_diff - a.goals_diff;
            return b.goals_for - a.goals_for;
        });

        // Assign Rank
        result.forEach((r, i) => r.rank = i + 1);

        return result;
    }


    /**
     * Sync Lineups for a specific fixture from API
     * @param {number} fixtureId (Local DB ID)
     * @returns {Promise<Array>} Synced data
     */
    static async syncFixtureLineups(fixtureId) {
        // 1. Get API ID from Fixture
        const fixture = await dbV3.get(
            `SELECT api_id, home_team_id, away_team_id FROM V3_Fixtures WHERE fixture_id = ?`,
            [fixtureId]
        );

        if (!fixture || !fixture.api_id) {
            throw new Error(`Fixture ${fixtureId} not found or missing API ID.`);
        }

        // 2. Fetch from API
        const data = await footballApi.getFixtureLineups(fixture.api_id);
        const lineups = data.response; // Array of 2 objects

        if (!lineups || lineups.length === 0) return [];

        // 3. Map API Team IDs to Local Team IDs
        // We know home_team_id and away_team_id from fixture.
        // We need to match which lineup belongs to which.
        // We can fetch the API IDs of the teams from V3_Teams to be sure, or rely on API response ID matches?
        // Let's resolve Team API IDs to Local IDs.

        const teamsMap = new Map();
        // Get API IDs for the two teams involved
        const teams = await dbV3.all(
            `SELECT team_id, api_id FROM V3_Teams WHERE team_id IN (?, ?)`,
            [fixture.home_team_id, fixture.away_team_id]
        );
        teams.forEach(t => teamsMap.set(t.api_id, t.team_id));

        // 4. Insert Transaction
        await dbV3.run('BEGIN TRANSACTION');
        try {
            for (const teamLineup of lineups) {
                const apiTeamId = teamLineup.team.id;
                const localTeamId = teamsMap.get(apiTeamId);

                if (!localTeamId) {
                    console.warn(`[Sync] Could not map API Team ID ${apiTeamId} to Local Team ID. Skipping lineup.`);
                    continue;
                }

                // Prepare Data
                const coach = teamLineup.coach || {};
                const formation = teamLineup.formation;
                const startingXI = JSON.stringify(teamLineup.startXI); // API: startXI
                const subs = JSON.stringify(teamLineup.substitutes);

                // Upsert
                await dbV3.run(`
                    INSERT INTO V3_Fixture_Lineups (
                        fixture_id, team_id, coach_id, coach_name, formation, starting_xi, substitutes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(fixture_id, team_id) DO UPDATE SET
                        coach_id = excluded.coach_id,
                        coach_name = excluded.coach_name,
                        formation = excluded.formation,
                        starting_xi = excluded.starting_xi,
                        substitutes = excluded.substitutes,
                        created_at = CURRENT_TIMESTAMP
                `, [
                    fixtureId,
                    localTeamId,
                    coach.id || null,
                    coach.name || null,
                    formation,
                    startingXI,
                    subs
                ]);
            }
            await dbV3.run('COMMIT');
        } catch (e) {
            await dbV3.run('ROLLBACK');
            throw e;
        }

        return lineups;
    }
}

export default StatsEngine;
