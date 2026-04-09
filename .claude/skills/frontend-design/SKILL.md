---
name: frontend-design
description: Create premium React components and pages for statFootV3 using the Design System V3. Use when building UI components, pages, dashboards, or styling/beautifying any view in the frontend. Generates distinctive code using ds-* classes, CSS tokens, and the Visual Manifesto aesthetic — never generic AI aesthetics.
---

This skill guides creation of premium, production-grade frontend interfaces for statFootV3 that respect the existing Design System V3 and Visual Manifesto. It enforces intentional design philosophy before any code is written.

## Phase 0 — Design Philosophy (MANDATORY FIRST STEP)

Before writing any code, commit to a clear aesthetic direction by answering:

1. **Purpose** — What problem does this UI solve? Who uses it and in what context?
2. **Tone** — Pick an intentional direction: *analytical/data-dense*, *immersive/cinematic*, *brutalist/raw*, *refined/minimal*, *editorial/magazine*. Not generic. Not purple-gradient-on-white.
3. **Differentiation** — What is the ONE thing a user will remember about this screen?
4. **Design System Audit** — Which existing `ds-*` components cover this feature? List them before creating anything new.

Document this in `docs/features/Vxx-[Name]/DESIGN_PHILOSOPHY.md` before proceeding. **Get user validation.**

## Implementation Rules

### Design System First (ABSOLUTE RULE)

Check `frontend/src/design-system/` before writing any style. Use existing components:

```
ds-card, ds-badge, ds-button, ds-input, ds-select, ds-table,
ds-tabs, ds-progress, ds-skeleton, ds-metric-card, ds-profile-header,
ds-fixture-row, ds-league-card, ds-player-card, ds-navbar
```

Use CSS variables from `tokens.css` — NEVER hardcode values:

```css
/* CORRECT */
color: var(--color-primary-500);
padding: var(--spacing-md);
border-radius: var(--radius-md);

/* FORBIDDEN */
color: #8b5cf6;
padding: 24px;
border-radius: 12px;
```

See `references/design-tokens.md` for the full token reference.

### Typography

Avoid Inter for display text. Use the `--font-family` token for body, but override headings with a distinctive font (e.g. `'DM Sans'`, `'Sora'`, `'Outfit'`). Pair a display font with the body font — see Visual Manifesto rule.

### Motion & Micro-interactions

- Page/section entry: staggered reveal with `animation-delay`, not instant pop
- Interactive elements: `transition: var(--transition-base)` on all hover/active states
- Focus: minimum `box-shadow: var(--focus-ring)` on all interactive elements
- One high-impact orchestrated animation per page > many scattered micro-interactions

### Loading States

Every component that fetches data **must** render a `<Skeleton>` from the design system while loading. No spinners, no blank spaces.

```jsx
import Skeleton from '../../../design-system/components/Skeleton';

if (isLoading) return <Skeleton variant="card" />;
```

### Performance

- Wrap expensive computations in `useMemo`
- Wrap callbacks passed to children in `useCallback`
- Never run heavy transforms (sort, filter, aggregate) inside render

## NEVER LIST

- `style={{...}}` with more than 2 properties — use className + CSS variables
- Hardcoded hex values, `rgb()`, `rgba()` in JSX — use tokens
- Components without a loading state
- Components without an error state
- Raw `<div>` grids when `ds-grid` or layout tokens exist
- Inter/Arial as display/heading font
- Pure `#FF0000`, `#0000FF` primary colors

## Example Flow

User: "Build a player comparison module."

Agent:
1. Read `frontend/src/design-system/components/` — find `MetricCard`, `Table`, `Tabs`
2. Create `DESIGN_PHILOSOPHY.md`: tone = "analytical/data-dense, dark observatory"
3. Wait for user validation
4. Implement using `ds-tabs` for navigation, `ds-metric-card` for stats, `ds-skeleton` for loading
5. Apply staggered entry animation on metric cards
6. Pass to `qa-automation-v2` skill for testing
