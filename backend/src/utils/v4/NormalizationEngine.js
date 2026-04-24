/**
 * NormalizationEngine
 * Provides utilities for string cleaning, accent removal, and fuzzy matching preparation.
 */

export class NormalizationEngine {
    /**
     * Removes accents and special characters from a string.
     * Example: "Mbappé" -> "mbappe"
     */
    static normalize(str) {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // immutable_unaccent equivalent
            .replace(/[^a-zA-Z0-9]/g, '') // [^a-zA-Z0-9] regex
            .toLowerCase();
    }

    /**
     * Compares two names after normalization.
     */
    static areNamesSimilar(name1, name2) {
        return this.normalize(name1) === this.normalize(name2);
    }
}

export default NormalizationEngine;
