import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import { Transform } from 'stream';
import 'dotenv/config';

import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(backendRoot, '..');
const sqlDir = process.env.SQL_V4_DIR
    ? path.resolve(process.env.SQL_V4_DIR)
    : path.resolve(repoRoot, 'SQL-V4');
const summaryPath = path.join(sqlDir, '_summary.json');
const logsDir = path.resolve(backendRoot, 'logs');

const COUNTRY_OVERRIDES = {
    AfriqueDuSud: { display_name: 'Afrique du Sud' },
    ArabieSaoudite: { display_name: 'Arabie saoudite' },
    BosnIeHerzegovine: { display_name: 'Bosnie-Herzegovine' },
    CoreeDuSud: { display_name: 'Coree du Sud' },
    CoteDIvoire: { display_name: "Cote d'Ivoire" },
    EmiratsArabesUnis: { display_name: 'Emirats arabes unis' },
    GuineeEquatoriale: { display_name: 'Guinee equatoriale' },
    IrlandeDuNord: { display_name: 'Irlande du Nord' },
    MacedoineduNord: { display_name: 'Macedoine du Nord' },
    PaysBas: { display_name: 'Pays-Bas' },
    PaysDeGalles: { display_name: 'Pays de Galles' },
    RepubliqueTcheque: { display_name: 'Republique tcheque' },
    RDCongo: { display_name: 'RD Congo' },
    InternationalClub: { display_name: 'International Club', entity_type: 'international' },
    InternationalNation: { display_name: 'International Nation', entity_type: 'international' },
    USA: { display_name: 'USA' }
};

const TABLES_IN_RESET_ORDER = [
    'v4.match_lineups',
    'v4.match_events',
    'v4.club_logos',
    'v4.competition_logos',
    'v4.matches',
    'v4.venues',
    'v4.people',
    'v4.clubs',
    'v4.competitions',
    'v4.import_batches',
    'v4.data_freezes',
    'v4.countries'
];

function getArgValue(name) {
    const prefix = `${name}=`;
    const match = process.argv.find((arg) => arg.startsWith(prefix));
    return match ? match.slice(prefix.length) : null;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function nowIso() {
    return new Date().toISOString();
}

function commandExists(command) {
    return spawnSync('which', [command], { encoding: 'utf8' }).status === 0;
}

function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function getCountryKey(rawName) {
    return rawName.replace(/[^a-zA-Z0-9]/g, '');
}

function getCountryMetadata(countryRow) {
    const key = getCountryKey(countryRow.name);
    const override = COUNTRY_OVERRIDES[key] || {};
    const iso2 = countryRow.iso2 ? String(countryRow.iso2).toLowerCase() : null;

    return {
        display_name: override.display_name || countryRow.name,
        slug: override.slug || slugify(override.display_name || countryRow.name),
        entity_type: override.entity_type || 'country',
        flag_url: iso2 ? `https://flagcdn.com/h80/${iso2}.png` : null
    };
}

function loadSummary() {
    if (!fs.existsSync(summaryPath)) {
        throw new Error(`Missing summary file: ${summaryPath}`);
    }
    return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
}

function ensureLogsDir() {
    fs.mkdirSync(logsDir, { recursive: true });
}

function csvEscape(value) {
    const stringValue = value == null ? '' : String(value);
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

function resolveSqlFiles(summary) {
    const requested = getArgValue('--countries') || getArgValue('--country');
    const requestedSet = requested
        ? new Set(requested.split(',').map((item) => item.trim()).filter(Boolean))
        : null;

    const entries = summary
        .filter((entry) => !requestedSet || requestedSet.has(entry.country))
        .map((entry) => ({
            ...entry,
            sqlFile: path.join(sqlDir, entry.output_file.replace(/\.gz$/, ''))
        }))
        .filter((entry) => fs.existsSync(entry.sqlFile));

    if (entries.length === 0) {
        throw new Error('No SQL-V4 files matched the current selection.');
    }

    return entries;
}

function resolveDockerPsqlCommand() {
    const container = process.env.POSTGRES_CONTAINER || 'statfoot-db';
    const inspect = spawnSync('docker', ['inspect', container, '--format', '{{range .Config.Env}}{{println .}}{{end}}'], {
        encoding: 'utf8'
    });

    if (inspect.status !== 0) {
        throw new Error(`Unable to inspect docker container "${container}".`);
    }

    const envMap = Object.fromEntries(
        inspect.stdout
            .split('\n')
            .filter(Boolean)
            .map((line) => {
                const idx = line.indexOf('=');
                return [line.slice(0, idx), line.slice(idx + 1)];
            })
    );

    if (!envMap.POSTGRES_USER || !envMap.POSTGRES_DB) {
        throw new Error(`Container "${container}" does not expose POSTGRES_USER/POSTGRES_DB.`);
    }

    return {
        command: 'docker',
        args: ['exec', '-i', container, 'psql', '-U', envMap.POSTGRES_USER, '-d', envMap.POSTGRES_DB, '-v', 'ON_ERROR_STOP=1']
    };
}

function resolvePsqlCommand() {
    if (commandExists('psql') && process.env.DATABASE_URL) {
        return {
            command: 'psql',
            args: [process.env.DATABASE_URL, '-v', 'ON_ERROR_STOP=1']
        };
    }

    if (commandExists('docker')) {
        return resolveDockerPsqlCommand();
    }

    throw new Error('Neither local psql nor docker-based psql is available.');
}

function createSchemaRewriteTransform(targetSchema) {
    return new Transform({
        transform(chunk, _encoding, callback) {
            const text = chunk
                .toString('utf8')
                .replace(/CREATE SCHEMA IF NOT EXISTS v4;/g, `CREATE SCHEMA IF NOT EXISTS ${targetSchema};`)
                .replace(/\bv4\./g, `${targetSchema}.`)
                .replace(/\bPRIMARY KEY\b/g, '');

            callback(null, text);
        }
    });
}

function executePsqlFile(sqlFile, targetSchema = 'v4') {
    const { command, args } = resolvePsqlCommand();

    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: repoRoot,
            stdio: ['pipe', 'inherit', 'inherit']
        });

        const stream = fs.createReadStream(sqlFile);
        const inputStream = targetSchema === 'v4'
            ? stream
            : stream.pipe(createSchemaRewriteTransform(targetSchema));

        stream.on('error', reject);
        child.stdin.on('error', (error) => {
            if (error.code !== 'EPIPE') {
                reject(error);
            }
        });
        inputStream.pipe(child.stdin);

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`psql import failed for ${path.basename(sqlFile)} with exit code ${code}`));
        });
    });
}

function getStageSchemaName(entry) {
    return `v4_stage_${slugify(entry.country).replace(/-/g, '_')}`;
}

async function ensureMetadataTables() {
    await db.run('CREATE SCHEMA IF NOT EXISTS v4');

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.import_batches (
            batch_id BIGINT PRIMARY KEY,
            provider TEXT NOT NULL,
            batch_label TEXT NOT NULL,
            source_file TEXT,
            generated_at TIMESTAMPTZ
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.countries (
            country_id BIGINT PRIMARY KEY,
            name TEXT NOT NULL,
            iso2 TEXT,
            iso3 TEXT
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.competitions (
            competition_id BIGINT PRIMARY KEY,
            country_id BIGINT NOT NULL,
            name TEXT NOT NULL,
            competition_type TEXT NOT NULL,
            source_key TEXT NOT NULL,
            current_logo_url TEXT
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.clubs (
            club_id BIGINT PRIMARY KEY,
            country_id BIGINT,
            name TEXT NOT NULL,
            short_name TEXT,
            current_logo_url TEXT
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.people (
            person_id BIGINT PRIMARY KEY,
            full_name TEXT NOT NULL,
            person_type TEXT NOT NULL
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.venues (
            venue_id BIGINT PRIMARY KEY,
            name TEXT NOT NULL,
            country_id BIGINT,
            capacity INTEGER
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.club_logos (
            club_logo_id BIGINT PRIMARY KEY,
            club_id BIGINT NOT NULL,
            logo_url TEXT NOT NULL,
            start_season TEXT,
            end_season TEXT,
            start_year INTEGER,
            end_year INTEGER,
            first_match_source_id TEXT,
            last_match_source_id TEXT
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.competition_logos (
            competition_logo_id BIGINT PRIMARY KEY,
            competition_id BIGINT NOT NULL,
            logo_url TEXT NOT NULL,
            start_season TEXT,
            end_season TEXT,
            start_year INTEGER,
            end_year INTEGER,
            first_match_source_id TEXT,
            last_match_source_id TEXT
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.matches (
            match_id BIGINT PRIMARY KEY,
            source_provider TEXT NOT NULL,
            source_match_id TEXT NOT NULL,
            competition_id BIGINT NOT NULL,
            season_label TEXT,
            match_date DATE,
            home_club_id BIGINT,
            away_club_id BIGINT,
            home_score INTEGER,
            away_score INTEGER,
            source_file TEXT,
            source_url TEXT,
            source_title TEXT,
            source_dataset TEXT,
            source_competition_key TEXT,
            date_label TEXT,
            round_label TEXT,
            matchday INTEGER,
            venue_id BIGINT,
            attendance INTEGER,
            referee_person_id BIGINT,
            home_formation TEXT,
            away_formation TEXT
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.match_events (
            match_event_id BIGINT PRIMARY KEY,
            match_id BIGINT NOT NULL,
            event_order INTEGER NOT NULL,
            minute_label TEXT,
            side TEXT,
            event_type TEXT NOT NULL,
            player_id BIGINT,
            related_player_id BIGINT,
            goal_type TEXT,
            assist_type TEXT,
            card_type TEXT,
            detail TEXT,
            score_at_event TEXT
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.match_lineups (
            match_lineup_id BIGINT PRIMARY KEY,
            match_id BIGINT NOT NULL,
            club_id BIGINT NOT NULL,
            player_id BIGINT NOT NULL,
            side TEXT NOT NULL,
            is_starter BOOLEAN NOT NULL,
            jersey_number TEXT,
            role_code TEXT,
            position_code TEXT,
            position_top_pct REAL,
            position_left_pct REAL
        )
    `);

    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS display_name TEXT');
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS slug TEXT');
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS flag_url TEXT');
    await db.run("ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'country'");
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');
    await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_v4_countries_slug_unique ON v4.countries(slug)');

    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.data_freezes (
            freeze_id BIGSERIAL PRIMARY KEY,
            scope_type TEXT NOT NULL,
            scope_key TEXT NOT NULL,
            country_id BIGINT,
            batch_id BIGINT,
            verification_status TEXT NOT NULL DEFAULT 'imported',
            is_locked BOOLEAN NOT NULL DEFAULT FALSE,
            locked_at TIMESTAMPTZ,
            verified_at TIMESTAMPTZ,
            locked_by TEXT,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT v4_data_freezes_scope_type_check CHECK (scope_type IN ('country', 'competition', 'season', 'match', 'batch')),
            CONSTRAINT v4_data_freezes_verification_status_check CHECK (verification_status IN ('imported', 'verified', 'frozen', 'rejected')),
            UNIQUE (scope_key)
        )
    `);

    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_data_freezes_country_id ON v4.data_freezes(country_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_data_freezes_scope_type ON v4.data_freezes(scope_type)');
}

async function getCountryScope(entry) {
    const country = await db.get('SELECT country_id::text AS country_id, name FROM v4.countries WHERE name = ?', [entry.country]);
    const batch = await db.get('SELECT batch_id::text AS batch_id FROM v4.import_batches WHERE batch_label = ?', [`v4-${entry.country}`]);
    return { country, batch };
}

async function resetSchema() {
    for (const tableName of TABLES_IN_RESET_ORDER) {
        const exists = await db.get('SELECT to_regclass(?) AS reg', [tableName]);
        if (exists?.reg) {
            await db.run(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
            logger.info({ tableName }, 'V4 table truncated');
        }
    }
}

async function enrichCountries() {
    const countries = await db.all('SELECT country_id, name, iso2, iso3 FROM v4.countries');

    for (const country of countries) {
        const metadata = getCountryMetadata(country);
        await db.run(
            `
                UPDATE v4.countries
                SET display_name = ?,
                    slug = ?,
                    flag_url = ?,
                    entity_type = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE name = ?
            `,
            [metadata.display_name, metadata.slug, metadata.flag_url, metadata.entity_type, country.name]
        );
    }
}

async function purgeCountryData(entry) {
    const { country, batch } = await getCountryScope(entry);

    if (!country && !batch) {
        logger.info({ country: entry.country }, 'No existing country data found to purge');
        return;
    }

    const countryId = country?.country_id || null;
    const batchId = batch?.batch_id || null;

    logger.info({ country: entry.country, countryId, batchId }, 'Purging existing country data before reimport');

    await db.run('DELETE FROM v4.data_freezes WHERE scope_key = ?', [`country:${entry.country}`]);

    if (batchId) {
        await db.run('DELETE FROM v4.match_lineups WHERE match_id IN (SELECT match_id FROM v4.matches WHERE source_provider = ? AND competition_id IN (SELECT competition_id FROM v4.competitions WHERE country_id = ?))', ['transfermarkt', countryId]);
        await db.run('DELETE FROM v4.match_events WHERE match_id IN (SELECT match_id FROM v4.matches WHERE source_provider = ? AND competition_id IN (SELECT competition_id FROM v4.competitions WHERE country_id = ?))', ['transfermarkt', countryId]);
        await db.run('DELETE FROM v4.matches WHERE source_provider = ? AND competition_id IN (SELECT competition_id FROM v4.competitions WHERE country_id = ?)', ['transfermarkt', countryId]);
        await db.run('DELETE FROM v4.import_batches WHERE batch_id = ?::bigint', [batchId]);
    } else if (countryId) {
        await db.run('DELETE FROM v4.match_lineups WHERE match_id IN (SELECT match_id FROM v4.matches WHERE competition_id IN (SELECT competition_id FROM v4.competitions WHERE country_id = ?))', [countryId]);
        await db.run('DELETE FROM v4.match_events WHERE match_id IN (SELECT match_id FROM v4.matches WHERE competition_id IN (SELECT competition_id FROM v4.competitions WHERE country_id = ?))', [countryId]);
        await db.run('DELETE FROM v4.matches WHERE competition_id IN (SELECT competition_id FROM v4.competitions WHERE country_id = ?)', [countryId]);
    }

    if (countryId) {
        await db.run('DELETE FROM v4.club_logos WHERE club_id IN (SELECT club_id FROM v4.clubs WHERE country_id = ?)', [countryId]);
        await db.run('DELETE FROM v4.competition_logos WHERE competition_id IN (SELECT competition_id FROM v4.competitions WHERE country_id = ?)', [countryId]);
        await db.run('DELETE FROM v4.venues WHERE country_id = ?', [countryId]);
        await db.run('DELETE FROM v4.clubs WHERE country_id = ?', [countryId]);
        await db.run('DELETE FROM v4.competitions WHERE country_id = ?', [countryId]);
        await db.run('DELETE FROM v4.countries WHERE country_id = ?', [countryId]);
    }
}

async function recreateStageSchema(stageSchema) {
    await db.run(`DROP SCHEMA IF EXISTS ${stageSchema} CASCADE`);
}

async function mergeStageSchema(stageSchema) {
    const merges = [
        `INSERT INTO v4.import_batches SELECT * FROM ${stageSchema}.import_batches ON CONFLICT (batch_id) DO NOTHING`,
        `INSERT INTO v4.countries (country_id, name, iso2, iso3)
         SELECT country_id, name, iso2, iso3 FROM ${stageSchema}.countries
         ON CONFLICT (country_id) DO NOTHING`,
        `INSERT INTO v4.competitions (competition_id, country_id, name, competition_type, source_key, current_logo_url)
         SELECT competition_id, country_id, name, competition_type, source_key, current_logo_url FROM ${stageSchema}.competitions
         ON CONFLICT (competition_id) DO NOTHING`,
        `INSERT INTO v4.clubs (club_id, country_id, name, short_name, current_logo_url)
         SELECT club_id, country_id, name, short_name, current_logo_url FROM ${stageSchema}.clubs
         ON CONFLICT (club_id) DO NOTHING`,
        `INSERT INTO v4.people (person_id, full_name, person_type)
         SELECT person_id, full_name, person_type FROM ${stageSchema}.people
         ON CONFLICT (person_id) DO NOTHING`,
        `INSERT INTO v4.venues (venue_id, name, country_id, capacity)
         SELECT venue_id, name, country_id, capacity FROM ${stageSchema}.venues
         ON CONFLICT (venue_id) DO NOTHING`,
        `INSERT INTO v4.matches (
             match_id, source_provider, source_match_id, competition_id, season_label, match_date,
             home_club_id, away_club_id, home_score, away_score, source_file, source_url, source_title,
             source_dataset, source_competition_key, date_label, round_label, matchday, venue_id,
             attendance, referee_person_id, home_formation, away_formation
         )
         SELECT
             match_id, source_provider, source_match_id, competition_id, season_label, match_date,
             home_club_id, away_club_id, home_score, away_score, source_file, source_url, source_title,
             source_dataset, source_competition_key, date_label, round_label, matchday, venue_id,
             attendance, referee_person_id, home_formation, away_formation
         FROM ${stageSchema}.matches
         ON CONFLICT (match_id) DO NOTHING`,
        `INSERT INTO v4.club_logos (
             club_logo_id, club_id, logo_url, start_season, end_season, start_year, end_year,
             first_match_source_id, last_match_source_id
         )
         SELECT
             club_logo_id, club_id, logo_url, start_season, end_season, start_year, end_year,
             first_match_source_id, last_match_source_id
         FROM ${stageSchema}.club_logos
         ON CONFLICT (club_logo_id) DO NOTHING`,
        `INSERT INTO v4.competition_logos (
             competition_logo_id, competition_id, logo_url, start_season, end_season, start_year, end_year,
             first_match_source_id, last_match_source_id
         )
         SELECT
             competition_logo_id, competition_id, logo_url, start_season, end_season, start_year, end_year,
             first_match_source_id, last_match_source_id
         FROM ${stageSchema}.competition_logos
         ON CONFLICT (competition_logo_id) DO NOTHING`,
        `INSERT INTO v4.match_events (
             match_event_id, match_id, event_order, minute_label, side, event_type, player_id,
             related_player_id, goal_type, assist_type, card_type, detail, score_at_event
         )
         SELECT
             match_event_id, match_id, event_order, minute_label, side, event_type, player_id,
             related_player_id, goal_type, assist_type, card_type, detail, score_at_event
         FROM ${stageSchema}.match_events
         ON CONFLICT (match_event_id) DO NOTHING`,
        `INSERT INTO v4.match_lineups (
             match_lineup_id, match_id, club_id, player_id, side, is_starter, jersey_number,
             role_code, position_code, position_top_pct, position_left_pct
         )
         SELECT
             match_lineup_id, match_id, club_id, player_id, side, is_starter, jersey_number,
             role_code, position_code, position_top_pct, position_left_pct
         FROM ${stageSchema}.match_lineups
         ON CONFLICT (match_lineup_id) DO NOTHING`
    ];

    for (const sql of merges) {
        await db.run(sql);
    }
}

function buildJournalFileBase() {
    return path.join(logsDir, `v4-import-${nowIso().replace(/[:.]/g, '-')}`);
}

function writeJournalFiles(fileBase, journalRows) {
    const jsonPath = `${fileBase}.json`;
    const csvPath = `${fileBase}.csv`;

    fs.writeFileSync(jsonPath, JSON.stringify(journalRows, null, 2));

    const csvHeader = [
        'country',
        'status',
        'freeze_status',
        'locked',
        'matches',
        'competitions',
        'clubs',
        'people',
        'events',
        'lineups',
        'started_at',
        'finished_at',
        'duration_ms',
        'file',
        'note'
    ];

    const csvLines = [
        csvHeader.join(','),
        ...journalRows.map((row) => [
            row.country,
            row.status,
            row.freeze_status,
            row.locked,
            row.matches,
            row.competitions,
            row.clubs,
            row.people,
            row.events,
            row.lineups,
            row.started_at,
            row.finished_at,
            row.duration_ms,
            row.file,
            row.note
        ].map(csvEscape).join(','))
    ];

    fs.writeFileSync(csvPath, `${csvLines.join('\n')}\n`);
    return { jsonPath, csvPath };
}

async function upsertFreezeEntry(entry, freezeImported) {
    const { country, batch } = await getCountryScope(entry);

    if (!country) {
        logger.warn({ country: entry.country }, 'Skipping freeze registration: country row not found');
        return;
    }

    const verificationStatus = freezeImported ? 'frozen' : 'imported';
    const isLocked = freezeImported;
    const note = `matches=${entry.matches}; competitions=${entry.competitions}; source=${entry.output_file}`;

    await db.run(
        `
            INSERT INTO v4.data_freezes (
                scope_type,
                scope_key,
                country_id,
                batch_id,
                verification_status,
                is_locked,
                locked_at,
                verified_at,
                locked_by,
                note,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (scope_key) DO UPDATE SET
                country_id = EXCLUDED.country_id,
                batch_id = EXCLUDED.batch_id,
                verification_status = EXCLUDED.verification_status,
                is_locked = EXCLUDED.is_locked,
                locked_at = EXCLUDED.locked_at,
                verified_at = EXCLUDED.verified_at,
                locked_by = EXCLUDED.locked_by,
                note = EXCLUDED.note,
                updated_at = CURRENT_TIMESTAMP
        `,
        [
            'country',
            `country:${entry.country}`,
            country.country_id,
            batch?.batch_id || null,
            verificationStatus,
            isLocked ? 1 : 0,
            isLocked ? new Date().toISOString() : null,
            freezeImported ? 'import_sql_v4' : null,
            note
        ]
    );
}

async function importCountryFile(entry, freezeImported) {
    const stageSchema = getStageSchemaName(entry);
    const existingFreeze = await db.get(
        'SELECT freeze_id, is_locked, verification_status FROM v4.data_freezes WHERE scope_key = ?',
        [`country:${entry.country}`]
    );

    if (existingFreeze && hasFlag('--force')) {
        await purgeCountryData(entry);
    }

    if (existingFreeze && !hasFlag('--force')) {
        logger.info(
            {
                country: entry.country,
                verificationStatus: existingFreeze.verification_status,
                isLocked: existingFreeze.is_locked
            },
            'Country skipped because it was already imported'
        );
        return {
            country: entry.country,
            status: 'skipped',
            freeze_status: existingFreeze.verification_status || 'imported',
            locked: Boolean(existingFreeze.is_locked),
            matches: entry.matches,
            competitions: entry.competitions,
            clubs: entry.clubs,
            people: entry.people,
            events: entry.events,
            lineups: entry.lineups,
            started_at: nowIso(),
            finished_at: nowIso(),
            duration_ms: 0,
            file: path.basename(entry.sqlFile),
            note: 'Already imported'
        };
    }

    const startedAt = Date.now();

    logger.info(
        {
            country: entry.country,
            matches: entry.matches,
            competitions: entry.competitions,
            file: path.basename(entry.sqlFile),
            stageSchema
        },
        'Importing SQL-V4 country file'
    );

    await recreateStageSchema(stageSchema);
    await executePsqlFile(entry.sqlFile, stageSchema);
    await mergeStageSchema(stageSchema);
    await recreateStageSchema(stageSchema);
    await enrichCountries();
    await upsertFreezeEntry(entry, freezeImported);

    return {
        country: entry.country,
        status: 'imported',
        freeze_status: freezeImported ? 'frozen' : 'imported',
        locked: freezeImported,
        matches: entry.matches,
        competitions: entry.competitions,
        clubs: entry.clubs,
        people: entry.people,
        events: entry.events,
        lineups: entry.lineups,
        started_at: new Date(startedAt).toISOString(),
        finished_at: nowIso(),
        duration_ms: Date.now() - startedAt,
        file: path.basename(entry.sqlFile),
        note: ''
    };
}

async function main() {
    if (!fs.existsSync(sqlDir)) {
        throw new Error(`SQL-V4 directory not found: ${sqlDir}`);
    }

    const summary = loadSummary();
    const entries = resolveSqlFiles(summary);
    const freezeImported = hasFlag('--freeze');
    const journalRows = [];
    const journalBase = buildJournalFileBase();

    await db.init();
    await ensureMetadataTables();
    ensureLogsDir();

    if (hasFlag('--reset')) {
        logger.info('Resetting v4 schema before import');
        await resetSchema();
    }

    logger.info(
        {
            files: entries.length,
            countries: entries.map((entry) => entry.country),
            freezeImported
        },
        'Starting SQL-V4 import'
    );

    for (const [index, entry] of entries.entries()) {
        logger.info({ progress: `${index + 1}/${entries.length}`, country: entry.country }, 'SQL-V4 import progress');
        try {
            const result = await importCountryFile(entry, freezeImported);
            journalRows.push(result);
        } catch (error) {
            journalRows.push({
                country: entry.country,
                status: 'failed',
                freeze_status: 'error',
                locked: false,
                matches: entry.matches,
                competitions: entry.competitions,
                clubs: entry.clubs,
                people: entry.people,
                events: entry.events,
                lineups: entry.lineups,
                started_at: nowIso(),
                finished_at: nowIso(),
                duration_ms: 0,
                file: path.basename(entry.sqlFile),
                note: error.message
            });
            const journalPaths = writeJournalFiles(journalBase, journalRows);
            logger.error({ err: error, country: entry.country, ...journalPaths }, 'SQL-V4 import failed on country');
            throw error;
        }
    }

    const journalPaths = writeJournalFiles(journalBase, journalRows);
    logger.info({ importedCountries: entries.length, ...journalPaths }, 'SQL-V4 import completed');
    process.exit(0);
}

main().catch(async (error) => {
    logger.error({ err: error }, 'SQL-V4 import failed');
    process.exit(1);
});
