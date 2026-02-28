---
description: Development Guideline - Mission definition
---

Development Guidelines – Mission Definition
Purpose

These guidelines provide a unified set of practices and standards for all contributors to the dataFootV1 project. They are intended to ensure high quality, maintainability and reliability of the codebase throughout the development lifecycle. Every AI agent and human developer should follow these principles during the development phase.

Coding Standards

Language & Style: Use modern JavaScript (ES6+) and TypeScript where appropriate to benefit from strong typing. Adhere to a consistent code style (enforced via tools such as ESLint and Prettier). Favour descriptive names for variables, functions and files.

File Structure: Organise the repository by feature or layer. Separate concerns clearly—place controllers, services, models, routes and utilities in their respective directories. For React, follow an atomic/component hierarchy. Avoid large files; instead break them down into smaller modules with single responsibilities.

Layered Architecture: Maintain clear boundaries between the presentation layer (front end), API layer (controllers), business logic (services), data access layer (repositories) and external integrations. No layer should directly access deeper layers without going through the appropriate interface.

Configuration & Secrets: Store configuration (API keys, database credentials) in environment variables or a secure secrets manager. Never hard‑code sensitive information in the codebase.

Error Handling: Implement a unified error‑handling mechanism. Catch and handle exceptions at appropriate layers, returning meaningful messages and status codes. Avoid swallowing errors; always log them for diagnostics.

Logging: Use a centralised logging library to record events, warnings and errors. Include context such as request identifiers and timestamps. Do not log sensitive data. Adjust log levels appropriately (info, warn, error).

Code Review & Collaboration

Peer Review: Every change should undergo code review. Reviewers should check for correctness, readability, performance, security and adherence to these guidelines. Encourage constructive feedback and learning.

Small, Focused Changes: Break down large tasks into small, manageable pull requests that are easier to review and test. Each PR should address a single concern.

Commit Messages: Follow the commit message template defined by the Git expert. Messages should succinctly describe what changed and why, referencing relevant user stories or issue numbers.

Pull Request Template: Use the provided PR template to summarise changes, link to user stories, list acceptance criteria and include testing instructions. Ensure all checklist items (tests passing, linters run, documentation updated) are completed before requesting a merge.

Testing & Quality Assurance

Test Coverage: Write unit tests for individual functions and modules, integration tests for API endpoints and end‑to‑end tests for user flows. Aim for a high level of coverage, focusing on critical logic paths.

Test-Driven Development (TDD): When feasible, write tests before implementing new features. This helps clarify requirements and catch defects early.

Continuous Integration: Configure CI pipelines to run linting, tests and build processes on every push and pull request. PRs should not be merged if the CI checks fail.

Static Analysis: Use tools such as TypeScript’s compiler, ESLint and security scanners to detect errors, code smells and vulnerabilities. Address warnings promptly.

Documentation

Code Documentation: Use clear, concise comments to explain complex logic or business rules. Comment why something is done, not what is done. Document exported functions and public APIs with description of parameters and return values.

API Documentation: Maintain an API reference that describes each endpoint, request parameters, response formats, status codes and error messages. Keep it in sync with the implementation.

Design & Architecture Docs: Provide diagrams and written explanations of high‑level architecture, data models, component structures and workflows. Update these documents as the system evolves.

README & Onboarding: Keep the project’s README up to date with setup instructions, development environment configuration, commands to run tests and build the project, and any conventions followed by the team.

Performance & Scalability

Asynchronous Operations: Use non‑blocking I/O and asynchronous patterns (async/await, promises) to prevent blocking the event loop in Node.js. Avoid heavy computations on the main thread.

Caching Strategies: Implement caching (in memory or distributed) for frequently accessed or expensive data. Define cache keys and expiration policies. Invalidate caches carefully when underlying data changes.

Database Optimisation: Work with the database architect to ensure queries are efficient and properly indexed. Avoid N+1 query patterns. Use transactions for operations that need atomicity.

Resource Management: Release resources properly (database connections, file handles). Monitor memory and CPU usage in production and adjust accordingly.

Security

Input Validation & Sanitisation: Validate all inputs on both client and server. Use schema validation libraries to enforce correct types and constraints. Sanitize inputs to prevent injection attacks.

Authentication & Authorisation: Implement secure authentication mechanisms (e.g., JWT, OAuth). Protect routes with appropriate authorisation checks. Store passwords and secrets securely.

Dependency Management: Keep dependencies up to date and monitor for known vulnerabilities. Use package manager audit tools to identify and fix vulnerabilities promptly.

Continuous Improvement

Refactoring: Regularly review code to identify technical debt. Refactor to improve structure and clarity without changing external behaviour. Avoid premature optimisation; focus on readability and maintainability first.

Learning & Growth: Stay informed about best practices, frameworks and libraries relevant to the project. Share insights and improvements with the team through documentation or knowledge‑sharing sessions.

Collaboration & Communication

Agile Practices: Participate actively in sprint planning, daily stand‑ups, sprint reviews and retrospectives. Raise blockers early and help estimate tasks realistically.

Cross‑Team Collaboration: Coordinate with product owners, designers, database architects and machine‑learning engineers to understand requirements, dependencies and impacts. Keep communication channels open and respectful.

Issue Tracking: Use the project’s issue tracking system to document bugs, tasks and feature requests. Update statuses promptly and assign issues to the appropriate owners.

By following these guidelines, the team will produce a codebase that is robust, maintainable and scalable. The goal is to foster a shared understanding of quality standards and to empower each contributor to deliver their best work.