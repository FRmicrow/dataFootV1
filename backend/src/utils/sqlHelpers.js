/**
 * SQL parameter sanitization utility.
 * Converts undefined and null values to null for safe use in parameterized queries.
 * 
 * @param {Array} params - Array of query parameters
 * @returns {Array} Sanitized parameters with undefined/null normalized to null
 * 
 * @example
 * db.all("SELECT * FROM players WHERE name = ? AND age = ?", cleanParams([name, age]));
 */
export const cleanParams = (params) => {
    if (!Array.isArray(params)) {
        console.warn('cleanParams expected an array, got:', typeof params);
        return params;
    }
    return params.map(p => {
        if (p === undefined || p === null) return null;
        if (typeof p === 'object') {
            try {
                return JSON.stringify(p);
            } catch (e) {
                console.error('cleanParams failed to stringify object:', p);
                return null;
            }
        }
        return p;
    });
};
