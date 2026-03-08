# SonarQube Good Practices - StatFoot V3

This document outlines the coding standards and best practices for the StatFoot V3 project to maintain a high Quality Gate score and ensure a premium, accessible, and maintainable codebase.

## 1. Accessibility (A11y)

All interactive elements must be accessible via keyboard and assistive technologies.

- **Interactive Elements**: Never use `div` or `span` for clickable elements. Use the Design System `Button` or standard `button` elements.
- **Keyboard Listeners**: Every element with an `onClick` handler should have at least one keyboard listener (e.g., `onKeyDown`).
- **ARIA Roles**: Use appropriate ARIA roles (e.g., `role="button"`, `role="tab"`) and states (e.g., `aria-expanded`, `aria-selected`).
- **Semantic HTML**: Use semantic tags (`main`, `nav`, `aside`, `header`, `footer`) to define page structure.

## 2. Code Complexity

Keep functions simple and modular to pass SonarQube's complexity checks.

- **Cognitive Complexity**: Aim for a score below **15**. If a function exceeds this, decompose it into smaller, focused sub-components or utility functions.
- **Nesting Depth**: Never nest functions or conditional logic more than **4 levels deep**. Use early returns (`if (error) return;`) to flatten potential nesting.
- **Component Decomposition**: Break large components (e.g., `ResultsCanvas`) into functional modules (e.g., `AccuracyChart`, `RetrainSection`).

## 3. React Best Practices & Prop-Types

Enforce strict data validation and efficient rendering.

- **Prop-Types**: Every component must have comprehensive `PropTypes` validation for all props. Avoid `PropTypes.any` or `PropTypes.object` without a shape.
- **Design System Integration**: Always use components from the `@design-system` (e.g., `Stack`, `Grid`, `Card`, `Badge`) to ensure visual consistency and built-in accessibility.
- **Memoization**: Use `React.memo`, `useMemo`, and `useCallback` for expensive operations or components that re-render frequently in large lists.

## 4. CSS & Styling

Follow the Design System tokens to maintain a premium "WOW" factor.

- **Variable Usage**: Always use CSS variables (`var(--color-primary-500)`, `var(--spacing-md)`) instead of hardcoded hex codes or pixel values.
- **Utility Classes**: Use global utility classes (e.g., `ds-flex`, `ds-gap-sm`) for common layouts.
- **Clean Styles**: Avoid duplicate property declarations and unused CSS rules.

## 5. Backend & API

Ensure robust and performant server-side logic.

- **Query Optimization**: Avoid N+1 queries. Use pre-fetching and joins where necessary.
- **Error Handling**: Implement consistent error responses and avoid deep try-catch nesting.
- **Migration Registry**: All schema changes must be documented in the migration registry with clear descriptions of the impact.

---
*Following these guidelines ensures that StatFoot V3 remains a state-of-the-art platform with a perfect "Static Analysis" record.*
