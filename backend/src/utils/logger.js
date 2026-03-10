import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(isDev && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
            },
        },
    }),
});

/**
 * Creates a child logger with a module label for easier log filtering.
 * Usage: const log = createChildLogger('ImportService');
 *
 * @param {string} module - The module or service name
 * @returns {pino.Logger}
 */
export function createChildLogger(module) {
    return logger.child({ module });
}

export default logger;
