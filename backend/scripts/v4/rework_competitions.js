
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function reworkCompetitions() {
    await db.init();
    logger.info('🚀 Starting competition rework (ranking + URLs)...');

    // 1. RECOVER DATA FROM SQL (International)
    const sqlFiles = [
        '../SQL-V4-Missing-Detailed-Fixed/Angleterre.sql',
        '../SQL-V4-Missing-Detailed-Fixed/International-Club.sql',
        '../SQL-V4-Missing-Detailed-Fixed/International-Nation.sql'
    ];

    for (const file of sqlFiles) {
        const absolutePath = path.resolve(process.cwd(), file);
        if (fs.existsSync(absolutePath)) {
            logger.info(`📥 Recovering from ${file}...`);
            const output = execSync(`sed -n '/COPY v4.competitions/,/\\\\./p' "${absolutePath}"`).toString();
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.startsWith('COPY') || line.startsWith('\\.') || !line.trim()) continue;
                const parts = line.split('\t');
                const compId = parts[0];
                const sourceUrl = parts[6] === '\\N' ? null : parts[6];
                const sourceCode = parts[7] === '\\N' ? null : parts[7];
                if (sourceUrl || sourceCode) {
                    await db.run(
                        'UPDATE v4.competitions SET source_url = ?, source_code = ? WHERE competition_id = ?',
                        [sourceUrl, sourceCode, compId]
                    );
                }
            }
        }
    }

    // 2. APPLY INTELLIGENT RANKING
    logger.info('📊 Applying intelligent importance_rank...');
    
    // Get country rankings and names
    const countries = await db.all('SELECT country_id, importance_rank as rank, display_name FROM v4.countries');
    const countryMap = {};
    countries.forEach(c => countryMap[c.country_id] = { rank: c.rank, name: c.display_name });

    const competitions = await db.all('SELECT competition_id, country_id, competition_type, name, source_key FROM v4.competitions');
    
    let updatedCount = 0;
    for (const comp of competitions) {
        let newRank = 999;
        const country = countryMap[comp.country_id] || { rank: 100, name: 'Unknown' };
        const cRank = country.rank;

        // International
        if (country.name.includes('International')) {
            if (comp.name.includes('Champions League')) newRank = 1;
            else if (comp.name.includes('World Cup')) newRank = 2;
            else if (comp.name.includes('Euro')) newRank = 3;
            else if (comp.name.includes('Europa League')) newRank = 5;
            else if (comp.name.includes('Conference League')) newRank = 8;
            else newRank = 20 + cRank;
        } 
        // Domestic
        else {
            if (comp.competition_type === 'league') {
                const isD2 = 
                    comp.source_key?.match(/(?:-|_| )2(?:$|_|-)/) || 
                    comp.source_key?.includes('second') ||
                    comp.name.match(/\b(?:2|II|B)\b/);

                if (isD2) {
                    newRank = 300 + (cRank * 10);
                } else {
                    newRank = 100 + (cRank * 10);
                }
            } else if (comp.competition_type === 'cup') {
                newRank = 200 + (cRank * 10);
            } else if (comp.competition_type === 'super_cup') {
                newRank = 400 + (cRank * 10);
            }
        }

        await db.run(
            'UPDATE v4.competitions SET importance_rank = ? WHERE competition_id = ?',
            [newRank, comp.competition_id]
        );
        updatedCount++;
    }

    logger.info(`🏁 Competition rework complete. Updated ${updatedCount} rankings.`);
    process.exit(0);
}

reworkCompetitions().catch(err => {
    logger.error(err);
    process.exit(1);
});
