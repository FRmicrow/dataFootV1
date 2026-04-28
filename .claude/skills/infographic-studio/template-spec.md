# Template Specification

Format des templates d'infographie versionnés dans le repo, et leur lifecycle.

---

## Anatomie d'un template

Un template = **2 fichiers couplés** par un `id` partagé :

1. **Le manifest JSON** dans `frontend/src/infographic-templates/<id>.json`
   → décrit le formulaire, les champs requis du resolver, les variants de style
2. **Le composant React** dans `frontend/src/components/v4/infographic/templates/<PascalCase>Template.jsx`
   → le rendu visuel, prend `{ resolved, missing, styleVariant }` en props

Les deux sont **immuables en runtime** : on ne crée pas de templates dynamiquement depuis l'UI. Pour ajouter un template, on commit un nouveau couple JSON+JSX.

**Pourquoi ce choix** : un template c'est du code (JSX) — pas de la donnée. Le mettre en DB ferait du JSX dans une string, ce qui casse le typing, le linting, les tests, et ouvre des XSS.

---

## Schéma JSON du manifest

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
      {
        "id": "player_a_id",
        "type": "player-picker",
        "label": "Joueur A",
        "required": true
      },
      {
        "id": "player_b_id",
        "type": "player-picker",
        "label": "Joueur B",
        "required": true
      },
      {
        "id": "season",
        "type": "season-picker",
        "label": "Saison",
        "required": true,
        "default": "current"
      }
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
      "players[0].photo",
      "players[0].xG",
      "players[0].assists",
      "players[0].minutes_played",
      "players[1].photo",
      "players[1].xG",
      "players[1].assists",
      "players[1].minutes_played"
    ]
  },

  "styleVariants": [
    {
      "id": "dark-observatory",
      "name": "Dark Observatory",
      "description": "Fond sombre, glow analytique, accents néon."
    },
    {
      "id": "editorial",
      "name": "Editorial Sports",
      "description": "Typographie magazine, contraste élevé, fond clair."
    },
    {
      "id": "tactical",
      "name": "Tactical Board",
      "description": "Grille rigoureuse, tons mats, accents tranchés."
    }
  ],

  "outputDimensions": {
    "width": 1200,
    "height": 675,
    "format": "png",
    "dpr": 2
  }
}
```

### Types de champs supportés

| `type` | Composant frontend | Données fournies au resolver |
|--------|-------------------|------------------------------|
| `player-picker` | autocomplete sur `v4.people` | `id` (BIGINT) |
| `club-picker` | autocomplete sur `v4.clubs` | `id` (BIGINT) |
| `match-picker` | sélecteur match récent | `id` (BIGINT) |
| `competition-picker` | dropdown `v4.competitions` | `id` (BIGINT) |
| `season-picker` | dropdown ou input année | string `'2025-26'` ou `'current'` |
| `text` | input texte libre | string (échappée XSS) |
| `number` | input numérique | number |
| `enum` | dropdown sur valeurs énumérées | string |

Si un nouveau type est nécessaire, le créer dans `FormBuilderV4.jsx` **avant** de l'utiliser dans un manifest.

### Validation Zod du manifest

Chaque manifest est validé au boot via :

```js
// frontend/src/infographic-templates/_schema.js
import { z } from 'zod';

export const TemplateManifestSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/),
  version: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['player', 'club', 'match', 'league', 'season']),
  thumbnail: z.string().startsWith('/static/'),
  form: z.object({
    fields: z.array(z.object({
      id: z.string().regex(/^[a-z][a-z0-9_]+$/),
      type: z.enum(['player-picker','club-picker','match-picker','competition-picker','season-picker','text','number','enum']),
      label: z.string(),
      required: z.boolean(),
      default: z.any().optional(),
      enumValues: z.array(z.string()).optional(),
    })),
  }),
  resolverContract: z.object({
    requiredFields: z.array(z.string()),
    optionalFields: z.array(z.string()),
  }),
  styleVariants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  })).min(3),  // 3 variants minimum imposés par le manifeste visuel
  outputDimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.literal('png'),
    dpr: z.number().int().min(1).max(3),
  }),
});
```

---

## Composant React — contrat de props

```jsx
// frontend/src/components/v4/infographic/templates/PlayerComparisonTemplate.jsx
export default function PlayerComparisonTemplate({ resolved, missing, styleVariant }) {
  // resolved : { players: [{name, photo, goals, ...}, {...}] }
  // missing : Array<{ fieldPath, severity, humanLabel }>
  // styleVariant : 'dark-observatory' | 'editorial' | 'tactical'

  const themeClass = `template-theme--${styleVariant}`;

  return (
    <div className={`infographic-canvas ${themeClass}`}>
      {/* render */}
    </div>
  );
}
```

### Règles strictes du composant

1. **Dimensions fixes** : `width: 1200px; height: 675px;` posées en CSS (pas inline `style`)
2. **Pas d'appel API** dans le composant — il reçoit `resolved` déjà prêt
3. **Pas de state local** sauf pour des animations purement décoratives (et même là, attention au render Puppeteer)
4. **Tokens DS uniquement** — voir `visual-manifesto.md`
5. **Polices web** : si une police custom est utilisée, elle doit être préchargée dans `index.html` via Google Fonts. Puppeteer attend `networkidle0` avant screenshot pour que les fonts soient chargées.
6. **Pas de fallback de donnée** : voir `data-contract.md`. Toujours `<MissingDataBadge />` ou la donnée résolue.

---

## Lifecycle d'un template

### Création d'un nouveau template (workflow)

1. Ouvrir une US `[FRONTEND][BACKEND] Template <nom>` (cf. `quality-gate`)
2. Écrire le manifest JSON (`frontend/src/infographic-templates/<id>.json`)
3. Écrire le composant React (`templates/<Name>Template.jsx`) avec les 3 variants de style
4. Ajouter le resolver associé dans `InfographicResolverServiceV4.js` (méthode `resolve<Id>`)
5. Tests :
   - Unit : resolver avec données complètes → `missing.length === 0`
   - Unit : resolver avec données incomplètes → `missing[]` correctement peuplé
   - Visual : rendu de chaque variant avec `tasks/fixtures/<id>-fixtures.json` (fixtures issues d'un dump SQL réel, JAMAIS inventées)
6. QA-REPORT
7. Merge

### Versioning

Si le format d'un template change (champ ajouté, valeur enum modifiée), incrémenter `version` dans le manifest. Les anciens brouillons en DB (`v4.scheduled_tweets.form_values`) sont marqués `template_version` et tagués `outdated` dans l'UI si `version` du manifest > `template_version` du brouillon. L'utilisateur peut alors :
- Migrer le brouillon (ouvre le formulaire prérempli avec les valeurs compatibles)
- Annuler le brouillon

---

## Premier template livré (référence)

Le premier template à livrer est `player-comparison.json` — c'est le cas d'usage cité par l'utilisateur (Mbappé vs Haaland). Il sert de gabarit pour tous les autres.

Templates suivants suggérés (priorité décroissante) :

1. `player-comparison` ← V1
2. `match-recap` (score, top performer, stats clés d'un match récent)
3. `top-scorers` (top 5 buteurs d'une compétition)
4. `league-standings` (classement complet d'une ligue)
5. `club-form` (5 derniers résultats d'un club + forme)
6. `season-milestone` (joueur atteint X buts/passes — calculé à partir de `v4.match_events`)

Chaque template suit la même séquence : JSON + JSX + resolver + tests + QA-REPORT.

---

## Anti-pattern : "template paramétrable à l'extrême"

Ne PAS créer un template "magique" qui affiche n'importe quelle stat de n'importe quelle entité. Chaque template a un sujet précis et une narration visuelle. Trois templates spécialisés > un template générique illisible.

Si l'utilisateur demande "un template qui fait tout", proposer plutôt un **catalogue** de templates ciblés.
