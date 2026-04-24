import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import NormalizationEngine from '../../utils/v4/NormalizationEngine.js';

/**
 * DataImportServiceV4
 * Specialized service for importing V4 SQL dumps with deduplication and historical linking.
 */
export class DataImportServiceV4 {
    constructor() {
        this.batchSize = 1000;
        this.stats = {
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: 0
        };

        // ID Mappings for deduplication
        this.peopleMap = new Map(); // source_tm_id -> person_id
        this.peopleNameMap = new Map(); // normalized_name -> person_id
        this.clubsMap = new Map();  // source_tm_id -> club_id
        this.competitionsMap = new Map(); // source_key -> competition_id

        // Pending relations to be resolved after IDs are stable
        this.pendingRelations = [];

        // Historical mapping for US-402
        this.historicalSuccessors = [
            { ancestor: "Coupe des clubs champions européens", successor: "UEFA Champions League" },
            { ancestor: "Coupe de l'UEFA (- 2009)", successor: "UEFA Europa League" },
            { ancestor: "Coupe des coupes (-1999)", successor: "UEFA Europa League" },
            { ancestor: "Coupe Intertoto (-2009)", successor: "UEFA Conference League" }
        ];
    }

    /**
     * Reset stats for a new file
     */
    resetStats() {
        this.stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
        this.pendingRelations = [];
    }

    /**
     * Pre-load existing mappings from DB
     */
    async preloadMappings() {
        logger.info({}, '🔍 Pre-loading existing ID mappings...');
        const people = await db.all(`
            SELECT person_id, source_tm_id,
            lower(regexp_replace(immutable_unaccent(full_name), '[^a-zA-Z0-9]'::text, ''::text, 'g'::text)) as norm_name
            FROM v4.people
        `);
        people.forEach(p => {
            if (p.source_tm_id) this.peopleMap.set(p.source_tm_id, p.person_id);
            if (p.norm_name) this.peopleNameMap.set(p.norm_name, p.person_id);
        });
        
        const clubs = await db.all('SELECT club_id, name, source_tm_id FROM v4.clubs');
        clubs.forEach(c => {
            if (c.source_tm_id) this.clubsMap.set(c.source_tm_id, c.club_id);
        });

        const competitions = await db.all('SELECT competition_id, source_key FROM v4.competitions');
        competitions.forEach(c => this.competitionsMap.set(c.source_key, c.competition_id));
        
        logger.info({ 
            people: this.peopleMap.size, 
            clubs: this.clubsMap.size,
            competitions: this.competitionsMap.size
        }, '✅ Mappings loaded');
    }

    /**
     * Main entry point for importing a .sql.gz file
     */
    async importSqlGz(filePath) {
        logger.info({ filePath }, `📂 Starting import of ${filePath}`);
        this.resetStats();
        await this.preloadMappings();
        
        const fileStream = fs.createReadStream(filePath);
        const gunzip = zlib.createGunzip();
        const rl = readline.createInterface({
            input: fileStream.pipe(gunzip),
            crlfDelay: Infinity
        });

        let currentTable = null;
        let columns = [];
        let buffer = [];
        let lineCount = 0;

        for await (const line of rl) {
            lineCount++;
            if (lineCount % 10000 === 0) {
                logger.info({ lineCount }, `Processing line ${lineCount}...`);
            }
            if (line.startsWith('COPY ')) {
                const match = line.match(/COPY v4\.(\w+) \((.*?)\) FROM stdin;/);
                if (match) {
                    currentTable = match[1];
                    columns = match[2].split(', ').map(c => c.trim());
                }
                continue;
            }

            if (line === '\\.') {
                if (buffer.length > 0) {
                    await this.flushBuffer(currentTable, columns, buffer);
                    buffer = [];
                }
                currentTable = null;
                continue;
            }

            if (currentTable) {
                const values = line.split('\t').map(v => v === '\\N' ? null : v);
                const row = {};
                columns.forEach((col, i) => {
                    row[col] = values[i];
                });
                buffer.push(row);

                if (buffer.length >= this.batchSize) {
                    await this.flushBuffer(currentTable, columns, buffer);
                    buffer = [];
                }
            }
        }

        await this.finalizeRelations();
        logger.info(this.stats, `✅ Finished import of ${filePath}`);
        return this.stats;
    }

    /**
     * Flush buffer to DB using UPSERT logic
     */
    async flushBuffer(table, columns, buffer) {
        if (table === 'competitions') {
            await this.processCompetitions(buffer);
        } else if (table === 'clubs') {
            await this.upsertGeneric(table, columns, buffer, ['club_id']);
        } else if (table === 'people') {
            await this.upsertGeneric(table, columns, buffer, ['person_id']);
        } else {
            // Default generic upsert by ID
            let pk = `${table.slice(0, -1)}_id`;
            if (table === 'countries') pk = 'country_id';
            if (table === 'import_batches') pk = 'batch_id';
            if (table === 'venues') pk = 'venue_id';
            if (table === 'matches') pk = 'match_id';
            
            await this.upsertGeneric(table, columns, buffer, [pk]);
        }
    }

    /**
     * Generic Upsert Helper
     */
    async upsertGeneric(table, columns, buffer, pks) {
        // US-401/402: Buffer deduplication (handle duplicates within the same batch)
        const uniqueBuffer = [];
        const seenInBatch = new Set();
        
        for (const row of buffer) {
            let key = null;
            if (table === 'people') {
                key = row.source_tm_id ? `tm:${row.source_tm_id}` : `name:${NormalizationEngine.normalize(row.full_name)}`;
            } else if (table === 'clubs') {
                key = row.source_tm_id ? `tm:${row.source_tm_id}` : `name:${NormalizationEngine.normalize(row.name)}`;
            } else {
                key = pks.map(pk => row[pk]).join('|');
            }

            if (!seenInBatch.has(key)) {
                uniqueBuffer.push(row);
                seenInBatch.add(key);
            }
        }

        const client = await db.getTransactionClient();
        try {
            await client.beginTransaction();
            // Disable FK checks for this session to handle cross-file references in bulk
            await client.exec("SET LOCAL session_replication_role = 'replica'");
            
            for (const row of uniqueBuffer) {
                const colNames = Object.keys(row);
                const colValues = Object.values(row);
                const placeholders = colValues.map((_, i) => `$${i + 1}`).join(', ');
                const updateClause = colNames
                    .filter(c => !pks.includes(c))
                    .map(c => `${c} = COALESCE(EXCLUDED.${c}, v4.${table}.${c})`)
                    .join(', ');

                let sql;
                if (table === 'people') {
                    const conflictTarget = "ON CONFLICT (lower(regexp_replace(immutable_unaccent(full_name), '[^a-zA-Z0-9]'::text, ''::text, 'g'::text)))";
                    sql = `
                        INSERT INTO v4.people (${colNames.join(', ')})
                        VALUES (${placeholders})
                        ${conflictTarget} 
                        DO UPDATE SET ${updateClause}
                    `;
                } else if (table === 'clubs') {
                    const tmIdIdx = colNames.indexOf('source_tm_id');
                    const nameIdx = colNames.indexOf('name');
                    const clubIdIdx = colNames.indexOf('club_id');
                    
                    sql = `
                        WITH target_id AS (
                            SELECT club_id FROM v4.clubs 
                            WHERE (source_tm_id IS NOT NULL AND source_tm_id = $${tmIdIdx + 1})
                               OR (lower(name) = lower($${nameIdx + 1}))
                            LIMIT 1
                        )
                        INSERT INTO v4.clubs (${colNames.join(', ')})
                        SELECT COALESCE((SELECT club_id FROM target_id), $${clubIdIdx + 1}), ${placeholders.split(', ').slice(1).join(', ')}
                        ON CONFLICT (club_id) 
                        DO UPDATE SET ${updateClause}
                    `;
                } else {
                    const conflictTarget = pks.join(', ');
                    sql = `
                        INSERT INTO v4.${table} (${colNames.join(', ')})
                        VALUES (${placeholders})
                        ON CONFLICT (${conflictTarget}) 
                        DO UPDATE SET ${updateClause}
                    `;
                }

                await client.run(sql, colValues);
            }

            await client.commit();
            this.stats.inserted += buffer.length;
        } catch (err) {
            await client.rollback();
            logger.error({ err, table }, `Error flushing buffer for ${table}`);
            this.stats.errors += buffer.length;
        } finally {
            client.release();
        }
    }

    /**
     * Specific logic for competitions (Linking)
     */
    async processCompetitions(buffer) {
        for (const row of buffer) {
            // US-402: Link Qualifs to Main
            if (row.name && (row.name.toLowerCase().includes('qualification') || row.name.toLowerCase().includes('éliminatoires'))) {
                const mainName = row.name
                    .replace(/qualification/i, '')
                    .replace(/éliminatoires/i, '')
                    .replace(/qualification/i, '')
                    .trim();
                this.pendingRelations.push({ source: row.name, target: mainName, type: 'QUALIFICATION' });
            }
            
            // US-402: Nations League Umbrella
            if (row.name && row.name.toLowerCase().includes('nations league')) {
                this.pendingRelations.push({ source: row.name, target: 'UEFA Nations League', type: 'SUB_COMPETITION' });
            }
            
            // Historical Successors
            for (const h of this.historicalSuccessors) {
                if (row.name === h.ancestor) {
                    this.pendingRelations.push({ source: h.ancestor, target: h.successor, type: 'ANCESTOR' });
                }
            }
        }
        
        await this.upsertGeneric('competitions', Object.keys(buffer[0]), buffer, ['competition_id']);
    }

    /**
     * Resolve pending relations
     */
    async finalizeRelations() {
        if (this.pendingRelations.length === 0) return;
        
        logger.info({ count: this.pendingRelations.length }, '🔗 Resolving competition relations...');
        
        for (const rel of this.pendingRelations) {
            try {
                // Find IDs for source and target
                const source = await db.get('SELECT competition_id FROM v4.competitions WHERE name = $1', [rel.source]);
                let target = await db.get('SELECT competition_id FROM v4.competitions WHERE name = $1', [rel.target]);

                // Create Umbrella if missing for Nations League
                if (!target && rel.target === 'UEFA Nations League') {
                    const umbrellaId = Date.now(); // Simple unique ID for umbrella
                    await db.run(
                        'INSERT INTO v4.competitions (competition_id, country_id, name, competition_type, source_key) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
                        [umbrellaId, 4073567339792430437, 'UEFA Nations League', 'international', 'uefa-nations-league-umbrella']
                    );
                    target = { competition_id: umbrellaId };
                }

                if (source && target) {
                    await db.run(
                        `INSERT INTO v4.competition_relations (source_id, target_id, relation_type) 
                         VALUES ($1, $2, $3) 
                         ON CONFLICT DO NOTHING`,
                        [source.competition_id, target.competition_id, rel.type]
                    );
                }
            } catch (err) {
                logger.warn({ err, rel }, 'Failed to resolve relation');
            }
        }
    }
}

export default new DataImportServiceV4();
