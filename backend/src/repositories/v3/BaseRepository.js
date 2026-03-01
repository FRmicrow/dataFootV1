/**
 * BaseRepository
 * Provides common data access patterns for SQLite.
 */
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }

    /**
     * Find one record by criteria
     */
    findOne(criteria = {}) {
        const keys = Object.keys(criteria);
        const whereClause = keys.length ? `WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
        const params = Object.values(criteria);

        return this.db.get(`SELECT * FROM ${this.tableName} ${whereClause} LIMIT 1`, params);
    }

    /**
     * Find many records by criteria
     */
    findMany(criteria = {}, options = {}) {
        const keys = Object.keys(criteria);
        const whereClause = keys.length ? `WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
        const params = Object.values(criteria);

        const orderBy = options.orderBy ? `ORDER BY ${options.orderBy}` : '';
        const limit = options.limit ? `LIMIT ${options.limit}` : '';
        const offset = options.offset ? `OFFSET ${options.offset}` : '';

        return this.db.all(`SELECT * FROM ${this.tableName} ${whereClause} ${orderBy} ${limit} ${offset}`, params);
    }

    /**
     * Insert a record
     */
    insert(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');

        const info = this.db.run(
            `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
            values
        );
        return info;
    }

    /**
     * Update a record
     */
    update(criteria, data) {
        const setKeys = Object.keys(data);
        const setClause = setKeys.map(k => `${k} = ?`).join(', ');
        const setValues = Object.values(data);

        const whereKeys = Object.keys(criteria);
        const whereClause = whereKeys.map(k => `${k} = ?`).join(' AND ');
        const whereValues = Object.values(criteria);

        return this.db.run(
            `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`,
            [...setValues, ...whereValues]
        );
    }

    /**
     * Delete a record
     */
    delete(criteria) {
        const keys = Object.keys(criteria);
        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        const params = Object.values(criteria);

        return this.db.run(`DELETE FROM ${this.tableName} WHERE ${whereClause}`, params);
    }

    /**
     * Count records
     */
    count(criteria = {}) {
        const keys = Object.keys(criteria);
        const whereClause = keys.length ? `WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
        const params = Object.values(criteria);

        const result = this.db.get(`SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`, params);
        return result ? result.count : 0;
    }
}

export default BaseRepository;
