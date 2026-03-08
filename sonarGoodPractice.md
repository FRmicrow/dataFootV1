# SonarQube Good Practices - StatFoot V3

This document defines the "StatFoot Way" for code quality, based on SonarQube's official **Clean as You Code** methodology and Quality Gate standards.

## 1. The Core Principle: "Clean as You Code"

The primary goal is to **never introduce new issues**. SonarQube’s Quality Gate focuses on **New Code** to ensure that every pull request improves or maintains the codebase's overall health.

- **0 New Issues**: No new code smells, vulnerabilities, or bugs should be introduced.
- **A-Rating Requirement**: Maintainability, Reliability, and Security ratings on New Code must be **A**.
- **Security Hotspots**: 100% of new security hotspots must be reviewed and cleared.

## 2. Technical Standards

### Accessibility (A11y)
*Mandatory for all frontend components.*
- **Interactive Elements**: Use the Design System `Button` or standard `<button>`. Never use `div` or `span` for click events.
- **Keyboard Navigation**: Every `onClick` must have an associated `onKeyDown` or `onKeyPress` handler.
- **ARIA**: Use `aria-label`, `aria-expanded`, and `role` attributes to provide context to assistive technologies.

### Code Complexity & Nesting
*Focus on readability and testability.*
- **Cognitive Complexity**: Must be **< 15** per function. Modularize large logic blocks into sub-components.
- **Nesting Depth**: Maximum **4 levels**. Use early returns (`if (!data) return;`) to flatten logic.
- **Component Size**: If a component exceeds 250 lines, it's a candidate for decomposition (e.g., extracting charts, sidebars, or table rows).

### Coverage & Duplication (The "Fudge Factor")
- **Test Coverage**: New code must have at least **80% coverage** (configurable).
- **Duplication**: New code duplication must be **< 3%**.
- **Small Changes Note**: Sonar ignores coverage and duplication rules if the change is **fewer than 20 lines** (the "Fudge Factor"). However, the 0-issue rule still applies.

## 3. Implementation Workflow

1. **Design System First**: Check `frontend/src/design-system` before creating new UI logic.
2. **Prop-Types Validation**: Define strict `PropTypes` for all new components. Avoid `PropTypes.any`.
3. **Local Audit**: Before pushing, check for:
    - Unused imports/variables.
    - Deeply nested ternary operators.
    - Hardcoded magic numbers or strings (use constants).
4. **Clean as You Code**: If you touch a file to fix a bug, take a moment to fix any minor local smells (e.g., accessibility) in the same area.

---
*By following these standards, we ensure that StatFoot V3 remains a high-performance, accessible, and maintainable platform.*
