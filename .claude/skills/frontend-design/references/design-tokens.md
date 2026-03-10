# Design Token Reference — statFootV3 Design System V3

Source: `frontend/src/design-system/tokens.css`

## Colors

### Primary (Purple)
| Token | Value |
|---|---|
| `--color-primary-400` | `#a78bfa` — hover states |
| `--color-primary-500` | `#8b5cf6` — default interactive |
| `--color-primary-600` | `#7c3aed` — active/pressed |
| `--color-primary-bg` | `rgba(139,92,246,0.1)` — subtle bg |
| `--color-primary-glow` | `rgba(139,92,246,0.3)` — glow effect |

### Semantic
| Token | Use |
|---|---|
| `--color-success-500` | Positive metrics, confirmed |
| `--color-danger-500` | Errors, negative deltas |
| `--color-warning-500` | Warnings, cautions |
| `--color-success-bg` / `--color-danger-bg` / `--color-warning-bg` | Translucent feedback backgrounds |

### Surfaces (Dark Theme)
| Token | Use |
|---|---|
| `--color-bg-main` | Page background (`#0f172a`) |
| `--color-bg-card` | Card surfaces (`rgba(30,41,59,0.7)`) |
| `--color-bg-card-hover` | Card hover |
| `--color-border` | Default borders |
| `--glass-bg` | Glassmorphism background |
| `--glass-border` | Glassmorphism border |
| `--glass-blur` | `blur(12px)` |

### Gradients
| Token | Value |
|---|---|
| `--gradient-primary` | `linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)` |
| `--gradient-dark` | `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)` |
| `--gradient-surface` | Subtle top-to-transparent white |

## Spacing (12px modular scale)

| Token | Value |
|---|---|
| `--spacing-3xs` | 4px |
| `--spacing-2xs` | 8px |
| `--spacing-xs` | 12px |
| `--spacing-sm` | 18px |
| `--spacing-md` | 24px |
| `--spacing-lg` | 36px |
| `--spacing-xl` | 48px |
| `--spacing-2xl` | 72px |
| `--spacing-3xl` | 96px |

## Typography

| Token | Value |
|---|---|
| `--font-family` | `'Inter', system-ui` (body) |
| `--font-size-xs` | 12px |
| `--font-size-sm` | 14px |
| `--font-size-base` | 16px |
| `--font-size-lg` | 18px |
| `--font-size-xl` | 20px |
| `--font-size-2xl` | 24px |
| `--font-size-3xl` | 30px |
| `--font-size-4xl` | 36px |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |

## Borders & Elevation

| Token | Use |
|---|---|
| `--radius-sm` | 8px — inputs, small elements |
| `--radius-md` | 12px — cards, panels |
| `--radius-lg` | 16px — modals, large cards |
| `--radius-full` | 9999px — badges, pills |
| `--shadow-md` | Standard card shadow |
| `--shadow-premium` | High-contrast card with inset highlight |
| `--glow-primary` | `0 0 15px rgba(139,92,246,0.3)` |

## Animation

| Token | Value |
|---|---|
| `--transition-fast` | `150ms cubic-bezier(0.4,0,0.2,1)` |
| `--transition-base` | `300ms cubic-bezier(0.4,0,0.2,1)` |
| `--transition-slow` | `500ms cubic-bezier(0.4,0,0.2,1)` |

## Z-Index Layers

| Token | Value |
|---|---|
| `--z-index-dropdown` | 1000 |
| `--z-index-navbar` | 1200 |
| `--z-index-modal` | 1400 |
| `--z-index-tooltip` | 1600 |

## Available Design System Components

Located in `frontend/src/design-system/components/`:

| Component | File | Use for |
|---|---|---|
| `Button` | `Button.jsx` | All CTAs |
| `Card` | `Card.jsx` | Content containers |
| `Badge` | `Badge.jsx` | Labels, tags, status |
| `Input` | `Input.jsx` | Form text inputs |
| `Select` | `Select.jsx` | Dropdowns |
| `Table` | `Table.jsx` | Tabular data |
| `Tabs` | `Tabs.jsx` | Tab navigation |
| `Progress` | `Progress.jsx` | Loading bars, % indicators |
| `Skeleton` | `Skeleton.jsx` | Loading states (MANDATORY) |
| `MetricCard` | `MetricCard.jsx` | KPI stat cards |
| `ProfileHeader` | `ProfileHeader.jsx` | Player/club headers |
| `FixtureRow` | `FixtureRow.jsx` | Match list rows |
| `LeagueCard` | `LeagueCard.jsx` | League list items |
| `PlayerCard` | `PlayerCard.jsx` | Player summaries |
| `Navbar` | `Navbar.jsx` | Navigation bar |
| `Accordion` | `Accordion.jsx` | Expandable sections |
| `ControlBar` | `ControlBar.jsx` | Filter/action bars |
| `TeamSelector` | `TeamSelector.jsx` | Team picker |
