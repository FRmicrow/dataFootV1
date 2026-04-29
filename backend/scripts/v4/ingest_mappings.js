
import fs from 'fs';
import path from 'path';
import readline from 'node:readline';
import dotenv from 'dotenv';
dotenv.config();
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function ingestCompetitions(filePath) {
    logger.info({ filePath }, '🚀 Starting Competitions mapping ingestion');
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let mapped = 0;
    let skipped = 0;
    let headers = null;

    for await (const line of rl) {
        if (!headers) {
            headers = line.split(',');
            continue;
        }

        const values = line.split(',');
        const row = headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
        }, {});

        const { tm_id, flashscore_id, confidence } = row;

        if (!flashscore_id || parseFloat(confidence) < 0.8) {
            skipped++;
            continue;
        }

        try {
            // Find canonical ID from TM mapping
            const existingMapping = await db.get(
                `SELECT competition_id FROM v4.mapping_competitions WHERE source = 'transfermarkt' AND source_id = ?`,
                [tm_id]
            );

            if (existingMapping) {
                // Link Flashscore ID to the same canonical ID
                await db.run(
                    `INSERT INTO v4.mapping_competitions (source, source_id, competition_id, source_name) 
                     VALUES ('flashscore', ?, ?, ?) ON CONFLICT DO NOTHING`,
                    [flashscore_id, existingMapping.competition_id, row.flashscore_nom || row.tm_nom]
                );
                mapped++;
            } else {
                // Try matching by name
                const byName = await db.get(
                    `SELECT competition_id FROM v4.competitions WHERE name = ? LIMIT 1`,
                    [row.tm_nom]
                );
                if (byName) {
                    await db.run(
                        `INSERT INTO v4.mapping_competitions (source, source_id, competition_id, source_name) 
                         VALUES ('flashscore', ?, ?, ?) ON CONFLICT DO NOTHING`,
                        [flashscore_id, byName.competition_id, row.flashscore_nom || row.tm_nom]
                    );
                    // Also add the TM mapping if it was missing with this ID
                    await db.run(
                        `INSERT INTO v4.mapping_competitions (source, source_id, competition_id, source_name) 
                         VALUES ('transfermarkt', ?, ?, ?) ON CONFLICT DO NOTHING`,
                        [tm_id, byName.competition_id, row.tm_nom]
                    );
                    mapped++;
                } else {
                    skipped++;
                }
            }
        } catch (err) {
            logger.error({ err, tm_id, flashscore_id }, '❌ Error mapping competition');
        }

        count++;
        if (count % 100 === 0) logger.info(`Processed ${count} rows...`);
    }

    logger.info({ count, mapped, skipped }, '✅ Competitions ingestion finished');
}
async function ingestTeams(filePath) {
    logger.info({ filePath }, '🚀 Starting Teams mapping ingestion');
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let mapped = 0;
    let skipped = 0;
    let headers = null;

    for await (const line of rl) {
        if (!headers) {
            headers = line.split(',');
            continue;
        }

        const values = line.split(',');
        const row = headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
        }, {});

        const { tm_id, flashscore_id, confidence } = row;

        if (!flashscore_id || parseFloat(confidence) < 0.8) {
            skipped++;
            continue;
        }

        try {
            // Find canonical ID from TM mapping
            const existingMapping = await db.get(
                `SELECT team_id FROM v4.mapping_teams WHERE source = 'transfermarkt' AND source_id = ?`,
                [tm_id]
            );

            if (existingMapping) {
                await db.run(
                    `INSERT INTO v4.mapping_teams (source, source_id, team_id, source_name) 
                     VALUES ('flashscore', ?, ?, ?) ON CONFLICT DO NOTHING`,
                    [flashscore_id, existingMapping.team_id, row.flashscore_nom || row.tm_nom]
                );
                mapped++;
            } else {
                // Try matching by name (this is harder without country, but let's try exact name)
                const byName = await db.get(
                    `SELECT team_id FROM v4.teams WHERE name = ? LIMIT 1`,
                    [row.tm_nom]
                );
                if (byName) {
                    await db.run(
                        `INSERT INTO v4.mapping_teams (source, source_id, team_id, source_name) 
                         VALUES ('flashscore', ?, ?, ?) ON CONFLICT DO NOTHING`,
                        [flashscore_id, byName.team_id, row.flashscore_nom || row.tm_nom]
                    );
                    mapped++;
                } else {
                    skipped++;
                }
            }
        } catch (err) {
            logger.error({ err, tm_id, flashscore_id }, '❌ Error mapping team');
        }

        count++;
        if (count % 1000 === 0) logger.info(`Processed ${count} teams...`);
    }

    logger.info({ count, mapped, skipped }, '✅ Teams ingestion finished');
}

async function ingestVenues(filePath) {
    logger.info({ filePath }, '🚀 Starting Venues mapping ingestion');
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let mapped = 0;
    let skipped = 0;
    let headers = null;

    for await (const line of rl) {
        if (!headers) {
            headers = line.split(',');
            continue;
        }

        const values = line.split(',');
        const row = headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
        }, {});

        const { tm_id, flashscore_id, confidence } = row;

        if (!tm_id) {
            skipped++;
            continue;
        }

        try {
            const existing = await db.get(
                `SELECT venue_id FROM v4.mapping_venues WHERE source = 'transfermarkt' AND source_id = ?`,
                [tm_id]
            );

            if (existing) {
                if (flashscore_id && parseFloat(confidence) >= 0.8) {
                    await db.run(
                        `INSERT INTO v4.mapping_venues (source, source_id, venue_id, source_name) 
                         VALUES ('flashscore', ?, ?, ?) ON CONFLICT DO NOTHING`,
                        [flashscore_id, existing.venue_id, row.flashscore_nom || row.tm_nom]
                    );
                    mapped++;
                } else {
                    skipped++;
                }
            } else {
                const byName = await db.get(
                    `SELECT venue_id FROM v4.venues WHERE name = ? LIMIT 1`,
                    [row.tm_nom]
                );
                if (byName) {
                    await db.run(
                        `INSERT INTO v4.mapping_venues (source, source_id, venue_id, source_name) 
                         VALUES ('transfermarkt', ?, ?, ?) ON CONFLICT DO NOTHING`,
                        [tm_id, byName.venue_id, row.tm_nom]
                    );
                    mapped++;
                } else {
                    skipped++;
                }
            }
        } catch (err) {
            logger.error({ err, tm_id }, '❌ Error mapping venue');
        }

        count++;
    }

    logger.info({ count, mapped, skipped }, '✅ Venues ingestion finished');
}

async function ingestPeople(filePath) {
    logger.info({ filePath }, '🚀 Starting People mapping ingestion');
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let mapped = 0;
    let skipped = 0;
    let headers = null;
    let batch = [];
    const BATCH_SIZE = 500;

    for await (const line of rl) {
        if (!headers) {
            headers = line.split(',');
            continue;
        }

        const values = line.split(',');
        const row = headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
        }, {});

        const { tm_id, flashscore_id, confidence } = row;

        if (!flashscore_id || parseFloat(confidence) < 0.8) {
            skipped++;
            continue;
        }

        batch.push({ tm_id, flashscore_id, name: row.flashscore_nom || row.tm_nom });

        if (batch.length >= BATCH_SIZE) {
            const results = await processPeopleBatch(batch);
            mapped += results.mapped;
            skipped += results.skipped;
            batch = [];
            logger.info(`Processed ${count} people... (Mapped: ${mapped})`);
        }
        count++;
    }

    if (batch.length > 0) {
        const results = await processPeopleBatch(batch);
        mapped += results.mapped;
        skipped += results.skipped;
    }

    logger.info({ count, mapped, skipped }, '✅ People ingestion finished');
}

async function processPeopleBatch(batch) {
    let mapped = 0;
    let skipped = 0;

    const client = await db.getTransactionClient();
    await client.beginTransaction();

    try {
        for (const item of batch) {
            const existingMapping = await client.get(
                `SELECT person_id FROM v4.mapping_people WHERE source LIKE 'transfermarkt%' AND source_id = ? LIMIT 1`,
                [item.tm_id]
            );

            if (existingMapping) {
                await client.run(
                    `INSERT INTO v4.mapping_people (source, source_id, person_id, source_name) 
                     VALUES ('flashscore', ?, ?, ?) ON CONFLICT DO NOTHING`,
                    [item.flashscore_id, existingMapping.person_id, item.name]
                );
                mapped++;
            } else {
                skipped++;
            }
        }
        await client.commit();
    } catch (err) {
        await client.rollback();
        logger.error({ err }, '❌ Error in people batch transaction');
    } finally {
        client.release();
    }

    return { mapped, skipped };
}



async function run() {
    const basePath = '../Final-TM-FS-IDs';
    await db.init();
    
    try {
        await ingestCompetitions(path.join(basePath, 'competitions.csv'));
        await ingestTeams(path.join(basePath, 'equipes.csv'));
        await ingestVenues(path.join(basePath, 'venues.csv'));
        await ingestPeople(path.join(basePath, 'joueurs.csv'));
    } catch (err) {
        logger.error(err);
    } finally {
        process.exit(0);
    }
}

run();
