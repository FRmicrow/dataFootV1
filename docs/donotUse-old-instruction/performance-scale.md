---
trigger: always_on
---

Development Guideline: Performance & Scalability
Overview

High performance and scalability ensure that the dataFootV1 platform can handle growing user bases and large volumes of data. This guideline describes how to build efficient, scalable systems.

Asynchronous Operations

Use async/await or promises in Node.js to perform non‑blocking I/O. Avoid synchronous operations that block the event loop.

In the frontend, use lazy loading and code splitting to reduce initial bundle sizes. Load components or data on demand rather than all at once.

Caching Strategies

Identify data that is expensive to compute or fetch and store it in a cache (memory or distributed cache). Define clear time‑to‑live (TTL) values and invalidation rules.

Separate caching logic from business logic. Use dedicated modules or middleware to handle caching concerns.

Database Optimisation

Design indexes to support common query patterns. Work with the database architect to avoid full table scans and N+1 queries.

Use pagination for large result sets and avoid returning unbounded lists of records.

Consider read replicas or sharding if the database becomes a bottleneck.

Resource Management

Release resources (database connections, file handles, sockets) promptly when they are no longer needed. Use connection pools to manage database connections efficiently.

Monitor CPU, memory and I/O usage in development and production. Address memory leaks and performance bottlenecks as soon as they are identified.