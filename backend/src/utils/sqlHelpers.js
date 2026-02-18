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
export const cleanParams = (params) => params.map(p => (p === undefined || p === null) ? null : p);
