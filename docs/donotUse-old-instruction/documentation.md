---
trigger: always_on
---

Development Guideline: Documentation
Overview

Clear documentation ensures that knowledge is shared and retained across the team. It reduces onboarding time, eases maintenance and helps others understand design decisions.

Code Documentation

Comment complex logic, business rules or algorithms to explain why they exist. Do not restate obvious code.

Document exported functions, classes and modules with a brief description of their purpose, inputs and outputs.

In TypeScript, use type annotations and interfaces to provide self‑documenting code.

API Documentation

Maintain an up‑to‑date API reference describing each endpoint’s path, HTTP method, parameters, request and response bodies, and possible error codes.

Document versioning strategies (e.g., /v1/) and deprecation policies to minimise breaking changes for consumers.

Architecture & Design Docs

Produce high‑level architecture diagrams illustrating how services, databases and external systems interact. Include component diagrams for the frontend.

Describe data models, schemas and relationships in a data dictionary. Keep diagrams and descriptions in sync with the actual implementation.

README & Onboarding

Keep the project’s README current with setup instructions, environment configuration, commands to run the application and tests, and contribution guidelines.

Provide onboarding documentation for new team members explaining project context, important files, tools and processes.

Version Control for Documentation

Store all documentation in version control with the codebase. Review and update documentation in pull requests alongside code changes.

Use appropriate file formats (Markdown for text, image files for diagrams) and maintain consistent naming conventions for documents.