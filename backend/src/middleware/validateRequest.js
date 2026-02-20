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
        // Handle Zod Errors
        if (error instanceof z.ZodError || (error.errors && Array.isArray(error.errors))) {
            const errorList = (error instanceof z.ZodError ? error.errors : error.errors) || [];

            // Format nice error messages
            const issues = errorList.map(e => {
                const path = e.path && e.path.length > 1 ? e.path.slice(1).join('.') : (e.path || []).join('.'); // Remove 'body'/'query' prefix root if possible
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
