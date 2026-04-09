---
name: design
description: Helps with UI, UX, design-system, and accessibility. Use when designing new interfaces, maintaining the design system, or ensuring visual excellence.
---

# Design Skill

This skill ensures that the `statFootV3` user interface is premium, responsive, and visually stunning.

## When to use this skill

- Use this when designing a new dashboard or feature page.
- This is helpful for updating `tokens.css` or core UI components.
- Use when performing a visual audit of existing screens.
- Use to ensure the "Visual Manifesto" is respected.

## How to use it

### Visual Manifesto Rules
- **Aesthetics**: Premium, dark-mode first, glassmorphism, dynamic animations.
- **Colors**: Use tokens (e.g., `--color-primary-500`), never hardcoded hex.
- **Typography**: Paired fonts (e.g., Outfit for headings, Inter for body).
- **Motion**: Staggered reveals and smooth transitions.

### Design System Integration
- Always check `frontend/src/design-system/components/` first.
- Use `ds-*` utility classes for layout and styling.
- Ensure accessibility (ARIA labels, focus states).
