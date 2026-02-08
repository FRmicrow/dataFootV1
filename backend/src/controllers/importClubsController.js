import db from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

export const importClubsRange = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        const START_ID = parseInt(req.query.start) || 1;
        const END_ID = parseInt(req.query.end) || 1000;

        sendLog(`🚀 Starting import for Club IDs ${START_ID} to ${END_ID}...`, 'info');

        // 1. Get existing IDs to skip
        const existingClubs = db.all(
            'SELECT api_id FROM V2_clubs WHERE api_id BETWEEN ? AND ?',
            [START_ID, END_ID]
        );
        const existingIds = new Set(existingClubs.map(c => c.api_id));

        sendLog(`📊 Found ${existingIds.size} existing clubs in this range (Skipping)`, 'info');

        // 2. Identify missing IDs
        const idsToProcess = [];
        for (let i = START_ID; i <= END_ID; i++) {
            if (!existingIds.has(i)) {
                idsToProcess.push(i);
            }
        }

        sendLog(`📋 ${idsToProcess.length} clubs to fetch...`, 'info');

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
                // Rate limiting (approx 400 calls/min)
                await new Promise(resolve => setTimeout(resolve, 150));

                const response = await axios.get(`${API_BASE_URL}/teams`, {
                    headers: { 'x-apisports-key': API_KEY },
                    params: { id: apiId }
                });

                const data = response.data?.response?.[0];

                if (data) {
                    const team = data.team;
                    const venue = data.venue;

                    // Handle Country
                    let countryId = 1; // Default World/Unknown
                    if (team.country) {
                        // Try to find country
                        let countryRecord = db.get(
                            'SELECT country_id FROM V2_countries WHERE country_name = ?',
                            [team.country]
                        );

                        if (countryRecord) {
                            countryId = countryRecord.country_id;
                        } else {
                            // Create country if missing (simple fallback)
                            try {
                                db.run(
                                    'INSERT INTO V2_countries (country_name) VALUES (?)',
                                    [team.country]
                                );
                                countryRecord = db.get(
                                    'SELECT country_id FROM V2_countries WHERE country_name = ?',
                                    [team.country]
                                );
                                if (countryRecord) countryId = countryRecord.country_id;
                            } catch (e) {
                                // Ignore duplicate errors or race conditions
                            }
                        }
                    }

                    // Insert Club
                    db.run(`
                        INSERT INTO V2_clubs (
                            api_id, 
                            club_name, 
                            club_short_name,
                            country_id,
                            city,
                            stadium_name,
                            stadium_capacity,
                            founded_year,
                            club_logo_url
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        team.id,
                        team.name,
                        team.code || null,
                        countryId,
                        venue?.city || null,
                        venue?.name || null,
                        venue?.capacity || null,
                        team.founded || null,
                        team.logo
                    ]);

                    imported++;
                    sendLog(`✅ Imported: [${team.id}] ${team.name}`, 'success');

                } else {
                    // Valid response but no data means ID doesn't exist
                }

            } catch (err) {
                console.error(`Error importing club ${apiId}:`, err.message);
                sendLog(`❌ Error ID ${apiId}: ${err.message}`, 'error');
                errors++;
            }
        }

        sendLog('✅ Club Import Complete!', 'success');

        res.write(`data: ${JSON.stringify({
            type: 'complete',
            imported,
            skipped,
            errors
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error('❌ Error in club import controller:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
        })}\n\n`);
        res.end();
    }
};
