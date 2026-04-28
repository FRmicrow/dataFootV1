---
name: backend
description: Node.js API development, business logic, and services. Use when creating or modifying routes, controllers, or services in backend/src/.
---

# Backend Skill

This skill provides expertise in building robust, scalable, and secure Node.js APIs for the `statFootV3` project.

## When to use
Use this skill for any server-side development, including:
- Designing and implementing RESTful endpoints.
- Managing business logic in services.
- Implementing authentication and authorization.
- Handling input validation and error management.
- Optimizing server-side performance and caching.

## Hard Rules (CRITICAL)
- **Validation**: Always use **Zod** for input validation in controllers.
- **Architecture**: Controllers handle requests/responses; **Services** own the business logic.
- **Logging**: Use the centralized `logger`. Never use `console.*`.
- **Response Format**: Always return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
- **Data Ingestion**: Every external ingestion **must** follow the **[.agents/rules/canonical-identity-resolution.md](file:///.agents/rules/canonical-identity-resolution.md)** procedure via `ResolutionServiceV4`.

## Best Practices
1. **RESTful Design**: Use plural nouns for resources (e.g., `/matches`, `/players`) and appropriate HTTP verbs.
2. **Error Handling**: Use a centralized error handling middleware. Catch and log errors properly.
3. **Caching**: Utilize `node-cache` or similar for expensive computations or frequently accessed static data.
4. **Security**: Ensure all endpoints are protected and validate user permissions where necessary.

## Integration
- Works with the `database` skill for data persistence.
- Works with the `security` skill for audit and protection.
- Supports the `web-dev` skill by providing reliable APIs.
