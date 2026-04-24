# TSD — V8.2 : Match Preview Card (Infographie Phare)

**Parent :** `V8.1-Content-Templates/technical-spec-v8.1-hub.md`
**Statut :** Planifié (2026-04-23)
**Auteur :** Product Architect

---

## 1. Contexte & Motivation

V8.0/V8.1 ont livré la bibliothèque de templates + le hub `/studio`. Il manque une **infographie phare** exploitable récurremment — un format "aperçu de match" prêt à poster 24–48h avant chaque affiche.

**Positionnement éditorial (non négociable) :**
- Média **professionnel et fiable**. Zéro sensationalisme.
- **Toutes les stats sortent de la BDD V4**, aucune valeur codée en dur.
- Chaque visuel publie son **état de fraîcheur** + la liste des **données manquantes** (transparence source).

**Business outcome :** toucher l'audience sur le cycle de matchs (top leagues) avec un visuel fiable, instantanément reconnaissable, reproductible en < 30s depuis le studio.

---

## 2. Data Contract (DTO Zod)

### 2.1. `MatchPreviewDTOSchema`

```js
z.object({
  match: z.object({
    match_id: z.string(),                   // BIGINT as string
    competition_id: z.string(),
    competition_name: z.string(),
    competition_logo: z.string().url().nullable(),
    season: z.string(),                     // ex: "2025/2026"
    matchday: z.number().int().nullable(),
    round_label: z.string().nullable(),
    match_date: z.string(),                 // ISO 8601
    kickoff_time: z.string().nullable(),    // "HH:MM" local
    venue_name: z.string().nullable(),
    venue_city: z.string().nullable(),
  }),
  home: ClubBlockSchema,
  away: ClubBlockSchema,
  h2h: z.object({
    last_meetings: z.array(H2HItemSchema).max(5), // DESC par date
    summary: z.object({
      home_wins: z.number().int(),
      draws: z.number().int(),
      away_wins: z.number().int(),
      total: z.number().int(),
    }),
  }).nullable(),                            // null si aucune rencontre connue
  prediction: z.object({
    probs: z.object({
      home_win: z.number().min(0).max(1),
      draw: z.number().min(0).max(1),
      away_win: z.number().min(0).max(1),
    }),
    confidence_score: z.number().min(0).max(1),
    model_name: z.string(),
    created_at: z.string(),                 // ISO
  }).nullable(),                            // null si pas de prédiction ML
  data_gaps: z.array(z.enum([
    'standings', 'recent_form', 'h2h', 'ml_prediction',
    'venue', 'competition_logo', 'club_logos', 'xg',
  ])),
  generated_at: z.string(),                 // ISO, horodatage serveur
});

// ClubBlockSchema
z.object({
  club_id: z.string(),
  name: z.string(),
  short_name: z.string().nullable(),
  logo_url: z.string().url().nullable(),
  primary_color: z.string().nullable(),     // hex ou null
  standings: z.object({
    position: z.number().int(),
    played: z.number().int(),
    points: z.number().int(),
    wins: z.number().int(),
    draws: z.number().int(),
    losses: z.number().int(),
    goals_for: z.number().int(),
    goals_against: z.number().int(),
    goal_diff: z.number().int(),
  }).nullable(),                            // null si 'standings' ∈ data_gaps
  recent_form: z.array(z.enum(['W','D','L'])).max(5), // chronologique ASC (ancien → récent)
  season_xg_avg: z.number().nullable(),     // xG moyen par match
  home_away_record: z.object({              // côté concerné (home pour home, away pour away)
    played: z.number().int(),
    wins: z.number().int(),
    draws: z.number().int(),
    losses: z.number().int(),
    win_rate: z.number().min(0).max(1),
  }).nullable(),
});

// H2HItemSchema
z.object({
  match_id: z.string(),
  date: z.string(),
  competition_name: z.string(),
  home_name: z.string(),
  away_name: z.string(),
  home_score: z.number().int(),
  away_score: z.number().int(),
});
```

### 2.2. Sources V4 par champ

| Champ | Source SQL |
|-------|-----------|
| `match.*` | `v4.matches` JOIN `v4.competitions` JOIN `v4.venues` |
| `home/away.name, logo, primary_color` | `v4.clubs` + `v4.club_logos` (DISTINCT ON) |
| `home/away.standings` | `StandingsV4Service.calculateStandings(competition_id, season)` → find team |
| `home/away.recent_form` | `v4.matches` WHERE club ∈ (home_club_id, away_club_id) AND match_date < target.match_date AND home_score IS NOT NULL ORDER BY match_date DESC LIMIT 5 |
| `home/away.season_xg_avg` | AVG(xg_{side}) sur `v4.matches` saison / équipe |
| `home/away.home_away_record` | Agrégation `v4.matches` saison, filtré side |
| `h2h.*` | `v4.matches` WHERE (home=A AND away=B) OR (home=B AND away=A) AND score NOT NULL ORDER BY match_date DESC LIMIT 5 |
| `prediction` | `v4.ml_predictions` WHERE match_id = ? ORDER BY created_at DESC LIMIT 1 |
| `data_gaps` | Construit dynamiquement côté service à partir des absences |
| `generated_at` | `new Date().toISOString()` |

**Règle d'or :** tout champ manquant → `null` + ajout dans `data_gaps`. **Aucun défaut inventé.** L'UI rend "n/a" et affiche clairement le gap.

---

## 3. API Architecture

### 3.1. Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v4/content/match-preview/:matchId` | Full DTO pour un match donné |
| `GET` | `/api/v4/content/match-preview/upcoming` | Liste des matchs futurs avec filtres (picker du studio) |

### 3.2. `GET /api/v4/content/match-preview/:matchId`

**Response 200 :**
```json
{ "success": true, "data": MatchPreviewDTO }
```

**Response 404 :**
```json
{ "success": false, "error": "Match not found in V4" }
```

**Response 400 :**
```json
{ "success": false, "error": "<Zod issue>" }
```

### 3.3. `GET /api/v4/content/match-preview/upcoming`

**Query :**
- `limit` (int, 1..100, default=50)
- `fromDate` (ISO date, default=today)
- `toDate` (ISO date, default=today + 14j)
- `competitionId` (string, optional)

**Response 200 :**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "match_id": "...",
        "match_date": "...",
        "kickoff_time": "20:45",
        "competition_name": "Premier League",
        "competition_logo": "...",
        "home_name": "Arsenal",
        "home_logo": "...",
        "away_name": "Manchester City",
        "away_logo": "...",
        "venue_name": "Emirates Stadium"
      }
    ]
  }
}
```

Trié par `match_date ASC`. Inclut uniquement les matchs avec `home_score IS NULL AND away_score IS NULL` (= non joué).

---

## 4. UI Blueprint — Template `MatchPreviewCard`

### 4.1. Philosophie visuelle

**Design philosophy :** *Editorial sports — tactical board*. Grille structurée, typographie display forte, accents limités, chiffres au centre de l'attention.

- Dominante sombre (theme `noir-gold` par défaut), aussi compatible `blanc-carbone` et `tactical-blue`.
- Couleurs club via `home.primary_color` / `away.primary_color` (si dispo). Sinon neutre.
- Police display : `Space Grotesk` (distincte des autres templates V8).

### 4.2. Layout 9:16 (1080×1920) — canonique

```
┌────────────────────────────────────────┐
│  Bloc 1 — Header (96px)                │
│  ├─ Logo compétition + nom + matchday  │
│  └─ Date longue + kickoff + venue      │
├────────────────────────────────────────┤
│  Bloc 2 — Confrontation (480px)        │
│  ┌──────────┬────┬──────────┐          │
│  │ Home     │ VS │ Away     │          │
│  │ logo 180 │    │ logo 180 │          │
│  │ name     │    │ name     │          │
│  │ pos #3   │    │ pos #1   │          │
│  └──────────┴────┴──────────┘          │
├────────────────────────────────────────┤
│  Bloc 3 — Forme récente (180px)        │
│  ├─ Home: [W][W][D][L][W] chips        │
│  └─ Away: [W][W][W][W][D] chips        │
├────────────────────────────────────────┤
│  Bloc 4 — Stats comparées (520px)      │
│  ┌─────────┬──────────┬─────────┐      │
│  │ Home    │  Label   │  Away   │      │
│  │ 54 pts  │  Points  │  62 pts │      │
│  │ +28 GD  │  GD      │  +35 GD │      │
│  │ 1.6 xG  │  xG/match│  2.1 xG │      │
│  │ 72%     │ Win rate │  80%    │      │
│  └─────────┴──────────┴─────────┘      │
├────────────────────────────────────────┤
│  Bloc 5 — H2H dernières (240px)        │
│  ├─ 24/11/25 · PL · HOME 2-1 AWAY     │
│  ├─ 12/03/25 · PL · AWAY 0-0 HOME     │
│  └─ 08/10/24 · PL · HOME 3-1 AWAY     │
├────────────────────────────────────────┤
│  Bloc 6 — Prédiction ML (260px)        │
│  ├─ Probas 1-N-2 (barres horizontales) │
│  │   H 42% ▓▓▓▓▓▓░░░░                 │
│  │   N 28% ▓▓▓▓░░░░░░                 │
│  │   A 30% ▓▓▓▓░░░░░░                 │
│  └─ Confiance 73% · modèle v4.2        │
├────────────────────────────────────────┤
│  Bloc 7 — Footer source (120px)        │
│  Données au 23/04/2026 16:32 · V4 ·    │
│  Vérifiées · data_gaps: [ml_prediction]│
└────────────────────────────────────────┘
```

### 4.3. Layout 1:1 (1080×1080) — adaptation

- Blocs compressés : header réduit, stats sur 3 lignes au lieu de 4, footer plus dense.
- Prédiction conservée mais en compact horizontal.

### 4.4. Layout 16:9 (1920×1080) — adaptation

- Layout horizontal : header full-width en haut, confrontation + forme à gauche, stats + H2H + prédiction à droite.

### 4.5. États fallback par bloc

| Bloc | Si donnée absente |
|------|-------------------|
| Header | venue_name absent → "Stade non communiqué" + gap `venue` |
| Confrontation | logo absent → monogramme (1er lettre nom) + gap `club_logos` |
| Forme récente | < 5 matchs historiques → "—" pour chaque slot manquant + gap `recent_form` |
| Stats | standings null → "n/a" sur chaque valeur + gap `standings` |
| H2H | 0 rencontre connue → "Aucune confrontation directe enregistrée." + gap `h2h` |
| Prédiction | null → "Prédiction non disponible" + gap `ml_prediction` |
| Footer | Toujours rendu. Affiche la liste `data_gaps` si non vide. |

**Règle :** aucun bloc ne doit jamais être vide sans indication. Zéro "n/a" silencieux.

---

## 5. Fiabilité — 8 Garanties

1. **Validation Zod côté serveur** avant de renvoyer. Si le DTO construit échoue → 500 + log.
2. **Zéro stat en dur** dans le template (JSX + CSS). Tout passe par `data.*`.
3. **FK Verification** : les 3 parents (match, competitions, clubs) sont vérifiés existants avant agrégation.
4. **data_gaps explicite** : jamais de silence sur une donnée manquante.
5. **generated_at ISO** : horodatage de la génération, affiché dans le footer.
6. **Parameterized queries** : aucune concat SQL.
7. **Pas de hallucination ML** : si pas de `ml_predictions` row → `prediction: null`, point final. Pas d'appel live au service ML ici (le pipeline produit déjà les prédictions en batch).
8. **Pas d'IA générative d'image** : capture HTML via `html-to-image` (identique au reste du studio).

---

## 6. Impact & Risques

- **Nouveau** : routes `/v4/content/match-preview/*`, service `MatchPreviewContentServiceV4`, schéma `contentPreviewSchemas.js`, template `MatchPreviewCard`, module studio `MatchPreviewStudio`, onglet ContentStudioV3.
- **Modifié** : `v4_routes.js` (mount), `templates/index.js` (registry), `ContentStudioV3.jsx` (4e onglet), `backend-swagger.yaml`.
- **Non modifié** : base de données (aucune migration), services V4 existants, templates V8.0, hub V8.1.

**Risques :**
- Perf H2H & recent_form : requêtes par équipe → acceptable pour single-match endpoint, à surveiller si batch.
- Prédiction ML absente en masse → `data_gaps` visible transparent.

---

## 7. Acceptance Criteria

1. `GET /api/v4/content/match-preview/:matchId` retourne un DTO **valide Zod** pour au moins un match réel de la BDD.
2. Si `matchId` inconnu → 404.
3. Le template rend correctement en 9:16 et 1:1 avec données réelles.
4. L'export PNG produit une image 2160×3840 (9:16 @2x) nette, sans transform parasite.
5. Le picker du studio liste les matchs à venir réels (non joués, `home_score IS NULL`).
6. Les `data_gaps` sont visibles dans le footer du visuel ET dans le toolbar du studio (badge).
7. Zéro valeur hardcodée : `grep -n "[0-9]" MatchPreviewCard.jsx` ne révèle que des constantes layout (positions, tailles), jamais des stats.
8. Test unitaire service : happy path + match absent + prédiction absente + H2H vide.

---

## 8. Roadmap d'exécution

1. Backend Zod schemas (`contentPreviewSchemas.js`)
2. Service `MatchPreviewContentServiceV4` + test unitaire
3. Controller `matchPreviewContentControllerV4`
4. Route + mount + Swagger
5. Template `MatchPreviewCard` (JSX + CSS + contract + demo + hook backend)
6. Register dans `templates/index.js` + `TemplateRegistry.js`
7. Module `MatchPreviewStudio` + `MatchListPicker` + `useMatchPreviewData`
8. Onglet ContentStudioV3 (4ᵉ)
9. QA Report + vérification bout en bout

---

**Validation TSD :** implicite par exécution — user demande "réalise la meilleure feature possible".
