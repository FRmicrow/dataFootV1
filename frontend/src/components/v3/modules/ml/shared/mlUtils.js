/**
 * Shared utilities for Machine Learning Hub modules.
 */

export const STATUS_COPY = {
    NONE: 'Aucun run',
    READY: 'Prêt',
    COMPLETED: 'Terminé',
    RUNNING: 'En cours',
    PENDING: 'En attente',
    PARTIAL: 'Partiel',
    FAILED: 'Échec',
    BLOCKED: 'Bloqué',
};

/**
 * Formats a value as a percentage.
 * @param {number|string} value - The value to format.
 * @param {number} multiplier - Multiplier to apply (default 100 for 0.5 -> 50%).
 * @returns {string} Formatted percentage string.
 */
export const fmtPct = (value, multiplier = 100) => {
    const num = Number(value);
    return Number.isFinite(num) ? `${(num * multiplier).toFixed(1)}%` : '—';
};

/**
 * Formats a value as a decimal with fixed precision.
 * @param {number|string} value - The value to format.
 * @param {number} digits - Number of decimal places.
 * @returns {string} Formatted decimal string.
 */
export const fmtDecimal = (value, digits = 3) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(digits) : '—';
};

export const fmtOdd = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : '—';
};

/**
 * Formats a date string to a human-readable format (FR locale).
 * @param {string|Date} value - The date to format.
 * @returns {string} Formatted date string.
 */
export const fmtDate = (value) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
};

/**
 * Formats a date string to a human-readable datetime format (FR locale).
 * @param {string|Date} value - The datetime to format.
 * @returns {string} Formatted datetime string.
 */
export const fmtDateTime = (value) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

/**
 * Returns the design-system variant for a simulation status.
 * @param {string} status - Simulation status.
 * @returns {string} Component variant (success, primary, warning, danger, neutral).
 */
export const getStatusVariant = (status) => {
    const variants = {
        READY: 'success',
        COMPLETED: 'success',
        RUNNING: 'primary',
        PENDING: 'primary',
        PARTIAL: 'warning',
        FAILED: 'danger',
        BLOCKED: 'danger',
    };
    return variants[status] || 'neutral';
};

/**
 * Returns the design-system variant for a prediction outcome quality.
 * @param {boolean|number} isCorrect - Whether the prediction was correct.
 * @returns {string} Component variant (success, danger, neutral).
 */
export const getOutcomeVariant = (isCorrect) => {
    if (isCorrect === 1 || isCorrect === true) return 'success';
    if (isCorrect === 0 || isCorrect === false) return 'danger';
    return 'neutral';
};

/**
 * Normalizes metrics object into an array of label/value pairs for display.
 */
export const normalizeMetrics = (metrics) => {
    if (!metrics || typeof metrics !== 'object') return [];

    const pairs = [
        ['accuracy', 'Accuracy'],
        ['hit_rate', 'Hit rate'],
        ['log_loss', 'Log loss'],
        ['brier_score', 'Brier'],
        ['roi', 'ROI'],
        ['profit', 'Profit'],
        ['matches_processed', 'Matchs traités'],
    ];

    return pairs
        .filter(([key]) => metrics[key] != null)
        .map(([key, label]) => ({
            key,
            label,
            value: key === 'accuracy' || key === 'hit_rate' || key === 'roi'
                ? fmtPct(metrics[key], 1) // Expecting 0-100 if stored that way or 0-1 multiplied by 100 elsewhere
                : fmtDecimal(metrics[key], key === 'profit' ? 1 : 3),
        }));
};
