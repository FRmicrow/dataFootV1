
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import db from '../../src/config/database.js';
import dotenv from 'dotenv';
import logger from '../../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PATCH_DIR = path.join(__dirname, '../../../dump_matches_patch');

// --- SCHEMAS ---
const PersonSchema = z.object({
    full_name: z.string().min(1),
    source_tm_id: z.string().min(1),
    source_url: z.string().url().optional().nullable(),
    photo_url: z.string().url().optional().nullable()
});

const MatchSchema = z.object({
    source_match_id: z.string().min(1),
    match_date: z.string().optional().nullable(),
    venue_name: z.string().optional().nullable(),
    attendance: z.number().int().optional().nullable(),
    referee_name: z.string().optional().nullable(),
    referee_tm_id: z.string().optional().nullable(),
    home_formation: z.string().optional().nullable(),
    away_formation: z.string().optional().nullable(),
    source_url: z.string().url().optional().nullable()
});

// --- HELPERS ---
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseFrenchDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return null;
}

async function resolvePerson(name, tmId) {
    if (!name || !tmId) return null;
    let person = await db.get('SELECT person_id FROM v4.people WHERE source_tm_id = $1', [tmId]);
    if (person) return person.person_id;
    try {
        const result = await db.run(`
            INSERT INTO v4.people (full_name, source_tm_id, created_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (source_tm_id) DO UPDATE SET full_name = EXCLUDED.full_name
            RETURNING person_id
        `, [name, tmId]);
        return result.person_id;
    } catch (err) {
        return null;
    }
}

async function resolveVenue(name) {
    if (!name) return null;
    let venue = await db.get('SELECT venue_id FROM v4.venues WHERE name = $1', [name]);
    if (venue) return venue.venue_id;
    try {
        const result = await db.run(`
            INSERT INTO v4.venues (name, created_at)
            VALUES ($1, NOW())
            ON CONFLICT DO NOTHING
            RETURNING venue_id
        `, [name]);
        return result.venue_id;
    } catch (err) {
        return null;
    }
}

async function importPeople() {
    const filePath = path.join(PATCH_DIR, 'people_patch.csv');
    if (!fs.existsSync(filePath)) return;
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    let count = 0, updated = 0, isHeader = true;
    logger.info('👤 Starting People Import (96k)...');
    for await (const line of rl) {
        if (isHeader) { isHeader = false; continue; }
        const parts = parseCsvLine(line);
        const data = { full_name: parts[0], source_tm_id: parts[1], source_url: parts[2] || null, photo_url: parts[3] || null };
        try {
            const validated = PersonSchema.parse(data);
            await db.run(`
                INSERT INTO v4.people (full_name, source_tm_id, source_url, photo_url, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (source_tm_id) DO UPDATE SET 
                    source_url = COALESCE(v4.people.source_url, EXCLUDED.source_url),
                    photo_url = COALESCE(v4.people.photo_url, EXCLUDED.photo_url)
            `, [validated.full_name, validated.source_tm_id, validated.source_url, validated.photo_url]);
            updated++;
        } catch {}
        count++;
        if (count % 10000 === 0) logger.info(`Processed ${count} people...`);
    }
    logger.info({ total: count, updated }, '✅ People Import Finished');
}

async function importMatches() {
    const filePath = path.join(PATCH_DIR, 'matchs_patch.csv');
    if (!fs.existsSync(filePath)) return;
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    let count = 0, updated = 0, isHeader = true;
    logger.info('⚽ Starting Massive Matches Import (766k)...');
    for await (const line of rl) {
        if (isHeader) { isHeader = false; continue; }
        const parts = parseCsvLine(line);
        // Columns: matchsource_id, source_match_id, source_url, match_date, date_label, venue, venue_url, attendance, referee, referee_url, referee_tm_id, home_formation, away_formation, ...
        const rawAttendance = parts[7] ? parseInt(parts[7].replace(/\D/g, '')) : null;
        const data = {
            source_match_id: parts[1],
            source_url: parts[2] || null,
            match_date: parts[3] || parseFrenchDate(parts[4]),
            venue_name: parts[5] || null,
            attendance: isNaN(rawAttendance) ? null : rawAttendance,
            referee_name: parts[8] || null,
            referee_tm_id: parts[10] || null,
            home_formation: parts[11] || null,
            away_formation: parts[12] || null
        };

        try {
            const validated = MatchSchema.parse(data);
            
            // Resolve Venue & Referee IDs (This might be slow for 766k, but necessary for data quality)
            const venueId = validated.venue_name ? await resolveVenue(validated.venue_name) : null;
            const refereeId = validated.referee_tm_id ? await resolvePerson(validated.referee_name, validated.referee_tm_id) : null;

            const result = await db.run(`
                UPDATE v4.matches 
                SET 
                    match_date = COALESCE(match_date, $1),
                    venue_id = COALESCE(venue_id, $2),
                    attendance = COALESCE(attendance, $3),
                    referee_person_id = COALESCE(referee_person_id, $4),
                    home_formation = COALESCE(home_formation, $5),
                    away_formation = COALESCE(away_formation, $6),
                    source_url = COALESCE(source_url, $7)
                WHERE source_match_id = $8
            `, [validated.match_date, venueId, validated.attendance, refereeId, validated.home_formation, validated.away_formation, validated.source_url, validated.source_match_id]);
            
            if (result.rowCount > 0) updated++;
        } catch {}
        count++;
        if (count % 5000 === 0) logger.info(`Processed ${count} matches...`);
    }
    logger.info({ total: count, updated }, '✅ Matches Import Finished');
}

async function main() {
    try {
        await db.init();
        await importPeople();
        await importMatches();
        logger.info('🎉 ULTIMATE PATCH DATA IMPORTED');
        process.exit(0);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}
main();
