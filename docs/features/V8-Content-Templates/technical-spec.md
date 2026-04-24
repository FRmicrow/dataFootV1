# TSD — V8 Content Templates

**Status**: Draft, awaiting validation
**Author**: Product Architect (Claude Cowork)
**Date**: 2026-04-20
**Feature**: Library of ready-to-ship, data-driven content templates with per-template artistic direction (DA), multi-format output, and real V4 backend hookup.

## 1. Mission

Delivery a **decoupled template library** that takes a normalized data contract and renders a polished, brand-consistent visual in any of three aspect ratios (9:16, 1:1, 16:9), exportable as static image (PNG), animated video (WEBM), or live React component.

Each template has its **own artistic direction (DA)** — a package of palette, typography, layout energy, and animation language — but all templates share a common frame, theme tokens, and export utilities.

The library is **Studio-inspired** (same architectural grammar) but **independent** from the Studio Wizard (decoupled consumer).

## 2. User Stories

| ID | US | Acceptance |
|---|---|---|
| US-V8-01 | En tant que content creator, je veux choisir un template depuis un registry, fournir un set de données et obtenir une image PNG prête à publier | 1 template + data → PNG 1080×1920 en ≤ 3s |
| US-V8-02 | En tant que content creator, je veux basculer entre 9:16 / 1:1 / 16:9 sans que le visuel casse | Même template, 3 formats, tous lisibles et équilibrés |
| US-V8-03 | En tant que content creator, je veux personnaliser la DA (couleur dominante, paire typographique) par-dessus la DA par défaut | Props `accent` et `fontPair` overridables |
| US-V8-04 | En tant que dev, je veux ajouter un 6ᵉ template sans modifier le code existant | Ajout = nouveau dossier + entrée dans `TemplateRegistry.js`. Aucun autre fichier modifié. |
| US-V8-05 | En tant que content creator, je veux que le template affiche des données réelles de mon backend V4 | Hook V4 actif pour DuoComparison/StatSupremacy/RaceTracker/NarrativeGrid/PowerGrid, fallback `demo.js` si hook indisponible |

## 3. Architecture

### 3.1 Structure de dossier

```
frontend/src/components/v3/modules/studio/templates/
├── index.js                          ← export public (registry + components)
├── README.md                         ← doc lib
├── TemplateRegistry.js               ← source of truth des templates disponibles
├── _shared/
│   ├── TemplateFrame.jsx             ← cadre commun (aspect ratio, branding)
│   ├── TemplateFrame.css
│   ├── themes.js                     ← 5 DA (palette + shadow + accent)
│   ├── fontPairs.js                  ← 5 paires typo display/body
│   ├── validators.js                 ← validation runtime légère (pas de zod)
│   └── exporters.js                  ← utils PNG + WEBM
├── DuoComparison/
│   ├── DuoComparison.jsx
│   ├── DuoComparison.css
│   ├── contract.js                   ← data shape + validator
│   ├── demo.js                       ← Díaz-Olise / Robben-Ribéry
│   └── useDuoBackend.js              ← hook V4 optionnel
├── StatSupremacy/
├── RaceTracker/
├── NarrativeGrid/
└── PowerGrid/
```

### 3.2 Registry

`TemplateRegistry.js` exporte un tableau de métadonnées, source unique de vérité :

```js
export const TEMPLATES = [
  {
    id: 'duo-comparison',
    name: 'Duo Comparison',
    category: 'comparison',
    component: DuoComparison,
    defaultDA: 'noir-gold',
    aspectRatios: ['9:16', '1:1', '16:9'],
    contract: duoContract,
    demo: duoDemo,
    thumbnail: '/templates/duo-comparison.png', // à générer
  },
  // ...
];
```

### 3.3 Data contract (sans zod)

Chaque template expose :

- `contract.js` : un objet décrivant les champs requis (types + exemple)
- `validate(data)` : fonction synchrone, renvoie `{ valid: bool, errors: string[] }`

Exemple pour DuoComparison :

```js
export const contract = {
  title: { type: 'string', required: true, example: 'Diaz-Olise vs Robben-Ribéry' },
  subtitle: { type: 'string', required: false },
  left: {
    heading: { type: 'string', required: true },
    players: { type: 'array<Player>', required: true, length: 2 },
    stats: { type: 'array<Stat>', required: true },
  },
  right: { /* same shape */ },
};
```

### 3.4 DA (Direction Artistique)

5 DA packagées dans `themes.js` :

| DA | Mood | Palette | Display font | Use case |
|---|---|---|---|---|
| `dark-observatory` | Analytique, dense, data-rich | `#0A0E1A` bg, `#00E5C4` accent | `Space Grotesk` | RaceTracker, NarrativeGrid |
| `editorial` | Magazine, typo-first, high contrast | `#F5F1E8` bg, `#111` texte, `#D4302A` accent | `Fraunces` + `Inter` | StatSupremacy |
| `noir-gold` | Premium, duo duel, premium | `#0B0B0C` bg, `#C9A24C` accent | `Sora` | DuoComparison |
| `red-alert` | Crise, urgence, intensité | `#1A0000` bg, `#FF3737` accent | `DM Sans` | NarrativeGrid (crise) |
| `tactical-board` | Grille, précision, minimaliste | `#12151C` bg, `#E8F0FF` texte, `#6BA3FF` accent | `Outfit` | PowerGrid |

Chaque DA dans `themes.js` :

```js
export const themes = {
  'noir-gold': {
    bg: '#0B0B0C',
    surface: '#151516',
    text: '#F5E8C7',
    textSoft: '#A8977C',
    accent: '#C9A24C',
    accentSoft: '#C9A24C33',
    shadow: '0 24px 60px -20px rgba(201, 162, 76, 0.3)',
    radius: '20px',
  },
  // ...
};
```

Les valeurs doivent rester dans `themes.js` **uniquement** parce qu'elles sortent de l'app (export PNG/WEBM autonomes sans CSS variables). Toutes les autres valeurs (spacing, radius du layout, etc.) restent en tokens CSS du `tokens.css`.

### 3.5 Aspect ratios

Le `TemplateFrame` est un wrapper qui fixe les dimensions et le grid :

```jsx
<TemplateFrame aspectRatio="9:16" theme="noir-gold">
  <DuoComparison data={...} />
</TemplateFrame>
```

Règles :
- 9:16 (1080×1920) : stories IG/TikTok, layout vertical
- 1:1 (1080×1080) : post IG carré
- 16:9 (1920×1080) : X/Twitter wide, blog

Chaque template doit gérer les 3 ratios via classes CSS `.template-9x16`, `.template-1x1`, `.template-16x9`.

## 4. Data Contracts par template

### 4.1 DuoComparison

```
{
  title: string,
  subtitle?: string,
  left: { heading, subheading?, members: [{name, portraitUrl}], stats: [{label, value, unit?}] },
  right: { /* mirror */ },
  footer?: { source?, era? }
}
```

**Backend V4 source** : `api.getSeasonPlayersV4(league, season, { player_ids })` pour récupérer stats de Díaz et Olise ; l'historique Robben/Ribéry 2012-13 = non présent en V4 actuellement → stubbed dans `demo.js`.

### 4.2 StatSupremacy

```
{
  headline: string,           // ex: "Kane a marqué plus de buts en 2025-26 que toute sa Prem carrière"
  heroStat: { value, unit, label },
  subjects: [{ name, value, portraitUrl?, color? }],
  trendline?: [{ x, y }],
  annotations?: [{ x, y, text }],
  source?: string
}
```

**Backend V4** : `api.getSeasonPlayersV4(league, season, { sort_field: 'goals', limit: 10 })` + `getPlayerSeasonStatsV4(league, season, playerId)` pour la trajectoire.

### 4.3 RaceTracker

```
{
  headline: string,
  competitors: [{ name, color, logoUrl? }],
  timeline: [{ matchday, values: { [competitorName]: points } }],
  events?: [{ matchday, label }]
}
```

**Backend V4** : `api.getFixturesV4(league, season)` → agrégation côté frontend pour calculer points cumulés par matchday (pas de méthode dédiée actuellement → @STUB).

### 4.4 NarrativeGrid

```
{
  headline: string,
  subtitle?: string,
  matches: [{ opponent, result: 'W'|'D'|'L', kpis: { [name]: 0..1 }, isHome: bool }],
  kpiLabels: [string]          // ex: ['Result', 'xG diff', 'Injuries', 'Mood']
}
```

**Backend V4** : `api.getFixturesV4(league, season)` + `getFixtureTacticalStatsV4` (pour xG diff). "Mood" et "Injuries" = @STUB (pas de source directe).

### 4.5 PowerGrid

```
{
  headline: string,
  cells: [{ title, rank, subtitle?, logoUrl?, score, meta?: string }],
  columns?: number              // 3 ou 4 par défaut
}
```

**Backend V4** : `api.getV4ForesightCompetitions()` pour classement de probas si dispo, sinon `getStandings(leagueId, year)` pour classement classique.

## 5. Exporters

### 5.1 PNG

Librairie cible : `html-to-image` (~20kB gzip, bien maintenue).

```js
// exporters.js
import { toPng } from 'html-to-image';
export async function exportTemplateToPNG(ref, filename) {
  const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
  triggerDownload(dataUrl, `${filename}.png`);
}
```

**Action requise** : ajouter `html-to-image` à `frontend/package.json` via `npm install html-to-image`. Marqué comme **@ACTION REQUIRED BY DEVELOPER** dans `AUDIT-REMEDIATION-PLAN.md`.

### 5.2 WEBM (animé)

Réutiliser le pattern de `Step3_PreviewExport.jsx` (MediaRecorder sur Canvas). Pour les templates qui ne sont pas Canvas-native (ex: RaceTracker en Recharts), on capture via `html2canvas` → frames → encode.

Simple version MVP : WEBM uniquement pour les templates Canvas (RaceTracker via d3, NarrativeGrid via Canvas custom). PNG-only pour les autres en V8.0. WEBM pour tous en V8.1.

### 5.3 Live React

Import simple :

```jsx
import { DuoComparison } from '@/components/v3/modules/studio/templates';
<DuoComparison data={...} theme="noir-gold" aspectRatio="9:16" />
```

## 6. Routes backend à ajouter (@STUB → à dev)

| Besoin | Route suggérée | Priorité |
|---|---|---|
| Points cumulés par matchday (pour RaceTracker) | `GET /v4/league/:league/season/:season/points-trajectory` | 🔴 Haute |
| Player season trajectory (buts/xG par matchday) | `GET /v4/league/:league/season/:season/player/:id/trajectory` | 🟡 Moyenne |
| Team season aggregate (xG, PPDA, multi-match) | `GET /v4/league/:league/season/:season/team/:id/aggregate` | 🟡 Moyenne |

Ces routes **ne sont pas dans le scope de V8** — elles sont marquées `@STUB` côté hook frontend et le template tombe sur `demo.js` si la route n'existe pas.

## 7. Impact sur l'existant

- **Zéro impact** sur `StudioWizard.jsx`, `Step1_Data.jsx`, `Step3_PreviewExport.jsx`, `charts/`, `ContentStudioV3.jsx`.
- Le Studio existant continue de fonctionner tel quel.
- Les templates sont une **lib consommable** : on pourra plus tard :
  - Créer une page `/templates` qui affiche la galerie
  - Ajouter une étape `Step0_ChooseTemplate` au wizard
  - Exposer les templates via une API publique pour automatisation externe

## 8. Checklist QA

- [ ] Chaque template rend correctement en 9:16, 1:1, 16:9
- [ ] Chaque template accepte un `theme` override
- [ ] Chaque template fonctionne en standalone (props `data` inline)
- [ ] Chaque template peut fetcher depuis le backend V4 (hook fourni)
- [ ] Validation runtime des props retourne des erreurs exploitables
- [ ] Aucune valeur hex en dur dans le JSX (sauf dans `themes.js`)
- [ ] Skeleton loader pendant fetch V4
- [ ] Error state lisible si V4 indispo
- [ ] README expliquant ajout d'un nouveau template

## 9. Livraison V8.0 (ce sprint)

- Shared infra (frame, themes, fontPairs, registry, validators, exporters PNG)
- 5 templates fonctionnels : DuoComparison, StatSupremacy, RaceTracker, NarrativeGrid, PowerGrid
- Hook backend V4 pour chaque (avec fallback `demo.js`)
- README complet
- Dépendance frontend à installer : `html-to-image`

## 10. Livraison V8.1 (futur)

- WEBM export pour templates non-Canvas via `html2canvas` + MediaRecorder
- Page Gallery `/templates`
- Wiring dans le Studio Wizard (Step 0)
- 3 templates supplémentaires (GoalMap, XgRadar, TransferArrow)
- Backend : 3 routes `@STUB` ci-dessus

---

**Validation requise par** : DomP6 avant implémentation.
