---
name: database
description: PostgreSQL schema management and optimized queries. Use when creating or modifying migrations, schemas, or complex SQL queries.
---

# Database Skill

This skill provides expertise in managing the PostgreSQL database for the `statFootV3` project.

## When to use
Use this skill for any database-related tasks, including:
- Designing and implementing database schemas.
- Writing and running migration scripts.
- Optimizing complex SQL queries.
- Managing indexing strategies for performance.
- Ensuring data normalization and integrity.

## Hard Rules (CRITICAL)
- **Security**: Never hardcode credentials. Use `process.env.DATABASE_URL`.
- **Safety**: Use **parameterized queries** only (`db.all(sql, [params])`). Never use string interpolation for SQL.
- **Consistency**: Follow the database schema design in `backend/scripts/v3/migrate.js`.
- **Migrations**: Always create a migration script for schema changes.
- **Canonical Identity**: Every external data ingestion **must** use `ResolutionServiceV4` and mapping tables (`v4.mapping_teams`, etc.). No direct insertion of external IDs in business tables. Refer to **[.agents/rules/canonical-identity-resolution.md](file:///.agents/rules/canonical-identity-resolution.md)**.

## Best Practices
1. **Indexing**: Create indexes for columns frequently used in `WHERE`, `JOIN`, or `ORDER BY` clauses.
2. **Normalization**: Aim for 3NF (Third Normal Form) to avoid data redundancy.
3. **Query Optimization**: Use `EXPLAIN ANALYZE` to identify and fix slow queries.
4. **Data Integrity**: Use proper constraints (FOREIGN KEY, NOT NULL, UNIQUE, CHECK).

## Integration
- Works with the `backend` skill to provide data persistence.
- Supports the `data-analyzer` skill by providing a robust data storage layer.
- Works with the `performance` skill to ensure optimal query execution times.
