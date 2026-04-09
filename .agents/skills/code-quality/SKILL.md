---
name: code-quality
description: Helps with code review, linting, refactoring, and best practices. Use when improving code structure, fixing lint errors, or ensuring compliance with standards.
---

# Code Quality Skill

This skill maintains the highest technical standards across the `statFootV3` codebase.

## When to use this skill

- Use this during code reviews to identify anti-patterns.
- This is helpful for large-scale refactors (e.g., moving to services).
- Use when fixing ESLint or SonarQube issues.
- Use to enforce "Hard Rules" from the `project-context` skill.

## How to use it

### Core Standards
- **DRY**: Don't Repeat Yourself.
- **KISS**: Keep It Simple, Stupid.
- **Backend**: Logic belongs in services, not controllers.
- **Frontend**: Use design system components; avoid inline styles.

### Optimization Patterns
- Identify and eliminate long-running queries or inefficient React renders.
- Enforce structured logging (`backend/src/utils/logger.js`).
- Ensure all input is validated using Zod.
