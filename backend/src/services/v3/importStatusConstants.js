/**
 * US_260: Import Status Constants
 * Central definition for the 5-state import status model
 * and valid data pillars.
 */

export const IMPORT_STATUS = {
    NONE: 0,       // Grey   — Never attempted
    PARTIAL: 1,    // Orange — Some data exists, import incomplete
    COMPLETE: 2,   // Green  — Fully imported
    NO_DATA: 3,    // Black  — API confirmed no data available
    LOCKED: 4      // Green+Lock — Season done, no future calls allowed
};

export const STATUS_LABELS = {
    [IMPORT_STATUS.NONE]: 'NONE',
    [IMPORT_STATUS.PARTIAL]: 'PARTIAL',
    [IMPORT_STATUS.COMPLETE]: 'COMPLETE',
    [IMPORT_STATUS.NO_DATA]: 'NO_DATA',
    [IMPORT_STATUS.LOCKED]: 'LOCKED'
};

export const PILLARS = ['core', 'events', 'lineups', 'trophies', 'fs', 'ps'];

/** FS/PS consecutive failure threshold (1 full matchday) */
export const CONSECUTIVE_FAILURE_THRESHOLD = 10;

/** Historical range: stop after N consecutive NO_DATA seasons */
export const HISTORICAL_NO_DATA_STREAK_LIMIT = 2;

/** Cross-pillar reduced threshold: PS threshold when FS is already NO_DATA */
export const CROSS_PILLAR_REDUCED_THRESHOLD = 3;
