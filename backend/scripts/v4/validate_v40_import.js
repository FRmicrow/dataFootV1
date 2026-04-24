import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

async function validate() {
    try {
        await db.init();
        logger.info({}, '🏁 Starting V40 Validation...');

        // 1. Check Competition Relations
        const relations = await db.all(`
            SELECT sr.name as source, tr.name as target, rel.relation_type 
            FROM v4.competition_relations rel
            JOIN v4.competitions sr ON rel.source_id = sr.competition_id
            JOIN v4.competitions tr ON rel.target_id = tr.competition_id
        `);
        
        logger.info({ count: relations.length }, '📊 Competition Relations found:');
        console.table(relations);

        // 2. Check for Duplicate People (by normalized name)
        const dupPeople = await db.all(`
            SELECT lower(regexp_replace(immutable_unaccent(full_name), '[^a-zA-Z0-9]'::text, ''::text, 'g'::text)) as norm_name, 
                   COUNT(*), 
                   ARRAY_AGG(person_id) as ids
            FROM v4.people
            GROUP BY 1
            HAVING COUNT(*) > 1
            LIMIT 10
        `);
        
        if (dupPeople.length > 0) {
            logger.warn({ count: dupPeople.length }, '⚠️ Duplicate people detected (should be 0 if index is active)');
            console.table(dupPeople);
        } else {
            logger.info({}, '✅ No duplicate people by normalized name.');
        }

        // 3. Check for specific historical links requested by user
        const historicalChecks = [
            { ancestor: 'Coupe des clubs champions européens', successor: 'UEFA Champions League' },
            { ancestor: 'Coupe de l\'UEFA', successor: 'UEFA Europa League' }
        ];

        for (const check of historicalChecks) {
            const linked = await db.get(`
                SELECT 1 FROM v4.competition_relations rel
                JOIN v4.competitions sr ON rel.source_id = sr.competition_id
                JOIN v4.competitions tr ON rel.target_id = tr.competition_id
                WHERE sr.name = $1 AND tr.name = $2 AND rel.relation_type = 'ANCESTOR'
            `, [check.ancestor, check.successor]);
            
            if (linked) {
                logger.info({}, `✅ Historical link established: ${check.ancestor} -> ${check.successor}`);
            } else {
                logger.warn({}, `❌ Missing historical link: ${check.ancestor} -> ${check.successor}`);
            }
        }

        // 4. Check for Qualifiers links
        const qualifLinks = await db.all(`
            SELECT sr.name as qualif, tr.name as main
            FROM v4.competition_relations rel
            JOIN v4.competitions sr ON rel.source_id = sr.competition_id
            JOIN v4.competitions tr ON rel.target_id = tr.competition_id
            WHERE rel.relation_type = 'QUALIFICATION'
            LIMIT 5
        `);
        logger.info({ count: qualifLinks.length }, '✅ Qualification links sample:');
        console.table(qualifLinks);

    } catch (err) {
        logger.error({ err }, 'Validation failed');
    } finally {
        process.exit(0);
    }
}

validate();
