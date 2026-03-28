---
name: performance
description: Optimization of queries, bundles, and execution time. Use when improving application speed or reducing resource usage.
---

# Performance Skill

This skill provides expertise in optimizing the `statFootV3` project for speed and efficiency.

## When to use
Use this skill for:
- Optimizing slow database queries.
- Reducing frontend bundle size and load times.
- Implementing effective caching strategies.
- Identifying and fixing memory leaks or CPU bottlenecks.
- Improving API response times.

## Hard Rules (CRITICAL)
- **Profiling**: Never optimize without measuring first. Use Chrome DevTools, `PerformanceObserver`, or backend profilers.
- **Caching**: Use `node-cache` or `Redis` for data that doesn't change frequently.
- **Asset Optimization**: Compress images and use modern formats (WebP).
- **Bundle Size**: Monitor the impact of new dependencies on the frontend bundle.

## Best Practices
1. **Lazy Loading**: Use `React.lazy` and Suspense for code-splitting.
2. **Memoization**: Use `useMemo` and `useCallback` strategically in React to avoid unnecessary re-renders.
3. **Database**: Use indexes properly and avoid `SELECT *`.
4. **Networking**: Use compression (Gzip/Brotli) and minimize HTTP requests.

## Integration
- Works with the `database` skill to optimize data access.
- Works with the `web-dev` skill for UI performance.
- Supports the `devops` skill by ensuring resource efficiency in production.
