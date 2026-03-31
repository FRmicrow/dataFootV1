import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const LEAGUE_ID = process.argv.includes('--league') ? process.argv[process.argv.indexOf('--league') + 1] : '1';
const SEASON_YEAR = process.argv.includes('--season') ? process.argv[process.argv.indexOf('--season') + 1] : null;
const LEAGUE_NAME = process.argv.includes('--name') ? process.argv[process.argv.indexOf('--name') + 1] : 'Ligue1';

if (!SEASON_YEAR) {
    console.log('Usage: node historical_ingester.js --season <year> [--league <id>] [--name <name>]');
    process.exit(1);
}

const seasonPattern = `${SEASON_YEAR}-${parseInt(SEASON_YEAR) + 1}`;
const BASE_DIR = `/app/.tmp_extracted/DONE/LeagueFixture/${LEAGUE_NAME}/${seasonPattern}/fixtureDetail/`;
const TEMP_BATCH_DIR = `/app/externalData/TempBatch/${LEAGUE_NAME}_${SEASON_YEAR}/`;

async function run() {
    try {
        if (!fs.existsSync(BASE_DIR)) {
            console.error(`Source dir not found: ${BASE_DIR}`);
            // Fallback: check if files are directly in Ligue1/ folder with the pattern in name
            const FALLBACK_DIR = `/app/.tmp_extracted/DONE/LeagueFixture/${LEAGUE_NAME}/`;
            if (fs.existsSync(FALLBACK_DIR)) {
                 console.log(`Trying fallback in ${FALLBACK_DIR}`);
                 processFiles(FALLBACK_DIR, seasonPattern);
            }
            return;
        }

        processFiles(BASE_DIR, null);

    } catch (err) {
        console.error('Ingestion failed:', err);
    }
}

function processFiles(sourceDir, pattern) {
    if (fs.existsSync(TEMP_BATCH_DIR)) fs.rmSync(TEMP_BATCH_DIR, { recursive: true });
    fs.mkdirSync(TEMP_BATCH_DIR, { recursive: true });

    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json'));
    const seasonFiles = pattern ? files.filter(f => f.includes(pattern)) : files;

    console.log(`Found ${seasonFiles.length} matches for ${LEAGUE_NAME} ${SEASON_YEAR} in ${sourceDir}`);

    for (const file of seasonFiles) {
        // Extract TM ID from pattern: Ligue1-fixtureDetail-YYYY-YYYY-ID-TeamName...json (if pattern exists)
        // Or handle direct files if no pattern
        let tmIdPart = null;
        if (file.includes('fixtureDetail')) {
            const parts = file.split('-');
            tmIdPart = parts[4]; 
        } else if (file.includes('spielbericht')) {
            tmIdPart = file.match(/\d+/)?.[0];
        }

        if (tmIdPart && /^\d+$/.test(tmIdPart)) {
            const targetPath = path.resolve(TEMP_BATCH_DIR, `spielbericht_${tmIdPart}.json`);
            const sourcePath = path.resolve(sourceDir, file);
            try {
                fs.symlinkSync(sourcePath, targetPath);
            } catch (e) {
                // Skip if symlink already exists or fails
            }
        }
    }
}

run();
