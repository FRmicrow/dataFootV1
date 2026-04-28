# Technical Spec — V49 Studio Infographics · Phase 3 — Resolver de données

> **Status:** DRAFT — en attente de validation utilisateur
> **Author:** Product Architect (rôle assumé)
> **Date:** 2026-04-28
> **Phase:** 3 / 5 du pipeline Infographic Studio
> **Précédents:** V47 (`x_trends`), V48 (templates infrastructure)
> **Pré-requis lus:** `infographic-studio/references/data-contract.md`, `infographic-studio/references/template-spec.md`, `.claude/rules/data-ingestion-standards.md`, `frontend/src/infographic-templates/player-comparison.json`

---

## 1. Objectif

Implémenter le **resolver anti-hallucination** : à partir d'un `(templateId, formValues)`, construire une réponse `{ resolved, missing }` où :
- `resolved` ne contient **que** des données issues de `v4.*` via `db.get/all`
- `missing[]` liste explicitement chaque champ requis ou optionnel qui n'a pas pu être résolu, avec un libellé humain et une sévérité

À la fin de Phase 3 :
- `POST /api/v4/studio/resolve` est appelable et opérationnel pour `player-comparison`
- Le contrat `{ resolved, missing }` produit valide la shape attendue par `PlayerComparisonTemplate.jsx` (V48)
- Aucun fallback hardcodé, aucun mock dans le code livré
- Les missing fields critiques bloqueront l'export PNG en Phase 4 (côté `POST /export`)

---

## 2. Scope

### Dans le scope (Phase 3)
- `InfographicResolverServiceV4` avec `resolve(templateId, formValues)` qui dispatche par template id
- `resolvePlayerComparison(formValues)` — la première implémentation concrète
- Schémas Zod par template pour valider `formValues` (player_a_id, player_b_id, season)
- `infographicResolverControllerV4.js` avec `POST /resolve`
- Mount route dans `studio_routes.js`
- Tests Vitest service + controller (mocks DB)
- Swagger documenté

### Hors scope (renvoyé Phase 4+)
- Form Builder dynamique (`FormBuilderV4`) — Phase 4
- Page Studio complète (`InfographicStudioPageV4`) — Phase 4
- Export PNG (Puppeteer) avec gating sur `missing[].severity === 'critical'` — Phase 4
- Resolvers pour autres templates (`match-recap`, etc.) — futurs
- Cache resolver — Phase 5 si latence problème

---

## 3. Schéma réel (point critique)

Le skill imaginait un schéma `v4.season_player_stats` avec `goals, assists, xg, minutes_played`. **Le schéma réel diffère** :

### `v4.people`
```sql
person_id        BIGINT PRIMARY KEY
full_name        TEXT
person_type      TEXT       -- 'player', 'coach', etc.
nationality_1    TEXT
birth_date       DATE
photo_url        TEXT       -- nullable
source_tm_id     TEXT
source_url       TEXT
```

### `v4.player_season_xg`  (la vraie table de stats)
```sql
id              BIGSERIAL PRIMARY KEY
competition_id  BIGINT NOT NULL REFERENCES v4.competitions
season_label    TEXT   NOT NULL    -- ex: '2025-26'
club_id         BIGINT NOT NULL REFERENCES v4.clubs(club_id)
person_id       BIGINT REFERENCES v4.people    -- nullable pour rows non résolus
player_name     TEXT NOT NULL
-- Volume
apps            SMALLINT
minutes         INTEGER         -- ⚠ pas 'minutes_played'
goals           SMALLINT
npg             SMALLINT
assists         SMALLINT
-- xG totals (additifs cross-comp)
xg              NUMERIC(7,3)
npxg            NUMERIC(7,3)
xa              NUMERIC(7,3)
xg_chain        NUMERIC(7,3)
xg_buildup      NUMERIC(7,3)
-- xG per 90 (NON-additifs cross-comp — moyenner pondéré par minutes si on veut)
xg_90           NUMERIC(6,3)
npxg_90         NUMERIC(6,3)
xa_90           NUMERIC(6,3)
-- ...
UNIQUE(competition_id, season_label, club_id, player_name)
```

### `v4.teams` (parfois aliasée en `v4.clubs` côté FK déclarations)
```sql
team_id            BIGINT PRIMARY KEY
name               TEXT
short_name         TEXT
slug               TEXT
current_logo_url   TEXT
country_id         BIGINT
```

**Conséquence pour le resolver** : les stats d'un joueur sur une saison sont **réparties par `(competition_id, club_id)`**. Si Mbappé joue Liga + UCL, il a 2 lignes dans `player_season_xg` pour 2025-26. On doit **agréger côté resolver**.

---

## 4. Règle d'agrégation cross-competition (DÉCISION CLÉ)

Pour `player-comparison` qui demande des stats "saison" pour un joueur, deux choix :

### Option A — Agréger toutes les compétitions (Recommended)
Le formulaire reste `(player_a_id, player_b_id, season)` (sans competition picker). Le resolver SOMME les stats du joueur sur **toutes ses lignes** dans `player_season_xg` pour le `season_label` donné.

```sql
SELECT
  SUM(apps)        AS apps,
  SUM(minutes)     AS minutes,
  SUM(goals)       AS goals,
  SUM(assists)     AS assists,
  SUM(xg)          AS xg,
  SUM(xa)          AS xa,
  -- Per-90 : moyenne pondérée par minutes
  CASE WHEN SUM(minutes) > 0 THEN SUM(xg) * 90.0 / SUM(minutes) ELSE NULL END AS xg_90
FROM v4.player_season_xg
WHERE person_id = $1 AND season_label = $2
```

**Pros** : UX simple, narration "saison" pertinente
**Cons** : agrège des compétitions hétérogènes (Liga ≠ UCL en niveau xG)

### Option B — Forcer un competition picker dans le formulaire
On ajoute `competition_id` au manifest `player-comparison.json`. Le resolver filtre une seule ligne.

**Pros** : précision factuelle (xG Liga ≠ xG UCL)
**Cons** : alourdit le form, et un joueur qui n'a joué qu'1 comp aura un picker inutile.

### Option C — Agréger par défaut, autoriser un filtre `competition_id` optionnel
Le formulaire garde `(player_a, player_b, season)` mais ajoute `competition_id` **optionnel**. Si fourni, on filtre. Sinon, on agrège.

**Recommandation** : **Option A** pour Phase 3 (plus simple, narration "saison"). Si l'utilisateur voit que c'est trompeur en pratique, on bascule sur C en Phase 4.

À valider §11.

---

## 5. Resolver Pattern — contrat exact

### 5.1 API publique du service

```js
// backend/src/services/v4/InfographicResolverServiceV4.js

/**
 * @param {string} templateId  - 'player-comparison'
 * @param {object} formValues  - { player_a_id, player_b_id, season }
 * @returns {Promise<{ resolved: object, missing: MissingField[] }>}
 *
 * @throws {TemplateNotFoundError}   if templateId is unknown
 * @throws {EntityNotFoundError}     if a referenced entity doesn't exist (e.g. player_a_id)
 * @throws {ZodError}                if formValues is malformed
 *
 * Garanties :
 * - resolved n'utilise QUE db.get/db.all sur v4.* (read-only)
 * - Aucun ?? ou || qui pose un fallback de valeur métier
 * - Chaque champ requis du template absent → entrée dans missing[]
 */
async function resolve(templateId, formValues) { ... }
```

### 5.2 Type `MissingField`

```ts
type MissingField = {
  fieldPath: string;       // 'players[0].xG'
  reason: string;          // technical reason — for debug log
  humanLabel: string;      // FR — to display in MissingDataBadge
  severity: 'critical' | 'optional';
};
```

### 5.3 Shape de `resolved` pour `player-comparison`

```js
{
  season: '2025-26',                     // string (echo du formValues.season)
  players: [
    {
      id: 123,                           // person_id
      name: 'Kylian Mbappé',             // full_name
      photo: 'https://...',              // photo_url, peut être null
      club_name: 'Real Madrid',          // dernier club connu sur la saison
      club_logo: 'https://...',          // current_logo_url du club
      goals: 31,                         // SUM goals cross-comp
      assists: 8,                        // SUM assists
      xG: 28.42,                         // SUM xg
      minutes_played: 2700,              // SUM minutes
      apps: 32,                          // SUM apps
    },
    { ...same for player_b... }
  ]
}
```

### 5.4 Règles de classification missing

| Champ | severity | Quand |
|---|---|---|
| `players[i].name` | `critical` | full_name IS NULL — quasi impossible mais on garde par sécurité |
| `players[i].photo` | `optional` | photo_url IS NULL |
| `players[i].club_name` / `club_logo` | `optional` | aucune ligne `player_season_xg` pour cette saison (jamais joué) |
| `players[i].goals` / `assists` | `critical` | aucune ligne `player_season_xg` pour cette saison |
| `players[i].xG` | `critical` | toutes les lignes ont `xg IS NULL` (la saison existe mais pas de provider xG) |
| `players[i].minutes_played` | `optional` | aucune ligne (= cas critique déjà capturé par goals) ; on évite la sur-redondance |
| `players[i].apps` | `optional` | idem |

**Règle d'or** : on remonte **un seul missing par champ logique**, pas 4 missings si "aucune ligne". Si `players[0].goals` est missing, c'est qu'aucune ligne — donc `goals` (critical), `assists` (optional), `xG` (critical), `minutes/apps` (optional) sont tous absents, mais on rapporte les 5 séparément avec leurs severities respectives. L'UI peut grouper si elle veut.

### 5.5 Erreur dure (404) vs missing[]

- **Joueur inexistant** (`person_id` non trouvé dans `v4.people`) → `throw new EntityNotFoundError('player', player_a_id)` → controller renvoie `404 { success: false, error: 'player_not_found', id }`. Pas un missing field, c'est une 404.
- **Joueur existe mais aucune stat** → resolver retourne `{ resolved: { players: [{ id, name, photo, club_name: null, ...stats: null }] }, missing: [...] }`. C'est du missing data, pas une 404.

---

## 6. Schémas Zod (formValues)

```js
// backend/src/schemas/v4/resolverSchemas.js
import { z } from 'zod';

// Match the season-picker contract: '2025-26', '2024-25', or 'current'
const SeasonLabelSchema = z.string().regex(
    /^(\d{4}-\d{2}|current)$/,
    'season must be "current" or YYYY-YY (e.g. "2025-26")'
);

export const PlayerComparisonFormSchema = z.object({
    player_a_id: z.coerce.number().int().positive(),
    player_b_id: z.coerce.number().int().positive(),
    season:      SeasonLabelSchema,
}).refine(
    (v) => v.player_a_id !== v.player_b_id,
    { message: 'player_a_id and player_b_id must differ' }
);

// Map by template id — used by the dispatcher in resolve()
export const FORM_VALUE_SCHEMAS = {
    'player-comparison': PlayerComparisonFormSchema,
    // 'match-recap': ..., (futur)
};
```

**Résolution de `season = 'current'`** : on prend le `season_label` le plus récent qui contient au moins une ligne pour ce joueur.

```sql
SELECT MAX(season_label) AS season_label
FROM v4.player_season_xg
WHERE person_id = $1
```

Si aucune ligne, on garde `season = 'current'` côté resolved et on remonte `players[i].goals` (critical).

---

## 7. API Contract

### 7.1 `POST /api/v4/studio/resolve`

**Request body** :
```json
{
  "templateId": "player-comparison",
  "formValues": {
    "player_a_id": 123,
    "player_b_id": 456,
    "season": "2025-26"
  }
}
```

**Response 200** :
```json
{
  "success": true,
  "data": {
    "resolved": {
      "season": "2025-26",
      "players": [
        { "id": 123, "name": "Kylian Mbappé", ... },
        { "id": 456, "name": "Erling Haaland", ... }
      ]
    },
    "missing": [
      {
        "fieldPath": "players[0].photo",
        "reason": "photo_url IS NULL in v4.people for person_id=123",
        "humanLabel": "Photo manquante pour Kylian Mbappé",
        "severity": "optional"
      }
    ]
  }
}
```

**Response 400** : Zod validation fail
```json
{ "success": false, "error": "bad_request", "issues": [...] }
```

**Response 404** : entité non trouvée
```json
{ "success": false, "error": "player_not_found", "id": 999 }
```

**Response 422** : templateId inconnu
```json
{ "success": false, "error": "template_not_found", "templateId": "..." }
```

**Response 500** : erreur DB
```json
{ "success": false, "error": "internal_error" }
```

---

## 8. Risques & Limitations

| # | Risque | Mitigation |
|---|---|---|
| R1 | `player_season_xg` ne contient pas le club courant si le joueur a transféré mid-season | On prend le club avec le plus de minutes joués sur la saison (heuristique). Si égalité, le plus récent par `created_at`. Documenté en commentaire SQL. |
| R2 | Agrégation cross-comp masque la diversité (Liga vs UCL xG) | Option A retenue Phase 3, escalade Option C si retour utilisateur. |
| R3 | `season = 'current'` ambigu si différents joueurs ont des dernières saisons différentes | On résout `current` séparément pour chaque joueur. Le `resolved.season` sera celui du `player_a_id`, et un missing prévient si `player_b_id` n'a pas joué cette saison. |
| R4 | xG `NULL` partiel (1 ligne sur 3 a un xG) | Aggregation `SUM(xg)` ignore les NULL côté Postgres. Si **aucune** ligne n'a de xG, `SUM` rend NULL → on remonte `xG` critical. |
| R5 | Performance : 2 SELECT par joueur (people + agg stats) | OK Phase 3. Cache mémoire envisageable Phase 5 si > 200 ms. |
| R6 | Resolver appelé avant que la DB soit synchronisée (latence import Transfermarkt) | Pas de mitigation côté resolver — c'est un signal "données pas encore là", missing[] le révèle. |

---

## 9. Plan d'implémentation (US)

| US | Titre | Fichiers livrés | Tests |
|---|---|---|---|
| US1 | Resolver service player-comparison | `backend/src/services/v4/InfographicResolverServiceV4.js` + `backend/src/services/v4/InfographicResolverServiceV4.test.js` + `backend/src/schemas/v4/resolverSchemas.js` | Service tests (10+ cas) |
| US2 | Controller + route | `backend/src/controllers/v4/infographicResolverControllerV4.js` + `.test.js`. Patch `studio_routes.js`. | Controller tests (8+ cas) |
| US3 | Swagger + non-régression | Patch `backend-swagger.yaml`. Run `npm test`. | Full suite verte |
| QA | QA-REPORT V49 | `docs/features/V49-Studio-Infographics-Phase3-Resolver/QA-REPORT.md` | — |

**Ordre strict** : US1 → US2 → US3 → QA.

---

## 10. Checklist de validation finale (avant merge)

- [ ] `resolve('player-comparison', validForm)` retourne `{ resolved, missing }` valide
- [ ] Joueur inexistant → 404 (pas missing)
- [ ] Joueur existe sans stats → resolved avec stats null + missing[] critical sur goals/xG
- [ ] Photo NULL → missing optional, name présent quand même
- [ ] xG NULL pour toutes lignes → missing critical
- [ ] Aucun `??` ni `||` qui pose une valeur métier dans le service
- [ ] Toutes requêtes SQL parameterized
- [ ] Aucune écriture DB (resolver = read-only, vérifié par grep INSERT/UPDATE/DELETE)
- [ ] Swagger documenté
- [ ] Tests Vitest verts
- [ ] Zéro régression sur la suite complète

---

## 11. Points à valider avant code (sign-off)

1. **Agrégation cross-competition** : Option A (somme cross-comp, Recommended), B (competition_picker obligatoire), ou C (agrégation par défaut + filtre optionnel)
2. **Severity rules** §5.4 : OK avec mes choix (xG critical, photo optional, goals critical, minutes optional) ?
3. **`season = 'current'`** : résolution par joueur (chaque joueur a son current) — OK ?
4. **Erreur dure vs missing** §5.5 : joueur inexistant = 404, joueur sans stats = missing — OK ?
5. **Choix du club courant** §R1 : club avec le plus de minutes sur la saison, tiebreak `created_at` desc — OK ?

Aucun code écrit avant ces 5 OK.
