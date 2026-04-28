# Technical Spec — V48 Studio Infographics · Phase 2 — Système de templates

> **Status:** DRAFT — en attente de validation utilisateur
> **Author:** Product Architect (rôle assumé)
> **Date:** 2026-04-27
> **Phase:** 2 / 5 du pipeline Infographic Studio
> **Précédent:** V47 (`docs/features/V47-Studio-Infographics-Phase1-Trends/`) — table `v4.x_trends` opérationnelle
> **Pré-requis lus:** `infographic-studio/references/template-spec.md`, `infographic-studio/references/data-contract.md`, `.claude/rules/visual-manifesto.md`, `.claude/rules/development-best-practices.md`, `.claude/rules/data-ingestion-standards.md`

---

## 1. Objectif

Mettre en place **l'infrastructure de templates d'infographies** : format JSON validé, composant React de rendu, composant DS `MissingDataBadge`, endpoint backend qui expose la liste des templates disponibles. Livrer **un premier template fonctionnel** (`player-comparison`) avec ses 3 variants de style.

À la fin de Phase 2 :
- Le format manifest est figé et validé par Zod
- Le pattern "manifest + JSX + props `{resolved, missing, styleVariant}`" est éprouvé sur un cas réel
- Le DS dispose de `MissingDataBadge` (briquue obligatoire de l'anti-hallucination)
- Un client API peut requêter `GET /api/v4/studio/templates` et `/:id`
- L'utilisateur **ne peut pas encore générer une infographie** avec de la vraie donnée — ça arrive en Phase 3 (resolver) + Phase 4 (UI complète)

---

## 2. Scope

### Dans le scope (Phase 2)
- Schéma Zod `TemplateManifestSchema` (frontend, partagé pour validation au boot)
- Loader `frontend/src/infographic-templates/index.js` qui scanne les `.json`, les valide, les exporte
- Premier manifest : `frontend/src/infographic-templates/player-comparison.json`
- Premier composant React : `frontend/src/components/v4/infographic/templates/PlayerComparisonTemplate.jsx` avec **3 variants de style** (dark-observatory / editorial / tactical)
- CSS dimensions fixes 1200×675 (Twitter card 16:9)
- Composant DS `MissingDataBadge` (variants `critical` / `optional`)
- Backend : `InfographicTemplateServiceV4` (lecture FS), `infographicTemplateControllerV4`, route `studio_routes.js`
- Endpoints `GET /api/v4/studio/templates` (liste) et `GET /api/v4/studio/templates/:id` (détail)
- Documentation Swagger
- Tests Vitest (frontend + backend) couvrant : validation manifest, rendu happy/missing, contrats API

### Hors scope (renvoyé aux phases suivantes)
- Resolver de données (`InfographicResolverServiceV4`) → **Phase 3**
- Form Builder dynamique (`FormBuilderV4`) → Phase 4
- Page studio complète (`InfographicStudioPageV4`) → Phase 4
- Export PNG (Puppeteer) → Phase 4
- Brouillons de tweets (`v4.scheduled_tweets`) → Phase 5
- Templates additionnels (`match-recap`, `top-scorers`, etc.) → après Phase 5

---

## 3. Architecture

### 3.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                         │
│                                                                   │
│  frontend/src/infographic-templates/                             │
│  ├── _schema.js                  ← TemplateManifestSchema (Zod)  │
│  ├── _registry.js                ← scan + valide + exporte map   │
│  └── player-comparison.json      ← premier manifest              │
│                                                                   │
│  frontend/src/components/v4/infographic/templates/               │
│  └── PlayerComparisonTemplate.jsx ← rendu, 3 variants            │
│                                                                   │
│  frontend/src/design-system/components/                          │
│  └── MissingDataBadge.{jsx,css,test.jsx,stories.jsx}             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │  fetch /api/v4/studio/templates
                              │
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND                                                          │
│                                                                   │
│  backend/src/services/v4/InfographicTemplateServiceV4.js         │
│   ├── lit le dossier frontend/src/infographic-templates/         │
│   ├── valide chaque manifest avec une copie du schéma Zod        │
│   └── retourne une liste / un détail                             │
│                                                                   │
│  backend/src/controllers/v4/infographicTemplateControllerV4.js   │
│  backend/src/routes/v4/studio_routes.js  (nouveau)               │
│  monté dans v4_routes.js sous /api/v4/studio                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Localisation des manifests — décision clé

**Choix retenu : single source of truth dans `frontend/src/infographic-templates/`.**

Le backend lit ce dossier via FS (chemin relatif depuis `backend/src/services/v4/`). Avantages :
- Pas de duplication ni de drift entre front/back
- Le composant React et son manifest sont **co-localisés mentalement** (même nommage `id`)
- Le backend reste un simple "miroir lecture seule" — il ne possède jamais ses propres manifests

Inconvénient assumé : le backend dépend d'un chemin frontend. C'est un monorepo, c'est OK. Le backend ne casse pas si le manifest a un format invalide — il le rejette via Zod et expose `success: false` pour ce template précis.

**Alternatives écartées** :
- Manifests en BDD : interdit par le skill (templates = code, pas data)
- Duplication front + back : drift garanti, double maintenance
- Manifests côté backend uniquement : oblige le frontend à fetch le manifest avant de pouvoir afficher le template — latence inutile

### 3.3 Structure de fichiers à créer

```
frontend/src/
├── infographic-templates/
│   ├── _schema.js              ← Zod TemplateManifestSchema
│   ├── _registry.js            ← import.meta.glob('*.json') + validate
│   ├── _registry.test.js       ← tests du registry (validation, doublons d'id)
│   └── player-comparison.json
├── components/v4/infographic/
│   └── templates/
│       ├── PlayerComparisonTemplate.jsx
│       ├── PlayerComparisonTemplate.css
│       └── PlayerComparisonTemplate.test.jsx
└── design-system/components/
    ├── MissingDataBadge.jsx
    ├── MissingDataBadge.css
    ├── MissingDataBadge.stories.jsx
    └── MissingDataBadge.test.jsx

backend/src/
├── services/v4/
│   ├── InfographicTemplateServiceV4.js
│   └── InfographicTemplateServiceV4.test.js
├── controllers/v4/
│   ├── infographicTemplateControllerV4.js
│   └── infographicTemplateControllerV4.test.js
└── routes/v4/
    └── studio_routes.js        ← nouveau, monté sous /api/v4/studio

.claude/project-architecture/
└── backend-swagger.yaml        ← patché avec les 2 endpoints
```

---

## 4. Data Contract

### 4.1 Manifest JSON — format figé

Conforme au template `references/template-spec.md` :

```json
{
  "id": "player-comparison",
  "version": 1,
  "name": "Comparatif joueurs",
  "description": "Comparaison de deux joueurs sur une saison (stats classiques + xG).",
  "category": "player",
  "thumbnail": "/static/templates/player-comparison-thumb.png",
  "form": {
    "fields": [
      { "id": "player_a_id", "type": "player-picker", "label": "Joueur A", "required": true },
      { "id": "player_b_id", "type": "player-picker", "label": "Joueur B", "required": true },
      { "id": "season",      "type": "season-picker", "label": "Saison",   "required": true, "default": "current" }
    ]
  },
  "resolverContract": {
    "requiredFields": [
      "players[0].name",
      "players[0].goals",
      "players[1].name",
      "players[1].goals"
    ],
    "optionalFields": [
      "players[0].photo", "players[0].xG", "players[0].assists", "players[0].minutes_played",
      "players[1].photo", "players[1].xG", "players[1].assists", "players[1].minutes_played"
    ]
  },
  "styleVariants": [
    { "id": "dark-observatory", "name": "Dark Observatory", "description": "Fond sombre, glow analytique, accents néon." },
    { "id": "editorial",        "name": "Editorial Sports", "description": "Typographie magazine, contraste élevé, fond clair." },
    { "id": "tactical",         "name": "Tactical Board",   "description": "Grille rigoureuse, tons mats, accents tranchés." }
  ],
  "outputDimensions": { "width": 1200, "height": 675, "format": "png", "dpr": 2 }
}
```

### 4.2 Schéma Zod — `_schema.js`

```js
// frontend/src/infographic-templates/_schema.js
import { z } from 'zod';

const FieldTypeEnum = z.enum([
  'player-picker', 'club-picker', 'match-picker',
  'competition-picker', 'season-picker',
  'text', 'number', 'enum',
]);

const FieldSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'snake_case lowercase'),
  type: FieldTypeEnum,
  label: z.string().min(1),
  required: z.boolean(),
  default: z.unknown().optional(),
  enumValues: z.array(z.string()).optional(),
}).refine(
  (f) => f.type !== 'enum' || (Array.isArray(f.enumValues) && f.enumValues.length > 0),
  { message: 'enum field requires non-empty enumValues' }
);

export const TemplateManifestSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/, 'kebab-case lowercase'),
  version: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['player', 'club', 'match', 'league', 'season']),
  thumbnail: z.string().regex(/^\/static\//, 'must start with /static/'),
  form: z.object({ fields: z.array(FieldSchema).min(1) }),
  resolverContract: z.object({
    requiredFields: z.array(z.string()).min(1),
    optionalFields: z.array(z.string()),
  }),
  styleVariants: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string().min(1),
  })).min(3, 'au moins 3 variants imposés par le visual-manifesto'),
  outputDimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.literal('png'),
    dpr: z.number().int().min(1).max(3),
  }),
}).refine(
  (m) => new Set(m.styleVariants.map(v => v.id)).size === m.styleVariants.length,
  { message: 'duplicate styleVariant id' }
).refine(
  (m) => new Set(m.form.fields.map(f => f.id)).size === m.form.fields.length,
  { message: 'duplicate form field id' }
);
```

### 4.3 Contrat de props du composant React

```jsx
// PlayerComparisonTemplate.jsx
/**
 * @param {Object} props
 * @param {Object} props.resolved   - data sortie du resolver (Phase 3)
 * @param {Array}  props.missing    - liste des champs manquants
 * @param {string} props.styleVariant - 'dark-observatory' | 'editorial' | 'tactical'
 */
export default function PlayerComparisonTemplate({ resolved, missing = [], styleVariant }) { ... }
```

Règles strictes (du skill `references/template-spec.md` §183) :
1. Dimensions fixes en CSS (`1200px × 675px`), jamais inline
2. Pas d'appel API dans le composant
3. Pas de state local sauf animations purement décoratives
4. Tokens DS exclusivement (jamais d'hex/rgb hardcodé)
5. Polices web préchargées dans `index.html`
6. Pas de fallback de donnée — `<MissingDataBadge />` ou la donnée résolue

### 4.4 Composant `MissingDataBadge`

```jsx
// MissingDataBadge.jsx
import Badge from './Badge.jsx';
import './MissingDataBadge.css';

/**
 * @param {string} label    - texte court ("xG saison 2025-26")
 * @param {'critical'|'optional'} severity
 */
export default function MissingDataBadge({ label, severity = 'optional' }) {
  const variant = severity === 'critical' ? 'danger' : 'neutral';
  const icon = severity === 'critical' ? '⚠' : 'ℹ';
  const prefix = severity === 'critical' ? 'Donnée requise' : 'Optionnel';
  return (
    <Badge variant={variant} className="ds-missing-badge" size="sm">
      <span aria-hidden="true">{icon}</span> {prefix} : {label}
    </Badge>
  );
}
```

S'appuie sur le `Badge` existant du DS (variants `danger`/`neutral` confirmés via `Badge.css`). Pas de couleur en dur — uniquement les tokens du DS.

---

## 5. API Contract

### 5.1 `GET /api/v4/studio/templates`

**Réponse 200** :
```json
{
  "success": true,
  "data": [
    {
      "id": "player-comparison",
      "version": 1,
      "name": "Comparatif joueurs",
      "description": "...",
      "category": "player",
      "thumbnail": "/static/templates/player-comparison-thumb.png",
      "styleVariantIds": ["dark-observatory", "editorial", "tactical"]
    }
  ]
}
```

Renvoie une liste **résumée** (pas le manifest complet — pour ça, voir `/:id`). On retire `form`, `resolverContract`, `outputDimensions` qui sont volumineux et inutiles pour la galerie de templates.

### 5.2 `GET /api/v4/studio/templates/:id`

**Réponse 200** : le manifest complet validé.
**Réponse 404** : `{ success: false, error: "template_not_found", id: "..." }`
**Réponse 500** : si le manifest existe mais ne valide pas Zod (drift de format).

### 5.3 Validation Zod côté controller

Pas de body donc seulement validation des params :
```js
const TemplateIdParamsSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/, 'invalid template id format'),
});
```

---

## 6. Premier template — `player-comparison`

### 6.1 Sujet
Comparer 2 joueurs sur une saison. Cas d'usage cité par l'utilisateur (Mbappé vs Haaland).

### 6.2 Champs requis (resolver Phase 3 contract)
- `players[0].name` (nom complet)
- `players[0].goals`
- `players[1].name`
- `players[1].goals`

### 6.3 Champs optionnels
- `photo`, `xG`, `assists`, `minutes_played` pour chaque joueur
- Logo du club + couleurs (Phase 3 enrichira)

### 6.4 Layout (3 variants partagent la même structure)
```
┌───────────────────────────────────────────────────────┐
│  [Variant Header]   COMPARATIF · SAISON 2025-26       │  height ~80
├───────────────────────────┬───────────────────────────┤
│   Photo Mbappé            │   Photo Haaland           │
│   Mbappé                  │   Haaland                 │
│   PSG                     │   Manchester City         │  height ~250
├───────────────────────────┼───────────────────────────┤
│   Buts:    31  ███████    │   Buts:    28  ██████     │
│   Passes:   8  ███        │   Passes:   5  ██         │
│   xG:      28.4 ██████    │   xG:      26.1 █████     │  height ~280
│   Min:    2700            │   Min:    2580            │
├───────────────────────────┴───────────────────────────┤
│   [Brand · ninetyXI]                  Source: ...     │  height ~65
└───────────────────────────────────────────────────────┘
total : 1200 × 675
```

### 6.5 Variants
| Variant | Background | Police titre | Accent | Ambiance |
|---|---|---|---|---|
| `dark-observatory` | gradient sombre + glow néon | DM Sans bold | bleu/violet néon | analytique, dense |
| `editorial` | beige/blanc | Outfit display | rouge/noir | magazine, contrastée |
| `tactical` | gris ardoise | Space Grotesk | vert d'eau | sobre, structuré |

Chaque variant = 1 classe CSS top-level (`.template-theme--dark-observatory` etc.). Les valeurs viennent de `tokens.css` ou de tokens étendus dans `PlayerComparisonTemplate.css`.

---

## 7. Tests

### 7.1 Frontend Vitest

| # | Suite | Cas |
|---|---|---|
| F1 | `_schema.test.js` | manifest player-comparison valide |
| F2 | `_schema.test.js` | id non kebab → reject |
| F3 | `_schema.test.js` | < 3 variants → reject |
| F4 | `_schema.test.js` | duplicate variant id → reject |
| F5 | `_schema.test.js` | duplicate field id → reject |
| F6 | `_schema.test.js` | enum sans enumValues → reject |
| F7 | `_registry.test.js` | tous les manifests du dossier valident |
| F8 | `MissingDataBadge.test.jsx` | rend `severity=critical` avec icône ⚠ + Badge danger |
| F9 | `MissingDataBadge.test.jsx` | rend `severity=optional` avec icône ℹ + Badge neutral |
| F10 | `PlayerComparisonTemplate.test.jsx` | rendu happy : 2 joueurs avec stats complètes |
| F11 | `PlayerComparisonTemplate.test.jsx` | rendu missing : champs absents → MissingDataBadge visible |
| F12 | `PlayerComparisonTemplate.test.jsx` | les 3 variants rendent (classe theme appliquée) |

### 7.2 Backend Vitest

| # | Suite | Cas |
|---|---|---|
| B1 | `InfographicTemplateServiceV4.test.js` | listTemplates retourne au moins le player-comparison |
| B2 | `InfographicTemplateServiceV4.test.js` | getTemplate('player-comparison') retourne le manifest complet |
| B3 | `InfographicTemplateServiceV4.test.js` | getTemplate('inexistant') retourne null |
| B4 | `InfographicTemplateServiceV4.test.js` | getTemplate sur manifest invalide → throw + log error |
| B5 | `infographicTemplateControllerV4.test.js` | GET /templates → 200 + shape correcte |
| B6 | `infographicTemplateControllerV4.test.js` | GET /templates/:id existant → 200 + manifest |
| B7 | `infographicTemplateControllerV4.test.js` | GET /templates/:id inexistant → 404 |
| B8 | `infographicTemplateControllerV4.test.js` | GET /templates/INVALID_ID (uppercase) → 400 |

### 7.3 Non-régression

- `cd frontend && npm test` → tous verts (et au moins +13 nouveaux tests)
- `cd backend && npm test` → tous verts hormis les 9 pré-existants flashscore-scraper (DB-required)

---

## 8. Risques & Limitations

| # | Risque | Mitigation |
|---|---|---|
| R1 | Backend lit FS frontend → break si chemin change | Constante `TEMPLATES_DIR` dans le service, calculée via `__dirname` + chemin relatif. Test B1 fail explicite si le dossier n'est plus là. |
| R2 | Manifest invalide en runtime (drift) | Validation Zod côté backend ET côté frontend (registry). Échec côté backend → 500 avec `error: 'manifest_validation_failed'` + détails. |
| R3 | Le composant template lit `resolved.players[0].goals` mais Phase 3 changera la shape | Le `resolverContract` du manifest est la source de vérité. Les tests F10/F11 utilisent des fixtures inline conformes à ce contrat — quand Phase 3 implémente le resolver, les fixtures du test resteront valides ou seront mises à jour de concert. |
| R4 | Visual regression entre variants difficile à vérifier sans œil humain | Tests F12 vérifient juste que la classe `.template-theme--<id>` est appliquée. La validation visuelle finale se fait en Phase 4 via la page de preview. |
| R5 | `MissingDataBadge` overlap visuel sur petits espaces | Tests rendering vérifient juste la présence + sémantique. Le polish UI = Phase 4. |
| R6 | Polices Google Fonts (DM Sans, Outfit, Space Grotesk) | Préchargées via `<link>` dans `index.html`. Sans préchargement → FOIT au screenshot Puppeteer en Phase 4. À ajouter en US3. |

---

## 9. Plan d'implémentation (US)

| US | Titre | Fichiers livrés | Tests |
|---|---|---|---|
| US1 | Manifest schema + registry + 1er manifest | `_schema.js`, `_registry.js`, `player-comparison.json` | F1-F7 |
| US2 | `MissingDataBadge` dans le DS | `MissingDataBadge.{jsx,css,test.jsx,stories.jsx}` | F8-F9 |
| US3 | `PlayerComparisonTemplate` JSX + 3 variants + CSS + Google Fonts | `PlayerComparisonTemplate.{jsx,css,test.jsx}` + patch `index.html` | F10-F12 |
| US4 | Backend service + controller + route | `InfographicTemplateServiceV4.{js,test.js}`, `infographicTemplateControllerV4.{js,test.js}`, `studio_routes.js`, monté dans `v4_routes.js` | B1-B8 |
| US5 | Swagger + non-régression | patch `backend-swagger.yaml` | full `npm test` |
| QA | QA-REPORT V48 | `docs/features/V48-Studio-Infographics-Phase2-Templates/QA-REPORT.md` | — |

**Ordre strict** : US1 → US2 (schema avant DS, DS avant template) → US3 ‖ US4 (parallélisables après US1+US2) → US5 → QA.

---

## 10. Checklist de validation finale (avant merge)

- [ ] Manifest `player-comparison.json` parse via Zod avec 0 warning
- [ ] Les 3 variants rendent visuellement (test F12 vert)
- [ ] `MissingDataBadge` dans le DS, tests verts, story disponible
- [ ] `GET /api/v4/studio/templates` retourne le player-comparison
- [ ] `GET /api/v4/studio/templates/player-comparison` retourne le manifest complet
- [ ] `GET /api/v4/studio/templates/inexistant` retourne 404 propre
- [ ] Frontend `npm test` zéro régression
- [ ] Backend `npm test` zéro régression (hormis les 9 pré-existants)
- [ ] Swagger documenté (2 endpoints)
- [ ] Aucun `??` ou `||` qui pose un fallback de donnée dans la JSX
- [ ] Aucune valeur hardcodée hors `tokens.css` dans la CSS du template
- [ ] QA-REPORT V48 rédigé

---

## 11. Décisions à valider avant code (sign-off)

1. **Localisation des manifests** : `frontend/src/infographic-templates/` (single source of truth, backend lit via FS). OK ?
2. **Scope variants** : on livre les **3** variants en US3 ou on commence par 1 (`dark-observatory`) et on ajoute les 2 autres en suivi ? Recommandation : **3 d'un coup** pour respecter le visual-manifesto et figer le pattern.
3. **`MissingDataBadge` severity levels** : 2 niveaux suffisants (`critical` / `optional`) ? OK comme c'est défini, ou tu veux ajouter `info` ?
4. **Polices** : DM Sans (dark-observatory) + Outfit (editorial) + Space Grotesk (tactical). OK ou tu veux d'autres choix ?
5. **Endpoint summary vs full** : `GET /templates` renvoie un **résumé** (pas le manifest complet) — ça oblige le client à fetch `/templates/:id` quand il veut générer. C'est un round-trip de plus mais ça évite de balader le manifest entier dans les listings. OK ?

Aucun code écrit avant ces 5 OK.
