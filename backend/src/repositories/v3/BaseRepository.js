import { cleanParams } from '../../utils/sqlHelpers.js';
/**
 * BaseRepository
 * Provides common data access patterns for PostgreSQL (via pg wrapper).
 */
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }

    /**
     * Find one record by criteria
     */
    async findOne(criteria = {}) {
        const keys = Object.keys(criteria);
        const whereClause = keys.length ? `WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
        const params = Object.values(criteria);

        return await this.db.get(`SELECT * FROM ${this.tableName} ${whereClause} LIMIT 1`, cleanParams(params));
    }

    /**
     * Find many records by criteria
     */
    async findMany(criteria = {}, options = {}) {
        const keys = Object.keys(criteria);
        const whereClause = keys.length ? `WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
        const params = Object.values(criteria);

        const orderBy = options.orderBy ? `ORDER BY ${options.orderBy}` : '';
        const limit = options.limit ? `LIMIT ${options.limit}` : '';
        const offset = options.offset ? `OFFSET ${options.offset}` : '';

        return await this.db.all(`SELECT * FROM ${this.tableName} ${whereClause} ${orderBy} ${limit} ${offset}`, cleanParams(params));
    }

    /**
     * Insert a record
     */
    async insert(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');

        const info = await this.db.run(
            `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
            cleanParams(values)
        );
        return info;
    }

    /**
     * Update a record
     */
    async update(criteria, data) {
        const setKeys = Object.keys(data);
        const setClause = setKeys.map(k => `${k} = ?`).join(', ');
        const setValues = Object.values(data);

        const whereKeys = Object.keys(criteria);
        const whereClause = whereKeys.map(k => `${k} = ?`).join(' AND ');
        const whereValues = Object.values(criteria);

        return await this.db.run(
            `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`,
            cleanParams([...setValues, ...whereValues])
        );
    }

    /**
     * Delete a record
     */
    async delete(criteria) {
        const keys = Object.keys(criteria);
        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        const params = Object.values(criteria);

        return await this.db.run(`DELETE FROM ${this.tableName} WHERE ${whereClause}`, cleanParams(params));
    }

    /**
     * Count records
     */
    async count(criteria = {}) {
        const keys = Object.keys(criteria);
        const whereClause = keys.length ? `WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
        const params = Object.values(criteria);

        const result = await this.db.get(`SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`, cleanParams(params));
        return result ? parseInt(result.count, 10) : 0;
    }
}

export default BaseRepository;
