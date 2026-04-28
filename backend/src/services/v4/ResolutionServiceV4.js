
import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import { ResolutionContextSchema, EntityType } from '../../schemas/v4/resolutionSchema.js';

class ResolutionServiceV4 {
    /**
     * Resolve a team ID from a source ID.
     */
    async resolveTeam(source, sourceId, context = {}) {
        const validated = ResolutionContextSchema.parse({ source, sourceId, ...context });
        
        // 1. Exact Mapping
        const mapping = await db.get(
            `SELECT team_id FROM v4.mapping_teams WHERE source = ? AND source_id = ?`,
            [validated.source, validated.sourceId]
        );
        if (mapping) return mapping.team_id;

        // 2. Heuristic: Match by name and country if provided
        if (validated.name) {
            const match = await db.get(
                `SELECT team_id FROM v4.teams WHERE name = ? ${validated.countryId ? 'AND country_id = ?' : ''} LIMIT 1`,
                validated.countryId ? [validated.name, validated.countryId] : [validated.name]
            );
            if (match) {
                await this._createMapping(EntityType.TEAM, validated.source, validated.sourceId, match.team_id, validated.name);
                return match.team_id;
            }
        }

        // 3. Not found: Create new Team (Optional: depending on policy, here we create it)
        const teamId = await this._createTeam(validated);
        await this._createMapping(EntityType.TEAM, validated.source, validated.sourceId, teamId, validated.name);
        return teamId;
    }

    /**
     * Resolve a person ID from a source ID.
     */
    async resolvePerson(source, sourceId, context = {}) {
        const validated = ResolutionContextSchema.parse({ source, sourceId, ...context });

        // 1. Exact Mapping
        const mapping = await db.get(
            `SELECT person_id FROM v4.mapping_people WHERE source = ? AND source_id = ?`,
            [validated.source, validated.sourceId]
        );
        if (mapping) return mapping.person_id;

        // 2. Heuristic: Name + Nationality + BirthDate
        if (validated.name && (validated.nationality || validated.birthDate)) {
            let sql = `SELECT person_id FROM v4.people WHERE full_name = ?`;
            const params = [validated.name];
            
            if (validated.birthDate) {
                sql += ` AND birth_date = ?`;
                params.push(validated.birthDate);
            }
            if (validated.nationality) {
                sql += ` AND (nationality_1 = ? OR nationality_2 = ?)`;
                params.push(validated.nationality, validated.nationality);
            }
            
            const match = await db.get(sql, params);
            if (match) {
                await this._createMapping(EntityType.PERSON, validated.source, validated.sourceId, match.person_id, validated.name);
                return match.person_id;
            }
        }

        // 3. Create new Person
        const personId = await this._createPerson(validated);
        await this._createMapping(EntityType.PERSON, validated.source, validated.sourceId, personId, validated.name);
        return personId;
    }

    /**
     * Resolve a competition ID.
     */
    async resolveCompetition(source, sourceId, context = {}) {
        const validated = ResolutionContextSchema.parse({ source, sourceId, ...context });
        
        const mapping = await db.get(
            `SELECT competition_id FROM v4.mapping_competitions WHERE source = ? AND source_id = ?`,
            [validated.source, validated.sourceId]
        );
        if (mapping) return mapping.competition_id;

        if (validated.name) {
            const match = await db.get(
                `SELECT competition_id FROM v4.competitions WHERE name = ? LIMIT 1`,
                [validated.name]
            );
            if (match) {
                await this._createMapping(EntityType.COMPETITION, validated.source, validated.sourceId, match.competition_id, validated.name);
                return match.competition_id;
            }
        }

        // Policy: We might not want to auto-create competitions as they are core entities
        throw new Error(`Unresolved competition: ${validated.name} (${validated.source}:${validated.sourceId})`);
    }

    /**
     * Resolve a venue ID.
     */
    async resolveVenue(source, sourceId, context = {}) {
        const validated = ResolutionContextSchema.parse({ source, sourceId, ...context });
        
        const mapping = await db.get(
            `SELECT venue_id FROM v4.mapping_venues WHERE source = ? AND source_id = ?`,
            [validated.source, validated.sourceId]
        );
        if (mapping) return mapping.venue_id;

        if (validated.name) {
            const match = await db.get(
                `SELECT venue_id FROM v4.venues WHERE name = ? LIMIT 1`,
                [validated.name]
            );
            if (match) {
                await this._createMapping(EntityType.VENUE, validated.source, validated.sourceId, match.venue_id, validated.name);
                return match.venue_id;
            }
        }

        // Create new Venue
        const venueId = await this._createVenue(validated);
        await this._createMapping(EntityType.VENUE, validated.source, validated.sourceId, venueId, validated.name);
        return venueId;
    }

    // --- Private Helpers ---

    async _createMapping(type, source, sourceId, internalId, sourceName) {
        const plural = type === 'person' ? 'people' : `${type}s`;
        const tableName = `v4.mapping_${plural}`;
        const idCol = `${type}_id`;
        await db.run(
            `INSERT INTO ${tableName} (source, source_id, ${idCol}, source_name) 
             VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING`,
            [source, sourceId, internalId, sourceName]
        );
        logger.info({ type, source, sourceId, internalId }, `Mapped ${type} to canonical ID`);
    }

    async _createTeam(ctx) {
        const result = await db.run(
            `INSERT INTO v4.teams (name, country_id, is_active) VALUES (?, ?, true) RETURNING team_id`,
            [ctx.name || 'Unknown Team', ctx.countryId || null]
        );
        return result.lastInsertRowid;
    }

    async _createPerson(ctx) {
        const result = await db.run(
            `INSERT INTO v4.people (full_name, person_type, nationality_1, birth_date) VALUES (?, ?, ?, ?) RETURNING person_id`,
            [ctx.name || 'Unknown Person', 'player', ctx.nationality || null, ctx.birthDate || null]
        );
        return result.lastInsertRowid;
    }

    async _createVenue(ctx) {
        const result = await db.run(
            `INSERT INTO v4.venues (name, country_id) VALUES (?, ?) RETURNING venue_id`,
            [ctx.name || 'Unknown Venue', ctx.countryId || null]
        );
        return result.lastInsertRowid;
    }
}

export default new ResolutionServiceV4();
