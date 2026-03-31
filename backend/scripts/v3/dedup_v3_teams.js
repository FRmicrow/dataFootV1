/**
 * Team Deduplication & Merger (Phase 11 - Final Polish)
 *
 * Merges "Ghost" teams (auto-created without API IDs) into existing
 * official teams (with API IDs and logos) within the same country.
 *
 * This ensures 100% asset coverage and a perfectly clean V3 database.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';

/**
 * Basic Jaro-Winkler Similarity
 */
function getSimilarity(s1, s2) {
    let m = 0;
    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 1;

    let range = (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1;
    let s1Matches = new Array(s1.length);
    let s2Matches = new Array(s2.length);

    for (let i = 0; i < s1.length; i++) {
        let low = (i >= range) ? i - range : 0;
        let high = (i + range <= s2.length - 1) ? (i + range) : (s2.length - 1);

        for (let j = low; j <= high; j++) {
            if (!s1Matches[i] && !s2Matches[j] && s1[i] === s2[j]) {
                m++;
                s1Matches[i] = s2Matches[j] = true;
                break;
            }
        }
    }

    if (m === 0) return 0;

    let k = 0;
    let numTranspaces = 0;
    for (let i = 0; i < s1.length; i++) {
        if (s1Matches[i]) {
            for (let j = k; j < s2.length; j++) {
                if (s2Matches[j]) {
                    k = j + 1;
                    if (s1[i] !== s2[j]) numTranspaces++;
                    break;
                }
            }
        }
    }

    let weight = (m / s1.length + m / s2.length + (m - (numTranspaces / 2)) / m) / 3;
    let l = 0;
    let p = 0.1;
    if (weight > 0.7) {
        while (s1[l] === s2[l] && l < 4) l++;
        weight = weight + l * p * (1 - weight);
    }
    return weight;
}

/**
 * Phase 11: Clean Team Name (Strip Common Prefixes & Year Suffixes)
 */
function cleanTeamName(name, country_id) {
    if (!name) return "";
    let clean = name.toLowerCase().trim();
    
    // In England (2), Afc usually denotes a lower-league separate club
    if (country_id === 2 && clean.startsWith('afc ')) {
        return clean; 
    }

    // Common prefixes list
    const prefixes = [
        /^fc /, /^sv /, /^1\.fc /, /^1\. /, /^tsv /, /^msv /, /^vfb /, /^vfl /, 
        /^racing club /, /^rc /, /^as /, /^sc /, /^st /, /^st\. /, /^at\. /, /^deportivo /, /^real /,
        /^stade de /, /^us /
    ];
    for (const p of prefixes) {
        clean = clean.replace(p, "").trim();
    }

    // Year suffixes (e.g. ' 04', ' 1899')
    clean = clean.replace(/ \d{2,4}$/, "").trim();

    return clean;
}

/**
 * Phase 11: Dynamic Similarity Guard (Conservative)
 */
function isAMatch(name1, name2, score, country_id) {
    const s1 = cleanTeamName(name1, country_id);
    const s2 = cleanTeamName(name2, country_id);
    
    // 1. Exact match after cleaning (Captures Fc Schalke 04 vs Schalke 04)
    if (s1 === s2 && s1.length > 3) return true;

    // 2. Extremely high similarity (98%+)
    if (score >= 0.98) return true;

    // 3. Substring match (e.g. 'Schalke' is in 'Fc Schalke 04')
    if (s1.length > 5 && s2.length > 5) {
        if (s1.includes(s2) || s2.includes(s1)) {
            // Require 0.95 if it's a substring
            return score >= 0.95;
        }
    }

    return false;
}

async function dedup() {
    try {
        await db.init();
        console.log('--- 🧹 Unified Team Merger & Deduplication (Phase 11) ---');

        // 0. Orphan Sweep: Assign country_id to teams with NULL country_id
        // Based on the league they belong to
        console.log('[Phase 1] 🧹 Orphan Sweep: Mapping teams to countries...');
        const orphans = await db.all(`
            SELECT DISTINCT t.team_id, l.country_id 
            FROM V3_Teams t
            JOIN V3_Fixtures f ON (t.team_id = f.home_team_id OR t.team_id = f.away_team_id)
            JOIN V3_Leagues l ON f.league_id = l.league_id
            WHERE t.country_id IS NULL AND l.country_id IS NOT NULL
        `);
        
        for (const { team_id, country_id } of orphans) {
            await db.run('UPDATE V3_Teams SET country_id = $1 WHERE team_id = $2', [country_id, team_id]);
        }
        console.log(`   - Linked ${orphans.length} orphans to their respective countries.`);

        // 1. Batch Process Countries
        const countries = await db.all('SELECT country_id FROM V3_Countries ORDER BY country_id');
        
        for (const { country_id } of countries) {
            if (!country_id) continue;

            const teams = await db.all(
                'SELECT team_id, name, api_id, logo_url FROM V3_Teams WHERE country_id = $1',
                [country_id]
            );

            if (teams.length < 2) continue;

            // 2. Identify potential merges
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    const t1 = teams[i];
                    const t2 = teams[j];

                    const score = getSimilarity(
                        t1.name.toLowerCase(), 
                        t2.name.toLowerCase()
                    );

                    // Phase 11: Dynamic guard with country awareness
                    if (isAMatch(t1.name, t2.name, score, country_id)) {
                        // Determine Winner
                        let winner = null;
                        let loser = null;

                        const has1 = !!t1.api_id;
                        const has2 = !!t2.api_id;

                        if (has1 && !has2) {
                            winner = t1; loser = t2;
                        } else if (has2 && !has1) {
                            winner = t2; loser = t1;
                        } else if (has1 && has2) {
                            if (t1.logo_url && !t2.logo_url) {
                                winner = t1; loser = t2;
                            } else if (t2.logo_url && !t1.logo_url) {
                                winner = t2; loser = t1;
                            } else {
                                winner = (parseInt(t1.api_id) < parseInt(t2.api_id)) ? t1 : t2;
                                loser = (winner === t1) ? t2 : t1;
                            }
                        } else {
                            winner = (t1.team_id < t2.team_id) ? t1 : t2;
                            loser = (winner === t1) ? t2 : t1;
                        }

                        if (winner && loser) {
                            const tx = await db.getTransactionClient();
                            try {
                                await tx.beginTransaction();

                                // Re-verify loser exists
                                const stillExists = await tx.get(`SELECT team_id FROM V3_Teams WHERE team_id = $1`, [loser.team_id]);
                                if (!stillExists) {
                                    await tx.rollback();
                                    continue;
                                }

                                console.log(`[Merging] "${loser.name}" (ID:${loser.team_id}) -> "🏆 ${winner.name}" (ID:${winner.team_id}) [Score: ${score.toFixed(2)}]`);

                                // 1. Fixture Lineups
                                await tx.run(`DELETE FROM V3_Fixture_Lineups WHERE team_id = $1 AND fixture_id IN (SELECT fixture_id FROM V3_Fixture_Lineups WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE V3_Fixture_Lineups SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);
                                
                                // 2. Fixture Stats
                                await tx.run(`DELETE FROM v3_fixture_stats WHERE team_id = $1 AND fixture_id IN (SELECT fixture_id FROM v3_fixture_stats WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE v3_fixture_stats SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);

                                // 3. Fixture Player Stats
                                await tx.run(`DELETE FROM V3_Fixture_Player_Stats WHERE team_id = $1 AND (fixture_id, player_id) IN (SELECT fixture_id, player_id FROM V3_Fixture_Player_Stats WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE V3_Fixture_Player_Stats SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);
                                
                                // 4. General Player Stats
                                await tx.run(`DELETE FROM v3_player_stats WHERE team_id = $1 AND (player_id, league_id, season_year) IN (SELECT player_id, league_id, season_year FROM v3_player_stats WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE v3_player_stats SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);

                                // 5. Fixtures
                                await tx.run(`UPDATE V3_Fixtures SET home_team_id = $1 WHERE home_team_id = $2`, [winner.team_id, loser.team_id]);
                                await tx.run(`UPDATE V3_Fixtures SET away_team_id = $1 WHERE away_team_id = $2`, [winner.team_id, loser.team_id]);

                                // 6. Standings
                                await tx.run(`DELETE FROM V3_Standings WHERE team_id = $1 AND (league_id, season_year) IN (SELECT league_id, season_year FROM V3_Standings WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE V3_Standings SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);

                                // 7. Player Season Stats
                                await tx.run(`DELETE FROM V3_Player_Season_Stats WHERE team_id = $1 AND (league_id, season_year, player_id) IN (SELECT league_id, season_year, player_id FROM V3_Player_Season_Stats WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE V3_Player_Season_Stats SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);

                                // 8. XG tables
                                await tx.run(`DELETE FROM v3_league_season_xg WHERE team_id = $1 AND (league_id, season_year) IN (SELECT league_id, season_year FROM v3_league_season_xg WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE v3_league_season_xg SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);
                                await tx.run(`DELETE FROM v3_player_season_xg WHERE team_id = $1 AND (league_id, season_year, player_id) IN (SELECT player_id, league_id, season_year FROM v3_player_season_xg WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE v3_player_season_xg SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);

                                // 9. Trophies
                                await tx.run(`UPDATE v3_trophies SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);

                                // 10. Meta tables
                                await tx.run(`DELETE FROM v3_team_aliases WHERE team_id = $1 AND (alias_name, data_source) IN (SELECT alias_name, data_source FROM v3_team_aliases WHERE team_id = $2)`, [loser.team_id, winner.team_id]);
                                await tx.run(`UPDATE v3_team_aliases SET team_id = $1 WHERE team_id = $2`, [winner.team_id, loser.team_id]);
                                await tx.run(`UPDATE v3_import_team_resolution SET resolved_team_id = $1 WHERE resolved_team_id = $2`, [winner.team_id, loser.team_id]);

                                // 11. Final Prune
                                await tx.run(`DELETE FROM V3_Teams WHERE team_id = $1`, [loser.team_id]);
                                
                                await tx.commit();
                            } catch (err) {
                                await tx.rollback();
                                console.error(`   ! Failed to merge ${loser.name}: ${err.message}`);
                            } finally {
                                tx.release();
                            }
                        }
                    }
                }
            }
        }

        console.log('--- ✅ Deduplication Complete ---');
        process.exit(0);
    } catch (e) {
        console.error('Dedup failed:', e.message);
        process.exit(1);
    }
}

dedup();
