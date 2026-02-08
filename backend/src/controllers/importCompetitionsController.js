import db from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

export const importCompetitionsRange = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        const START_ID = parseInt(req.query.start) || 1;
        const END_ID = parseInt(req.query.end) || 1000;

        sendLog(`🚀 Starting import for competition IDs ${START_ID} to ${END_ID}...`, 'info');

        // 1. Get existing IDs to skip
        const existingComps = db.all(
            'SELECT api_id FROM V2_competitions WHERE api_id BETWEEN ? AND ?',
            [START_ID, END_ID]
        );
        const existingIds = new Set(existingComps.map(c => c.api_id));

        sendLog(`📊 Found ${existingIds.size} existing competitions in this range (Skipping)`, 'info');

        // 2. Identify missing IDs
        const idsToProcess = [];
        for (let i = START_ID; i <= END_ID; i++) {
            if (!existingIds.has(i)) {
                idsToProcess.push(i);
            }
        }

        sendLog(`📋 ${idsToProcess.length} competitions to fetch...`, 'info');

        let imported = 0;
        let errors = 0;
        let skipped = existingIds.size;

        for (let i = 0; i < idsToProcess.length; i++) {
            const apiId = idsToProcess[i];

            // Progress update every 5 items
            if (i % 5 === 0) {
                const progress = Math.round((i / idsToProcess.length) * 100);
                sendLog(`⏳ Progress: ${i}/${idsToProcess.length} (${progress}%)`, 'progress');
            }

            try {
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 350));

                const response = await axios.get(`${API_BASE_URL}/leagues`, {
                    headers: { 'x-apisports-key': API_KEY },
                    params: { id: apiId }
                });

                const data = response.data?.response?.[0];

                if (data) {
                    const league = data.league;
                    const country = data.country;

                    // Handle Country
                    let countryId = 1; // Default World
                    if (country && country.name) {
                        // Try to find country
                        let countryRecord = db.get(
                            'SELECT country_id FROM V2_countries WHERE country_name = ?',
                            [country.name]
                        );

                        // Create country if missing? Or just use World?
                        // Ideally we should create it if we want full data
                        if (!countryRecord && country.name !== 'World') {
                            try {
                                db.run(
                                    'INSERT INTO V2_countries (country_name, country_code, flag_url) VALUES (?, ?, ?)',
                                    [country.name, country.code, country.flag]
                                );
                                countryRecord = db.get(
                                    'SELECT country_id FROM V2_countries WHERE country_name = ?',
                                    [country.name]
                                );
                            } catch (e) {
                                // Ignore duplicate errors
                                countryRecord = db.get(
                                    'SELECT country_id FROM V2_countries WHERE country_name = ?',
                                    [country.name]
                                );
                            }
                        }

                        if (countryRecord) {
                            countryId = countryRecord.country_id;
                        }
                    }

                    // Insert Competition
                    db.run(`
                        INSERT INTO V2_competitions (
                            api_id, 
                            competition_name, 
                            country_id
                        ) VALUES (?, ?, ?)
                    `, [
                        league.id,
                        league.name,
                        countryId
                    ]);

                    imported++;
                    sendLog(`✅ Imported: [${league.id}] ${league.name} (${country.name})`, 'success');

                } else {
                    // Valid response but no data means ID doesn't exist on API-Football side (gaps in IDs are possible)
                    // sendLog(`⚠️ ID ${apiId} not found in API`, 'warning');
                }

            } catch (err) {
                console.error(`Error importing ${apiId}:`, err.message);
                sendLog(`❌ Error ID ${apiId}: ${err.message}`, 'error');
                errors++;
            }
        }

        sendLog('✅ Import Complete!', 'success');

        res.write(`data: ${JSON.stringify({
            type: 'complete',
            imported,
            skipped,
            errors
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error('❌ Error in import controller:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
        })}\n\n`);
        res.end();
    }
};
