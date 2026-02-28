---
trigger: always_on
---

Development Guideline: Testing & Quality Assurance
Overview

Tests verify that the system behaves as intended and help prevent regressions. Quality assurance ensures the code meets functional and non‑functional requirements. This guideline outlines testing strategies and quality practices.

Test Types

Unit Tests: Verify the behaviour of small, isolated units of code (functions, classes). Use mocking to isolate dependencies.

Integration Tests: Test the interaction between multiple components, such as API endpoints calling services and databases. Validate that the pieces work together correctly.

End‑to‑End Tests: Simulate user journeys through the application. Verify that user interfaces, API endpoints and databases interact seamlessly.

Performance Tests: Measure system responsiveness and resource usage under load. Identify bottlenecks and ensure scalability.

Test Coverage & TDD

Aim for high coverage of critical paths in both frontend and backend code. Coverage reports should highlight untested areas that may need attention.

Apply Test‑Driven Development (TDD) where feasible: write tests before implementing functionality. This clarifies requirements and provides safety nets for refactoring.

Continuous Integration

Configure CI pipelines to run tests and static analysis automatically on each commit and pull request. Failing tests or lint errors should block merges until resolved.

Include security checks (e.g., dependency vulnerability scans) in the CI process.

Static Analysis & Linters

Use static analysis tools to detect potential bugs, code smells and security issues. Address warnings and errors as part of regular development.

Enforce code formatting and style through linters. Consistent formatting reduces cognitive load and improves readability.

Quality Gates

Define minimum quality gates (e.g., test coverage threshold, maximum cyclomatic complexity) that must be met before code is merged.

Regularly review and update quality thresholds based on project needs and evolving best practices.