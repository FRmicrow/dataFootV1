import NodeCache from 'node-cache';

class CacheService {
    constructor() {
        // Default TTL: 1 hour (3600 seconds), Check period: 10 minutes
        this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    }

    /**
     * Get data from cache
     * @param {string} key 
     */
    get(key) {
        return this.cache.get(key);
    }

    /**
     * Set data in cache
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttl optional TTL in seconds
     */
    set(key, value, ttl = 3600) {
        return this.cache.set(key, value, ttl);
    }

    /**
     * Delete from cache
     * @param {string} key 
     */
    del(key) {
        return this.cache.del(key);
    }

    /**
     * Flush entire cache
     */
    flush() {
        return this.cache.flushAll();
    }
}

// Singleton instance
export default new CacheService();
