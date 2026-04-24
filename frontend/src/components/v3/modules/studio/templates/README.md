# Content Templates (V8)

Bibliothèque de templates prêts à l'emploi pour générer du contenu data-driven (visuels social, posts X, stories). Inspirée du Studio (même grammaire) mais **découplée** du Studio Wizard.

> **V8.1 — Hub de création** : les templates sont désormais intégrés à la page `/studio` via **3 onglets** (Idées du jour / Templates / Studio Wizard). Voir la section [Intégration hub Studio](#intégration-hub-studio-v81) en bas de ce fichier.
>
> **V8.2 — Match Preview Studio** : un 4ᵉ onglet `Match Preview` a été ajouté au hub `/studio`, branché sur les endpoints V4 `/v4/content/match-preview/upcoming` et `/v4/content/match-preview/{matchId}`. Le template `match-preview-card` associé est **100 % data BDD (zéro hallucination)** et expose tous les trous de données via le tableau `data_gaps`. Voir [Addendum V8.2 — Match Preview](#addendum-v82--match-preview) en bas de ce fichier.

## Installation (one-time)

Dépendance à installer pour l'export PNG :

```bash
cd frontend && npm install html-to-image
```

Fonts à charger dans `frontend/index.html` (si pas déjà présentes) :

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Fraunces:wght@400;800&family=Inter:wght@400;700&family=Outfit:wght@400;700&family=Sora:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

## Quick start

```jsx
import { DuoComparison } from '@/components/v3/modules/studio/templates';

<DuoComparison aspectRatio="9:16" />   // demo baked-in, Díaz-Olise vs Robben-Ribéry
```

Avec data custom :

```jsx
<DuoComparison
  data={myData}
  theme="noir-gold"
  fontPair="sora-inter"
  aspectRatio="1:1"
  accent="#00E5C4"
/>
```

## Templates disponibles

| ID | Nom | DA par défaut | Use case | WEBM (V8.0) |
|---|---|---|---|---|
| `duo-comparison` | Duo Comparison | `noir-gold` | Duo vs duo (légendes, générations) | ❌ |
| `stat-supremacy` | Stat Supremacy | `editorial` | Un chiffre énorme + ranking | ❌ |
| `race-tracker` | Race Tracker | `dark-observatory` | Course aux points / stats cumulées | ❌ (V8.1) |
| `narrative-grid` | Narrative Grid | `red-alert` | Heatmap saison (KPIs × matchs) | ❌ |
| `power-grid` | Power Grid | `tactical-board` | Power ranking / probas de titre | ❌ |
| `match-preview-card` | Match Preview Card | `dark-observatory` | Infographie J-1 (versus + formes + stats + H2H + ML) — 100% V4, traçable via `data_gaps` | ❌ |

Pour découvrir les templates de manière programmatique :

```js
import { TEMPLATES } from '@/components/v3/modules/studio/templates';
TEMPLATES.forEach((t) => console.log(t.id, t.name, t.defaultTheme));
```

## Directions artistiques

5 DA packagées dans `_shared/themes.js` :

- `dark-observatory` — analytique, glowing accents
- `editorial` — magazine, serif display, haute contraste
- `noir-gold` — duel premium, or sur noir
- `red-alert` — urgence, crise, contrastes durs
- `tactical-board` — grille précise, bleu acier

Chaque thème est overridable au niveau d'un template via `theme="..."`.

## Paires typographiques

5 paires dans `_shared/fontPairs.js`. Chaque DA a une paire par défaut (`THEME_FONT_MAP`), mais on peut override via la prop `fontPair` du template.

## Aspect ratios

Trois ratios supportés, gérés via `TemplateFrame` :

- `9:16` → 1080 × 1920 (stories IG/TikTok)
- `1:1` → 1080 × 1080 (post IG carré)
- `16:9` → 1920 × 1080 (X wide / blog header)

Si un template ne supporte qu'un sous-ensemble, c'est déclaré dans `aspectRatios` du registry.

## Export

### PNG

```js
import { exportNodeToPNG } from '@/components/v3/modules/studio/templates';
const ref = useRef();
// plus tard :
await exportNodeToPNG(ref.current, { filename: 'duo-comparison', pixelRatio: 2 });
```

### WEBM (V8.1 pour la plupart)

Seul `race-tracker` est éligible en V8.0 (SVG animable + captureStream). Pour les autres templates, utilisez l'export PNG puis composez côté externe (After Effects, CapCut, etc.) en attendant `exportHTMLToWEBM` (V8.1).

### Live React

Import simple comme n'importe quel composant — voir "Quick start".

## Data contracts

Chaque template expose un fichier `contract.js` qui décrit la forme attendue des données. La validation est faite en runtime via `assertValid()` (warn en dev, pas de crash user-facing).

Exemple DuoComparison :

```js
{
  title: string,
  subtitle?: string,
  left: { heading, subheading?, members: [{name, role?, portraitUrl?}], stats: [{label, value, unit?}] },
  right: { /* mirror */ },
  verdict?: string,
  footer?: { source?, era? },
}
```

## Brancher le backend V4

Chaque template a un hook dédié (`useXxxBackend`) qui :

1. Appelle `frontend/src/services/api.js` (endpoints V4)
2. Transforme la réponse vers le data contract du template
3. Tombe automatiquement sur `demo.js` si payload vide / erreur réseau

Exemple :

```jsx
import { DuoComparison, useDuoBackend } from '@/components/v3/modules/studio/templates';

function MyPage() {
  const { data, loading, error } = useDuoBackend({
    league: 'Bundesliga',
    season: 2025,
    leftPlayers: ['Díaz', 'Olise'],
    rightPlayers: ['Robben', 'Ribéry'],
  });

  return <DuoComparison data={data} aspectRatio="9:16" />;
}
```

## Ajouter un template

1. Créer `templates/<NomDuTemplate>/` avec : `NomDuTemplate.jsx`, `NomDuTemplate.css`, `contract.js`, `demo.js`, `useNomBackend.js` (optionnel).
2. Ajouter l'entrée dans `TemplateRegistry.js`.
3. Ajouter les exports dans `index.js`.
4. Aucune autre modification du code existant n'est requise.

Le template *doit* :

- Utiliser `<TemplateFrame>` comme racine (garantit dimensions, DA, brand).
- Styliser via les CSS custom properties `--tpl-*` (pas de hex hardcodés dans le JSX ou CSS — utiliser `var(--tpl-bg)`, `var(--tpl-accent)`, etc.).
- Avoir sa propre DA par défaut mais rester overridable via `theme`.
- Gérer les 3 aspect ratios via classes `.template-9x16`, `.template-1x1`, `.template-16x9`.
- Exposer un `forwardRef` pour que le parent puisse capturer le node (export PNG/WEBM).

## Limites V8.0 → V8.1

- WEBM non universel (seul RaceTracker éligible natif — V8.1 généralisera via `html2canvas` + MediaRecorder).
- Pas de page Gallery `/templates` — les templates sont utilisables programmatiquement uniquement. Page à ajouter en V8.1.
- 3 routes backend V4 encore `@STUB` (cf. TSD section 6) : points-trajectory, player-trajectory, team-season-aggregate. Les templates fallback `demo.js` si ces routes manquent.

## Tests

Aucun test unitaire livré en V8.0 — à ajouter en V8.1 via Vitest (rendu snapshot par aspect × thème, validation de contract avec data invalide).

## TSD

Voir `docs/features/V8-Content-Templates/technical-spec.md` pour la spec V8.0 (moteur de templates) et `technical-spec-v8.1-hub.md` pour l'addendum V8.1 (hub Studio).

---

## Intégration hub Studio (V8.1)

À partir de V8.1, la page `/studio` (`ContentStudioV3.jsx`) est un **hub à 3 onglets** :

| Onglet | Composant | Rôle |
|---|---|---|
| **Idées du jour** | `modules/studio/IdeasHub` | Contenus pré-préparés (data V4 + copies FR/EN + hashtags) prêts à publier |
| **Templates** | `modules/studio/TemplatesPlayground` | Playground libre pour explorer chaque template (DA × aspect × accent) |
| **Studio Wizard** | `modules/studio/StudioWizard` | Wizard original (création guidée à partir d'un prompt) |

### Architecture

```
pages/studio/ContentStudioV3.jsx   ← 3-tab shell (Tabs DS component)
    ├─ modules/studio/IdeasHub/
    │   ├─ ideas.js                 ← catalogue des idées (source de vérité)
    │   ├─ useBackendForIdea.js     ← wrapper unifié autour des hooks backend V4
    │   ├─ IdeaCard.jsx             ← carte compacte (rail de gauche)
    │   ├─ IdeaDetail.jsx           ← preview + copies sociales (colonne de droite)
    │   └─ IdeasHub.jsx             ← layout rail + detail
    ├─ modules/studio/TemplatesPlayground/
    │   └─ TemplatesPlayground.jsx  ← rail templates + toolbar (DA/aspect/accent/export)
    └─ modules/studio/templates/    ← (inchangé — moteur de templates V8.0)
```

### Data flow — onglet "Idées du jour"

```
IDEAS[] (ideas.js)
   │
   ├─ idea.templateId      → getTemplate() → Component React + contract
   ├─ idea.theme           → themes[idea.theme] (DA par défaut de l'idée)
   ├─ idea.aspectDefault   → 9:16 | 1:1 | 16:9
   ├─ idea.hookName        → useBackendForIdea() dispatche vers le bon hook V4
   ├─ idea.hookParams      → passés au hook (league, season, players…)
   ├─ idea.demoFallback    → utilisé si data V4 indispo (erreur/empty)
   ├─ idea.copies          → { twitter: { fr: [...], en: [...] }, instagram: {...} }
   └─ idea.hashtags        → liste pré-validée FR+EN
```

### Ajouter une nouvelle idée

1. **Ajouter une entrée dans `IdeasHub/ideas.js`** — respecter la forme :
   ```js
   {
     id: 'slug-kebab-case',          // unique
     status: IDEA_STATUS.DRAFT,       // DRAFT | READY | LIVE
     title: 'Titre court',
     subtitle: 'Angle une ligne',
     hookAngle: 'Émotion / angle éditorial',
     templateId: 'duo-comparison',    // cf. TEMPLATES
     theme: 'noir-gold',              // cf. themes.js
     aspectDefault: '9:16',
     labels: { /* props passées au template — valeurs fixes (titres, era…) */ },
     hookName: 'useDuoBackend',       // nom du hook V4 à appeler
     hookParams: { league, season, leftPlayers, rightPlayers },
     demoFallback: { /* payload minimal respectant le contract du template */ },
     copies: {
       twitter: {
         fr: ['Variante 1', 'Variante 2', 'Variante 3'],
         en: ['Variant 1', 'Variant 2', 'Variant 3'],
       },
       instagram: {
         fr: 'Caption IG FR',
         en: 'IG caption EN',
       },
     },
     hashtags: ['#Foot', '#Stats', '#DataFoot'],
   }
   ```

2. **Si le `hookName` n'existe pas encore**, l'ajouter dans `useBackendForIdea.js` :
   - Importer le hook V4 depuis `templates/<MonTemplate>/useXxxBackend.js`
   - L'appeler **en parallèle des autres** (hook order React) puis dispatcher via le switch

3. **Vérifier que le template ciblé supporte l'aspect choisi** (cf. `TemplateRegistry.js → aspectRatios`).

4. Aucune modification du shell `ContentStudioV3.jsx` nécessaire — l'onglet est data-driven.

### Copies sociales — contrat

- `twitter.fr` / `twitter.en` : **array de 3 variantes** (hook / didactique / punch). L'UI expose un toggle FR↔EN et un bouton "Copier" par variante.
- `instagram.fr` / `instagram.en` : **string** (caption + CTA, sans hashtags).
- `hashtags` : **array plat** — les hashtags sont affichés séparément et copiables en un clic (tous concaténés avec espaces).

### États de données (UI)

Chaque `IdeaDetail` affiche un badge de statut data :

- 🟡 **Chargement…** : hook V4 en cours
- 🟢 **V4 OK** : payload backend valide → rendu avec les vraies data
- 🟠 **V4 indispo — demo** : erreur réseau ou route `@STUB` → fallback sur `demo.js` (ou `demoFallback` de l'idée)

### Export

Identique à V8.0 : bouton "Exporter PNG" dans la toolbar → `exportNodeToPNG(ref, { filename: <ideaId>-<aspect> })`.

### Limites V8.1

- **Pas de persistance** des idées : `ideas.js` est un fichier statique (pas de CRUD depuis l'UI). Pour V8.2 → stocker les idées en DB (`v4.content_ideas`) avec une API admin.
- **Pas de scheduler de publication** : les copies sont prêtes à coller, la publication reste manuelle sur chaque réseau. V8.2+.
- **Un seul hook par idée** : si une idée a besoin de 2 sources de data (ex: duo + bracket), il faut créer un hook dédié qui compose les deux.

---

## Addendum V8.2 — Match Preview

V8.2 livre une **infographie J-1 de match** 100 % sourcée BDD V4 — aucune donnée fabriquée, aucun visuel généré par IA. Le template est utilisable via le nouvel onglet `Match Preview` de `/studio` ou programmatiquement.

### Template `match-preview-card`

Structure affichée (fidèle à ce que renvoie le backend) :

- **Versus** — logos clubs (CDN), nom, classement, forme récente (W/D/L)
- **Stats clés** — buts pour/contre, xG pour/contre, record à domicile/extérieur
- **H2H** — 5 derniers affrontements (V/N/D + score)
- **Prédiction ML** — probabilités 1/X/2 lues depuis `v4.ml_predictions.prediction_json`
- **Meta** — date, compétition, stade, confiance ML
- **`data_gaps`** — badge éditorial listant chaque source manquante (standings, recent_form, xg, home_away_record, h2h, ml_prediction, venue, competition_logo, club_logos)

### Hook backend

```jsx
import { MatchPreviewCard, useMatchPreviewBackend } from '@/components/v3/modules/studio/templates';

function MyPage({ matchId }) {
  const { data, loading, error } = useMatchPreviewBackend({ matchId });
  if (loading) return <Skeleton />;
  if (error) return <p>{error}</p>;
  return <MatchPreviewCard data={data} aspectRatio="9:16" />;
}
```

Le hook consomme `GET /v4/content/match-preview/:matchId` (axios interceptor déjà en place → reçoit directement le DTO). Aucun fallback démo en production : si `data_gaps` n'est pas vide, le template l'affiche sous forme de badge transparent plutôt que de maquiller l'absence de donnée.

### Endpoints V4 (voir `backend-swagger.yaml`)

| Method | Path | Rôle |
|---|---|---|
| `GET` | `/v4/content/match-preview/upcoming` | Liste des matchs à venir (sélecteur du studio) |
| `GET` | `/v4/content/match-preview/{matchId}` | DTO complet validé Zod (request + response) |

Les deux endpoints suivent le wrapper standard `{ success: true, data: ... }` et valident la réponse via `MatchPreviewDTOSchema` / `UpcomingMatchesDTOSchema` **avant envoi** (double validation).

### UI — `MatchPreviewStudio`

`modules/studio/MatchPreviewStudio/` fournit le formulaire de sélection (compétition → match) + toolbar (thème, accent, aspect) + preview live + export PNG. Aligné 1:1 avec `TemplatesPlayground` (mêmes conventions `.mps-*`, DS V3 tokens exclusivement, aucun hex hardcodé).

### Data gaps — contrat

Enum canonique (backend `DataGapSchema` → frontend `GAP_LABELS`) :

| Clé | Libellé UI | Cause |
|---|---|---|
| `standings` | Classements | `StandingsV4Service` n'a rien renvoyé pour la compétition/saison |
| `recent_form` | Forme récente | Moins de 5 matchs joués par le club |
| `xg` | xG | Pas de feed xG disponible pour cette compétition |
| `home_away_record` | Record dom/ext | Pas assez de matchs pour statistiquement stable |
| `h2h` | Historique face-à-face | Première rencontre entre les clubs |
| `ml_prediction` | Prédiction ML | Aucune ligne dans `v4.ml_predictions` pour ce match |
| `venue` | Stade | `match.venue_id` NULL ou `v4.venues` sans entrée |
| `competition_logo` | Logo compétition | `v4.competitions.logo_url` NULL |
| `club_logos` | Logos clubs | Aucun logo actif dans `v4.club_logos` pour un des deux clubs |

### Limites V8.2

- **Pas d'export WEBM** — l'infographie est statique, l'export se fait en PNG pixel-ratio 2 via `exportNodeToPNG()`. Animation éventuelle → V8.3.
- **Pas de scheduling de publication** — les copies FR/EN doivent être ajoutées manuellement ; une intégration `ideas.js` est possible en ajoutant une entrée avec `templateId: 'match-preview-card'` et `hookName: 'useMatchPreviewBackend'`.
- **Pas de cache applicatif** — chaque ouverture de l'onglet refait un appel `/v4/content/match-preview/...`. Acceptable pour un studio éditorial ; si le pattern devient chaud, ajouter un cache côté `ContentStudioV3`.

### TSD & QA

- TSD : `docs/features/V8.2-MatchPreviewCard/technical-spec.md`
- QA-REPORT : `docs/features/V8.2-MatchPreviewCard/QA-REPORT.md`
