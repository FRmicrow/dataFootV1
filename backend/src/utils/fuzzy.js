/**
 * Computes the Levenshtein distance between two strings.
 */
export function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[len1][len2];
}

/**
 * Calculates a similarity score between 0 and 1.
 */
export function calculateSimilarity(s1, s2) {
    s1 = (s1 || '').toLowerCase();
    s2 = (s2 || '').toLowerCase();
    if (s1 === s2) return 1.0;
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0;
    return 1.0 - levenshteinDistance(s1, s2) / maxLength;
}
