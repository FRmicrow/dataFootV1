/**
 * US_270: Global Import Control Service
 * Manages abort/pause state across all long-running import tasks.
 */

import logger from '../../utils/logger.js';

let abortFlag = false;
let paused = false;
let pausePromiseResolve = null;

/**
 * Request to stop all ongoing imports
 */
export function requestAbort() {
    logger.warn('Import abort requested');
    abortFlag = true;
    resumeIfPaused();
}

/**
 * Request to pause all ongoing imports
 */
export function requestPause() {
    logger.info('Import pause requested');
    paused = true;
}

/**
 * Request to resume paused imports
 */
export function requestResume() {
    logger.info('Import resume requested');
    resumeIfPaused();
}

function resumeIfPaused() {
    paused = false;
    if (pausePromiseResolve) {
        pausePromiseResolve();
        pausePromiseResolve = null;
    }
}

/**
 * Reset state for a new import session
 */
export function resetImportState() {
    abortFlag = false;
    paused = false;
    pausePromiseResolve = null;
}

/**
 * Get current state
 */
export function getImportState() {
    return { aborted: abortFlag, paused };
}

/**
 * Helper to be called inside any long-running loop.
 * Throws an error if aborted, or waits if paused.
 */
export async function checkAbortOrPause(sendLog = null) {
    if (abortFlag) {
        handleAbort(sendLog);
    }

    if (paused) {
        await handlePause(sendLog);
    }
}

function handleAbort(sendLog) {
    const msg = '🛑 Import STOPPED by user request.';
    if (sendLog && typeof sendLog === 'function') sendLog(msg, 'warning');
    throw new Error('IMPORT_ABORTED');
}

async function handlePause(sendLog) {
    const msg = '⏸️ Import PAUSED — waiting for resume...';
    if (sendLog && typeof sendLog === 'function') sendLog(msg, 'warning');

    await new Promise(resolve => {
        pausePromiseResolve = resolve;
    });

    if (abortFlag) {
        handleAbort(sendLog);
    }

    const msgResume = '▶️ Import RESUMED.';
    if (sendLog && typeof sendLog === 'function') sendLog(msgResume, 'info');
}
