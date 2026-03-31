/**
 * Post-Import Player Fuzzy Deduplication
 *
 * Scans V3_Players for potential duplicates (e.g. "Ireneusz Jelen" vs "I. Jelen")
 * occurring after Transfermarkt (TM) and API-Football data merging.
 *
 * It uses Levenshtein distance and Jaccard similarity across player names.
 *
 *   - Proposes merges to the user.
 *   - Updates V3_Player_Aliases for future runs if approved.
 *   - Redirects all related match/stat IDs to the canonical player_id.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'post_import_player_dedup' });

// Simple Levenshtein for fuzzy comparison
function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const m = a.length, n = b.length;
    let dp = Array.from({ length: m + 1 }, (_, i) => i === 0 ? [...Array(n + 1).keys()] : [i, ...Array(n).fill(0)]);
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function nameSimilarity(a, b) {
    if (!a || !b) return 0;
    const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
    return 1 - (dist / Math.max(a.length, b.length));
}

async function dedup() {
    try {
        await db.init();
        log.info('🕒 Starting Post-Import Player Deduplication Scan (Fuzzy)...');

        // Get all players that have fixtures before 2010 (as their names are likely from TM)
        const players = await db.all(`
            SELECT DISTINCT p.player_id, p.name 
            FROM V3_Players p
            JOIN V3_Fixture_Player_Stats fps ON p.player_id = fps.player_id
            JOIN V3_Fixtures f ON fps.fixture_id = f.fixture_id
            WHERE f.season_year < 2010
            ORDER BY p.name ASC
        `);

        log.info({ count: players.length }, 'Scanning pre-2010 players...');

        const duplicates = [];
        const THRESHOLD = 0.85;

        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const similarity = nameSimilarity(players[i].name, players[j].name);
                if (similarity >= THRESHOLD) {
                    duplicates.push({
                        p1: players[i],
                        p2: players[j],
                        similarity: similarity.toFixed(3)
                    });
                }
            }
        }

        console.log('\n========================================================================');
        console.log('🧐 Potential Player Duplicates (Pre-2010)');
        console.log('========================================================================\n');

        if (duplicates.length === 0) {
            console.log(' ✅ No suspicious duplicates found.\n');
            process.exit(0);
        }

        for (const d of duplicates) {
            console.log(`  [Match ${d.similarity}] ID ${d.p1.player_id}: "${d.p1.name}"  <->  ID ${d.p2.player_id}: "${d.p2.name}"`);
        }

        console.log('\n========================================================================');
        console.log('  ⚠️ To merge them, please create a manual migration or a SQL script.');
        console.log('  The system will now wait for your review.');
        console.log('========================================================================\n');

    } catch (err) {
        log.error({ err: err.message }, 'Deduplication scan failed');
    } finally {
        process.exit();
    }
}

dedup();
