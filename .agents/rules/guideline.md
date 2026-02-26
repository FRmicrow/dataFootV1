---
trigger: always_on
---

Development Guideline: Coding Standards
Overview

This document defines the coding standards for the dataFootV1 project. Consistent coding conventions improve readability, simplify collaboration and reduce errors. All contributors—human or AI agents—must adhere to these standards during development.

Language & Style

Use modern JavaScript (ES6+) and TypeScript whenever possible. TypeScript provides static typing that catches many errors at compile time.

Apply a consistent code style enforced by automated tools such as ESLint and Prettier. These tools handle indentation, spacing, semicolons and other formatting details.

Choose descriptive names for variables, functions, classes and files. Avoid abbreviations that could be unclear to new developers.

Write small, pure functions with single responsibilities. Avoid large monolithic functions or classes that handle multiple concerns.

File Structure

Organise the codebase by feature or by layer. For example, keep controllers, services, data access modules and utilities in separate directories.

In the front end, follow atomic design principles. Create atomic components (buttons, inputs) and compose them into molecules (forms, cards) and organisms (pages).

Avoid extremely long files. If a file grows beyond a reasonable size, consider splitting it into multiple modules with clear responsibilities.

Layered Architecture

Maintain a clear separation between the presentation layer (UI), API layer (controllers), business logic (services), data access (repositories) and external integrations. Do not bypass these layers by allowing UI components to talk directly to databases or external APIs.

Define interfaces or abstract classes to decouple implementations. This makes it easier to test and replace components without affecting dependent modules.

Configuration & Secrets

Store configuration details (e.g., API keys, database credentials) in environment variables or a secure secrets manager. Never commit sensitive information to version control.

Provide a sample configuration file (e.g., .env.example) to document required environment variables.

Error Handling & Logging

Use a unified error‑handling strategy across the project. Catch exceptions where they occur and convert them into meaningful error responses for the caller.

Implement a central logger with support for multiple log levels (info, warn, error). Include contextual information (e.g., request IDs, user IDs) and avoid logging sensitive data.