# Visual Manifesto (V2)

Visual excellence is the identity of statFootV3. Every interface must be intentional, distinctive, and premium. Generic "AI aesthetics" are forbidden.

## 1. Design Thinking First

Before any UI code, commit to a design philosophy. Examples:
- "Dark observatory — analytical density, glowing data points"
- "Editorial sports — typography-led, high contrast, magazine energy"
- "Tactical board — military precision, structured grids, muted tones with sharp accents"

Document this in `DESIGN_PHILOSOPHY.md` before implementation. Get user validation.

**Bold maximalism and refined minimalism both work — the key is intentionality.**

## 2. Color

- Use CSS variables from `tokens.css` exclusively
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes
- Use `--gradient-primary`, `--gradient-dark`, `--gradient-surface` tokens for gradients
- Glassmorphism for overlays: `backdrop-filter: var(--glass-blur)` + `background: var(--glass-bg)`
- HSL manipulation for dynamic color states (hover, active) via CSS `hsl()` function

## 3. Typography

- Body text: `--font-family` token (`'Inter'`, system-ui)
- **Display / headings: use a distinctive font.** Pair with the body font. Suggested: `'DM Sans'`, `'Sora'`, `'Outfit'`, `'Space Grotesk'` (vary per feature — do not converge on the same choice every time)
- Load via Google Fonts in `index.html` when using a non-system font

## 4. Motion

- **Staggered reveal:** Pages and sections never "pop". Use `animation-delay` increments (50ms, 100ms, 150ms…) for staggered entry
- **One high-impact animation per page** is better than many scattered micro-interactions
- **Interactive feedback:** All buttons and cards have `transition: var(--transition-base)` on hover/active
- **Focus states:** `box-shadow: var(--focus-ring)` on all interactive elements — accessibility and aesthetics

## 5. Spatial Composition

- Unexpected layouts over predictable grids
- Generous negative space OR controlled density — never accidental middle ground
- Overlap, asymmetry, diagonal flow where it serves the content
- `--shadow-premium` for cards that need to stand out

## 6. NEVER LIST

- Pure primary colors (`#FF0000`, `#0000FF`, `#00FF00`)
- Inline `border: 1px solid #ccc` — use shadow tokens or background variation
- Loading without `<Skeleton>` — blank states are forbidden
- `style={{...}}` with more than 2 properties
- Hardcoded hex/rgb values in JSX — always use CSS variable tokens
- The same font choice reused across multiple features (vary intentionally)
- Purple gradient on white — the canonical "generic AI" look
