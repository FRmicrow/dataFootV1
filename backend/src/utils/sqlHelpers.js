/**
 * SQL parameter sanitization utility.
 * Converts undefined and null values to null, and ensures objects/arrays are JSON-stringified for PostgreSQL compatibility.
 * 
 * @param {Array} params - Array of query parameters
 * @returns {Array} Sanitized parameters
 */
export const cleanParams = (params) => params.map(p => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'object') {
        try {
            return JSON.stringify(p);
        } catch (e) {
            return String(p);
        }
    }
    return p;
});
