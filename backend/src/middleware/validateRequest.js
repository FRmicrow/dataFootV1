import { z } from 'zod';

/**
 * Universal Validation Middleware
 * Validates request body, query, and params against a Zod schema.
 * 
 * Usage:
 * router.post('/path', validateRequest(z.object({
 *   body: z.object({ name: z.string() })
 * })), controller);
 */
export const validateRequest = (schema) => async (req, res, next) => {
    try {
        // Parse validates and strips unknown keys if configured (optional)
        // We pass the whole request context we care about
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Format nice error messages
            const issues = error.errors.map(e => {
                const path = e.path.slice(1).join('.'); // Remove 'body'/'query' prefix root
                return `${path ? path + ': ' : ''}${e.message}`;
            });

            return res.status(400).json({
                error: "Validation Failed",
                details: issues
            });
        }
        next(error);
    }
};
