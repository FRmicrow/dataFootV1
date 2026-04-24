# TSD — V8.1 : Hub de création de contenu (addendum V8)

**Parent :** `technical-spec.md` (V8.0 — moteur de templates)
**Statut :** Implémenté (2026-04-21)
**Auteur :** Product Architect
**Scope :** Transformation de la page `/studio` en hub à 3 onglets avec contenus pré-préparés prêts à publier.

---

## 1. Contexte & motivation

V8.0 a livré le moteur de templates (5 templates × 5 DA × 3 aspect ratios, export PNG, hooks backend V4). Les templates étaient utilisables **programmatiquement uniquement** — pas de surface UI exposant la bibliothèque aux utilisateurs non-développeurs.

V8.1 comble ce gap :

- La page `/studio` devient un **vrai hub de création de contenu**.
- L'utilisateur choisit une idée du jour, vérifie le rendu (data réelles V4), ajuste DA/aspect/accent, exporte le visuel, et colle les copies FR/EN sur X/Instagram.
- Le Studio Wizard historique reste intact comme 3ᵉ onglet pour la création guidée (prompt → template).

**Objectif business :** réduire le délai *idée → publication* de plusieurs heures à quelques minutes, tout en garantissant que chaque publication repose sur une donnée V4 vérifiable.

---

## 2. UI Blueprint

### 2.1. Shell — `ContentStudioV3.jsx`

```
┌────────────────────────────────────────────────────────────────┐
│  PageHeader                                                    │
│  ├─ title:   "Studio"                                          │
│  ├─ subtitle:"Hub de création de contenu — idées prêtes, …"    │
│  └─ badge:   { label: "CONTENT", variant: "accent" }           │
├────────────────────────────────────────────────────────────────┤
│  Tabs (DS V3 — variant="line")                                 │
│  ┌──────────────┬─────────────┬───────────────┐                │
│  │ Idées du jour│ Templates   │ Studio Wizard │                │
│  └──────────────┴─────────────┴───────────────┘                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  <IdeasHub />  |  <TemplatesPlayground />  |  <StudioWizard /> │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

- Composants réutilisés du DS V3 : `PageLayout`, `PageHeader`, `PageContent`, `Tabs`.
- Contexte `StudioProvider` **préservé** (le Wizard en dépend). Les autres onglets ne l'utilisent pas mais le provider ne coûte rien.
- Onglet par défaut : `ideas` (surface la plus haute valeur pour l'utilisateur final).

### 2.2. Onglet "Idées du jour" — `IdeasHub`

```
┌────────────────┬───────────────────────────────────────────────┐
│  Rail (320px)  │  Detail (1fr)                                 │
│                │                                               │
│  Header        │  ┌─ Preview col ──┬─ Copy col ──────────────┐ │
│  ├─ Eyebrow    │  │ Toolbar        │ Switch FR / EN          │ │
│  ├─ Title      │  │ ├─ DA pills    │ ├─ Tweet 1 + [Copier]   │ │
│  └─ Sub        │  │ ├─ Aspect pills│ ├─ Tweet 2 + [Copier]   │ │
│                │  │ ├─ Accent pick │ ├─ Tweet 3 + [Copier]   │ │
│  IdeaCard[]    │  │ └─ Export PNG  │ ├─ IG caption + [Copier]│ │
│  ├─ Card 1 ●   │  │                │ └─ Hashtags + [Copier]  │ │
│  │  (active)   │  │ Data badge     │                         │ │
│  ├─ Card 2     │  │ ├─ 🟡 Loading  │                         │ │
│  ├─ Card 3     │  │ ├─ 🟢 V4 OK    │                         │ │
│  ├─ Card 4     │  │ └─ 🟠 Demo     │                         │ │
│  └─ Card 5     │  │                │                         │ │
│                │  │ <TemplateFrame>│                         │ │
│  Footer        │  │   (scaled)     │                         │ │
│                │  └────────────────┴─────────────────────────┘ │
└────────────────┴───────────────────────────────────────────────┘
```

- **IdeaCard** : accent coloré propre à la DA, statut (● Prêt / ○ Draft / ◆ Live), nom du template utilisé.
- **Preview** : `TemplateFrame` rendu à l'échelle (9:16 → 240×427, 1:1 → 420×420, 16:9 → 560×315) via `transform: scale()`.
- **Copies** : 3 variantes par langue par idée + caption IG + hashtags. Tout est pré-calculé dans `ideas.js`.

### 2.3. Onglet "Templates" — `TemplatesPlayground`

Playground libre pour explorer un template sans idée attachée (data = demo) :

- Rail de gauche : les 5 templates du registry, avec tags (DA par défaut, aspect par défaut).
- Stage : toolbar (DA / aspect / accent / export) + canvas avec pattern damier pour visualiser les dimensions.

Ce mode est conçu pour les power users (concepteurs de contenu) qui veulent explorer les combinaisons avant de formaliser une idée.

### 2.4. Onglet "Studio Wizard" — `StudioWizard`

**Inchangé.** Le composant existant est monté tel quel. Le `StudioProvider` reste en place.

---

## 3. Data Contracts

### 3.1. `ideas.js` — catalogue d'idées

```js
// IDEA_STATUS = { DRAFT, READY, LIVE }

const IDEAS = [
  {
    id: 'real-madrid-crisis',           // slug unique (kebab-case)
    status: IDEA_STATUS.READY,
    title: 'Real Madrid — saison en crise',
    subtitle: 'Heatmap : buts / défaites / blessures par match',
    hookAngle: 'Drama éditorial + data dense',

    // Template + rendu
    templateId: 'narrative-grid',       // cf. TemplateRegistry
    theme: 'red-alert',                 // cf. _shared/themes.js
    aspectDefault: '9:16',

    // Props fixes (titres, era, labels) — pas de data externe
    labels: {
      title: 'Real Madrid',
      subtitle: 'Saison 2025-26 — 10 premiers matchs',
      kpis: [/* … */],
    },

    // Backend hook — nom du hook + paramètres
    hookName: 'useNarrativeBackend',    // cf. useBackendForIdea.js
    hookParams: { clubId: 12345, season: 2025, limit: 10 },

    // Fallback si la data V4 est indisponible
    demoFallback: { /* payload minimal conforme au contract du template */ },

    // Copies sociales prêtes à publier
    copies: {
      twitter: {
        fr: ['Tweet FR hook', 'Tweet FR didactique', 'Tweet FR punch'],
        en: ['Tweet EN hook', 'Tweet EN didactic', 'Tweet EN punch'],
      },
      instagram: {
        fr: 'Caption IG FR (avec émojis et CTA)',
        en: 'IG caption EN (emoji + CTA)',
      },
    },

    // Hashtags plats (FR+EN mélangés)
    hashtags: ['#RealMadrid', '#Crisis', '#DataFoot', '#LaLiga'],
  },
  // … 4 autres idées (5 au total pour V8.1)
];
```

### 3.2. `useBackendForIdea.js` — dispatcher de hooks

**Contrainte React :** l'ordre des hooks doit être stable entre les rendus → on **appelle les 5 hooks en parallèle**, et on retourne l'état correspondant à `idea.hookName`.

```js
export function useBackendForIdea(idea) {
  const duo = useDuoBackend(idea.hookName === 'useDuoBackend' ? idea.hookParams : null);
  const sup = useSupremacyBackend(idea.hookName === 'useSupremacyBackend' ? idea.hookParams : null);
  const race = useRaceBackend(idea.hookName === 'useRaceBackend' ? idea.hookParams : null);
  const nar = useNarrativeBackend(idea.hookName === 'useNarrativeBackend' ? idea.hookParams : null);
  const pow = usePowerGridBackend(idea.hookName === 'usePowerGridBackend' ? idea.hookParams : null);

  switch (idea.hookName) {
    case 'useDuoBackend':       return duo;
    case 'useSupremacyBackend': return sup;
    case 'useRaceBackend':      return race;
    case 'useNarrativeBackend': return nar;
    case 'usePowerGridBackend': return pow;
    default: return { data: null, loading: false, error: null };
  }
}
```

Chaque hook backend respecte le contract V8.0 : paramètre `null` → pas de fetch → `{ data: null, loading: false }`.

---

## 4. Composants — dépendances

```
ContentStudioV3
├── StudioProvider (inchangé)
├── PageLayout / PageHeader / PageContent (DS V3)
├── Tabs (DS V3)
└── 3 panneaux :
    ├── IdeasHub
    │   ├── IdeaCard (visuel compact)
    │   ├── IdeaDetail
    │   │   ├── useBackendForIdea (dispatcher)
    │   │   ├── TemplateFrame (V8.0)
    │   │   └── exportNodeToPNG (V8.0)
    │   └── ideas.js (catalogue statique)
    ├── TemplatesPlayground
    │   ├── TEMPLATES registry (V8.0)
    │   ├── TemplateFrame (V8.0)
    │   └── exportNodeToPNG (V8.0)
    └── StudioWizard (inchangé)
```

**Aucun nouveau composant du DS V3 n'est introduit.** Toute la nouveauté est dans les modules studio.

---

## 5. Tokens & DA

- Les panneaux hub utilisent **exclusivement** les tokens de `tokens.css` (pas de hex en dur).
- Tokens consommés : `--space-*`, `--color-bg-card`, `--color-bg-card-hover`, `--color-border`, `--color-text-main|muted|dim`, `--color-primary-500|bg`, `--color-danger-500|bg`, `--radius-*`, `--shadow-sm|md`, `--transition-base`, `--focus-ring`, `--font-size-*`, `--font-family-mono`.
- L'accent par idée est porté par une CSS var locale `--ihub-card-accent` (valeur = `theme.accent` du thème de l'idée). Même principe pour `--pill-accent` sur les pills de DA.

---

## 6. Routes API — aucune nouvelle route

V8.1 **ne crée aucun endpoint**. Tous les hooks utilisés (`useDuoBackend`, `useSupremacyBackend`, `useRaceBackend`, `useNarrativeBackend`, `usePowerGridBackend`) sont livrés avec V8.0 et pointent sur des endpoints V4 existants (ou `@STUB` déjà identifiés dans le TSD V8.0 section 6).

Les copies (tweets, captions, hashtags) sont **statiques**, stockées dans `ideas.js`. Pas de génération IA côté serveur en V8.1.

---

## 7. États & edge cases

| Cas | Comportement attendu |
|---|---|
| Idée sans `hookName` | `useBackendForIdea` retourne `{ data: null }` → rendu avec `demoFallback` |
| `hookName` inconnu | Switch fallback → `{ data: null }` + warn console en dev |
| Erreur réseau V4 | `data: null, error: Error` → badge 🟠 "V4 indispo — demo" + rendu `demoFallback` |
| Template ne supporte pas l'aspect choisi | L'onglet Playground filtre les aspect ratios via `template.aspectRatios` |
| Accent picker sans override | `accent = null` → CSS var `--tpl-accent-override` absente → fallback sur theme |
| Copie clavier échouée | Affiche un hint d'erreur 1.8s puis revient à l'état neutre |
| Idée sélectionnée supprimée (reload) | `getIdea()` retourne `null` → UI affiche `.ihub-empty` |

---

## 8. Sécurité

- **Aucune donnée sensible** manipulée côté client dans V8.1.
- Les copies pré-écrites dans `ideas.js` sont relues par QA/PO avant merge (pas de contenu injurieux / non fact-checké).
- Les hashtags sont validés pour éviter les collisions avec des campagnes sensibles.
- Copie presse-papier via `navigator.clipboard` (standard, permission implicite sur interaction user).

---

## 9. Performance

- **Hooks appelés en parallèle** (contrainte React) → overhead accepté ; chaque hook avec `params=null` est no-op (aucun fetch déclenché).
- **`useMemo`** sur `getIdea(selectedId)` et sur le compte de status `ready`.
- **`transform: scale()`** sur `TemplateFrame` pour éviter un re-render quand on change d'aspect (le template lui-même reste à 1080px de large en interne).
- Export PNG : `pixelRatio: 2` → ~2 Mo par image, acceptable pour du social.

---

## 10. Tests à livrer (V8.1 → V8.2)

**V8.1 (livré sans test automatisé — à compléter V8.2) :**
- [ ] TU `ideas.js` : chaque idée respecte la forme minimale (id, templateId, copies.twitter.fr, copies.twitter.en)
- [ ] TU `useBackendForIdea` : dispatch correct par `hookName`, no-op si `null`
- [ ] Rendu : snapshot par idée × aspect (15 combinaisons)
- [ ] E2E Playwright : onglet switch + copie clipboard + export PNG

**Tests manuels V8.1 :**
- [x] Les 3 onglets switchent sans re-mounter le Wizard (vérifier via React DevTools)
- [x] Chaque idée rend un visuel non-vide (demo data minimum)
- [x] Les copies FR/EN sont présentes pour les 5 idées
- [x] L'export PNG génère un fichier `<idea-id>-<aspect>.png`

---

## 11. Migration & déploiement

- **Aucune migration SQL.**
- **Aucun nouveau paquet npm** (html-to-image déjà listé V8.0).
- **Build frontend uniquement.** Pas de changement backend.
- **Rollback plan :** revert du commit qui remplace `ContentStudioV3.jsx` restaure le Wizard standalone.

---

## 12. Livrables V8.1

### Nouveaux fichiers (8)
```
frontend/src/components/v3/modules/studio/
├── IdeasHub/
│   ├── ideas.js
│   ├── useBackendForIdea.js
│   ├── IdeaCard.jsx
│   ├── IdeaDetail.jsx
│   ├── IdeasHub.jsx
│   └── IdeasHub.css
└── TemplatesPlayground/
    ├── TemplatesPlayground.jsx
    └── TemplatesPlayground.css

docs/features/V8-Content-Templates/
└── technical-spec-v8.1-hub.md   (ce document)
```

### Fichiers modifiés (2)
```
frontend/src/components/v3/pages/studio/ContentStudioV3.jsx
    → remplace le mount direct de StudioWizard par un shell à 3 onglets

frontend/src/components/v3/modules/studio/templates/README.md
    → ajoute la section "Intégration hub Studio (V8.1)"
```

### Fichiers inchangés
- `StudioContext.jsx`, `StudioProvider`, `StudioWizard.jsx` et tout le dossier `templates/` (à l'exception du README).

---

## 13. Roadmap V8.2+

- **Persistance des idées** en DB (`v4.content_ideas` — schema additif).
- **Éditeur WYSIWYG** pour créer/éditer une idée depuis l'UI (admin-only).
- **Génération IA des copies** via un endpoint `/v4/content/generate-copies` (LLM wrapper).
- **Export WEBM universel** (cf. limite V8.0).
- **Scheduler de publication** (API X/Instagram + queue interne).
- **Analytics post-publication** (CTR, engagement) branchés sur les IDs exportés.

---

**Last Updated :** 2026-04-21
**Applies To :** `frontend/src/components/v3/pages/studio/*` + `modules/studio/IdeasHub/*` + `modules/studio/TemplatesPlayground/*`
**Severity :** Feature — pas de breaking change
