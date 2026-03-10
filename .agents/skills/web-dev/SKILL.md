---
name: web-dev
description: Helps with React, Next.js, TypeScript, and CSS development. Use when building components, pages, or handling frontend/backend logic integration.
---

# Web Development Skill

This skill provides comprehensive guidance for building and maintaining the `statFootV3` web application.

## When to use this skill

- Use this when creating or modifying React components in `frontend/src/`.
- This is helpful for implementing Next.js-style routing or state management.
- Use when working with TypeScript types and interfaces.
- Use when integrating frontend services with the backend API.

## How to use it

### Frontend Standards
- **Framework**: React with Vite.
- **Styling**: Vanilla CSS with CSS Modules. Use tokens from `frontend/src/design-system/tokens.css`.
- **API**: Centralized axios client in `frontend/src/services/api.js`.
- **Types**: Ensure all props and data structures are typed in `.ts` or `.tsx` files.

### Component Structure
1. **Logic**: Use hooks for side effects and data fetching.
2. **View**: Keep JSX clean and semantic.
3. **Styles**: Use the defined design system classes (e.g., `ds-card`).

### Best Practices
- Use `useMemo` and `useCallback` for performance optimization.
- Ensure every data-fetching component has a loading state (Skeleton) and an error state.
- Follow the one-way data flow principle.
