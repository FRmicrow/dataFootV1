import dotenv from 'dotenv';
dotenv.config();

import dbV3 from '../src/config/database_v3.js';
import footballApi from '../src/services/footballApi.js';

// Configuration
const LILLE_FRANCE_API_ID = 79;
const START_YEAR = 2010;
const END_YEAR = 2024;

const cleanParams = (params) => params.map(p => p === undefined ? null : p);

const runReimport = async () => {
    console.log('🚀 Starting Re-import for Lille (France) API ID 79...');
    await dbV3.init();

    // 1. Cleanup existing stats for Lille France (if any)
    const localLille = dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [LILLE_FRANCE_API_ID]);
    if (localLille) {
        console.log(`🧹 Cleaning up existing stats for Lille France (Local ID: ${localLille.team_id})...`);
        dbV3.run("DELETE FROM V3_Player_Stats WHERE team_id = ?", [localLille.team_id]);
    }

    // 2. Import each season
    for (let season = START_YEAR; season <= END_YEAR; season++) {
        console.log(`\n📅 Processing Season ${season}...`);

        try {
            // A. Fetch players and stats for Lille in this season
            const playersRes = await footballApi.getPlayersByTeam(LILLE_FRANCE_API_ID, season);
            if (!playersRes.response?.length) {
                console.log(`   ℹ️ No player data found for ${season}.`);
                continue;
            }

            console.log(`   📥 Found ${playersRes.paging.total} pages of players. Processing page 1...`);

            let totalPages = playersRes.paging.total;
            let currentPage = 1;

            while (currentPage <= totalPages) {
                const pageRes = (currentPage === 1) ? playersRes : await footballApi.getPlayersByTeam(LILLE_FRANCE_API_ID, season, currentPage);

                dbV3.run('BEGIN TRANSACTION');
                try {
                    for (const p of pageRes.response) {
                        // i. Upsert Player
                        const player = p.player;
                        let localPlayer = dbV3.get("SELECT player_id FROM V3_Players WHERE api_id = ?", [player.id]);
                        let localPlayerId;
                        if (!localPlayer) {
                            const info = dbV3.run(`INSERT INTO V3_Players (api_id, name, firstname, lastname, age, birth_date, birth_place, birth_country, nationality, height, weight, injured, photo_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                                cleanParams([player.id, player.name, player.firstname, player.lastname, player.age, player.birth?.date, player.birth?.place, player.birth?.country, player.nationality, player.weight, player.height, player.injured ? 1 : 0, player.photo]));
                            localPlayerId = info.lastInsertRowid;
                        } else {
                            localPlayerId = localPlayer.player_id;
                        }

                        // ii. Upsert Stats
                        for (const s of p.statistics) {
                            // Find/Create Team
                            let localTeam = dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [s.team.id]);
                            let localTeamId;
                            if (!localTeam) {
                                const tInfo = dbV3.run(`INSERT INTO V3_Teams (api_id, name, logo_url) VALUES (?, ?, ?)`, [s.team.id, s.team.name, s.team.logo]);
                                localTeamId = tInfo.lastInsertRowid;
                            } else {
                                localTeamId = localTeam.team_id;
                            }

                            // Find/Create League
                            let localLeague = dbV3.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", [s.league.id]);
                            let localLeagueId;
                            if (!localLeague) {
                                const lInfo = dbV3.run(`INSERT INTO V3_Leagues (api_id, name, logo_url) VALUES (?, ?, ?)`, [s.league.id, s.league.name, s.league.logo]);
                                localLeagueId = lInfo.lastInsertRowid;
                            } else {
                                localLeagueId = localLeague.league_id;
                            }

                            // Upsert Stats
                            const existingStat = dbV3.get("SELECT stat_id FROM V3_Player_Stats WHERE player_id = ? AND team_id = ? AND league_id = ? AND season_year = ?", [localPlayerId, localTeamId, localLeagueId, season]);

                            const statData = [
                                localPlayerId, localTeamId, localLeagueId, season,
                                s.games.appearences || 0, s.games.lineups || 0, s.games.minutes || 0, s.games.number, s.games.position, s.games.rating, s.games.captain ? 1 : 0,
                                s.substitutes.in || 0, s.substitutes.out || 0, s.substitutes.bench || 0,
                                s.shots.total || 0, s.shots.on || 0,
                                s.goals.total || 0, s.goals.conceded || 0, s.goals.assists || 0, s.goals.saves || 0,
                                s.passes.total || 0, s.passes.key || 0, s.passes.accuracy || 0,
                                s.tackles.total || 0, s.tackles.blocks || 0, s.tackles.interceptions || 0,
                                s.duels.total || 0, s.duels.won || 0,
                                s.dribbles.attempts || 0, s.dribbles.success || 0, s.dribbles.past || 0,
                                s.fouls.drawn || 0, s.fouls.committed || 0,
                                s.cards.yellow || 0, s.cards.yellowred || 0, s.cards.red || 0,
                                s.penalty.won || 0, s.penalty.commited || 0, s.penalty.scored || 0, s.penalty.missed || 0, s.penalty.saved || 0
                            ];

                            if (existingStat) {
                                const updateCols = [
                                    'games_appearences', 'games_lineups', 'games_minutes', 'games_number', 'games_position', 'games_rating', 'games_captain',
                                    'substitutes_in', 'substitutes_out', 'substitutes_bench', 'shots_total', 'shots_on', 'goals_total', 'goals_conceded', 'goals_assists', 'goals_saves',
                                    'passes_total', 'passes_key', 'passes_accuracy', 'tackles_total', 'tackles_blocks', 'tackles_interceptions', 'duels_total', 'duels_won',
                                    'dribbles_attempts', 'dribbles_success', 'dribbles_past', 'fouls_drawn', 'fouls_committed', 'cards_yellow', 'cards_yellowred', 'cards_red',
                                    'penalty_won', 'penalty_commited', 'penalty_scored', 'penalty_missed', 'penalty_saved'
                                ];
                                const setClause = updateCols.map(c => `${c}=?`).join(', ');
                                dbV3.run(`UPDATE V3_Player_Stats SET ${setClause}, updated_at=CURRENT_TIMESTAMP WHERE stat_id=?`,
                                    cleanParams([...statData.slice(4), existingStat.stat_id]));
                            } else {
                                const allCols = [
                                    'player_id', 'team_id', 'league_id', 'season_year',
                                    'games_appearences', 'games_lineups', 'games_minutes', 'games_number', 'games_position', 'games_rating', 'games_captain',
                                    'substitutes_in', 'substitutes_out', 'substitutes_bench', 'shots_total', 'shots_on', 'goals_total', 'goals_conceded', 'goals_assists', 'goals_saves',
                                    'passes_total', 'passes_key', 'passes_accuracy', 'tackles_total', 'tackles_blocks', 'tackles_interceptions', 'duels_total', 'duels_won',
                                    'dribbles_attempts', 'dribbles_success', 'dribbles_past', 'fouls_drawn', 'fouls_committed', 'cards_yellow', 'cards_yellowred', 'cards_red',
                                    'penalty_won', 'penalty_commited', 'penalty_scored', 'penalty_missed', 'penalty_saved'
                                ];
                                const placeholders = allCols.map(() => '?').join(', ');
                                dbV3.run(`INSERT INTO V3_Player_Stats (${allCols.join(', ')}) VALUES (${placeholders})`,
                                    cleanParams(statData));
                            }
                        }
                    }
                    dbV3.run('COMMIT');
                } catch (err) {
                    dbV3.run('ROLLBACK');
                    console.error(`      ❌ Error on page ${currentPage}:`, err.message);
                }
                currentPage++;
            }
            console.log(`   ✅ Season ${season} complete.`);
        } catch (err) {
            console.error(`   ❌ Failed to process season ${season}:`, err.message);
        }
    }

    console.log('\n🎉 Re-import complete!');
};

runReimport().catch(console.error);
