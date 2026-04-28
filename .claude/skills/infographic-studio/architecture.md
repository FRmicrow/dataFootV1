# Architecture — Infographic Studio

Cette référence donne les détails techniques pour chaque couche. Lire **avant** d'attaquer la phase concernée.

---

## 1. Schéma Base de Données

Tables nouvelles (toutes dans le namespace `v4.*`) — créées via `backend/src/migrations/registry/`.

### `v4.x_trends`

Trends X.com football scrapées. TTL fonctionnel : 24h (les anciennes lignes restent en historique mais l'UI ne montre que `captured_at >= NOW() - INTERVAL '24 hours'`).

```sql
CREATE TABLE v4.x_trends (
  id            BIGSERIAL PRIMARY KEY,
  trend_label   TEXT        NOT NULL,           -- "#Mbappé", "Real Madrid", "El Clásico"
  trend_type    TEXT        NOT NULL,           -- 'hashtag' | 'topic' | 'event'
  rank_position INTEGER     NOT NULL,           -- 1..N dans la liste affichée
  post_count    INTEGER,                        -- volume si Twitter le donne, sinon NULL
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_url    TEXT        NOT NULL,           -- URL Twitter d'où le trend vient
  raw_payload   JSONB,                          -- réponse brute (audit trail)
  CONSTRAINT uq_x_trends_business_key UNIQUE (trend_label, captured_at::date)
);

CREATE INDEX idx_x_trends_recent ON v4.x_trends (captured_at DESC);
```

**Business key** : `(trend_label, captured_at::date)` — un trend peut réapparaître chaque jour, mais une seule fois par jour.

### `v4.scheduled_tweets`

Brouillons de tweets, statuts, et métadonnées de l'infographie associée.

```sql
CREATE TABLE v4.scheduled_tweets (
  id              BIGSERIAL PRIMARY KEY,
  tweet_text      TEXT        NOT NULL,
  template_id     TEXT        NOT NULL,         -- ex: 'player-comparison'
  form_values     JSONB       NOT NULL,         -- les inputs du formulaire (player_id, season, ...)
  style_variant   TEXT        NOT NULL,         -- 'dark-observatory' | 'editorial' | 'tactical'
  png_path        TEXT,                         -- chemin du PNG exporté (NULL tant que pas exporté)
  png_generated_at TIMESTAMPTZ,
  status          TEXT        NOT NULL          -- 'draft' | 'scheduled' | 'posted' | 'cancelled'
                  CHECK (status IN ('draft','scheduled','posted','cancelled')),
  scheduled_for   TIMESTAMPTZ,                  -- date de publication prévue (info utilisateur)
  posted_at       TIMESTAMPTZ,                  -- timestamp réel de publication (rempli quand l'user clique "marquer publié")
  source_trend_id BIGINT REFERENCES v4.x_trends(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tweets_status ON v4.scheduled_tweets (status, scheduled_for);
```

**Note** : `status='posted'` est posé manuellement quand l'utilisateur clique "j'ai publié" dans l'UI. Pas de webhook, pas d'API write.

### Tables lues uniquement (read-only depuis ce module)

- `v4.matches`, `v4.match_stats`, `v4.match_events`, `v4.match_lineups`
- `v4.people`, `v4.club_players`
- `v4.clubs`, `v4.competitions`
- `v4.season_player_stats` (si elle existe — à vérifier via grep avant de l'utiliser)

**Avant d'écrire un resolver** : grep le nom de la table dans `backend/src/migrations/registry/` pour confirmer son existence et son schéma exact.

---

## 2. Backend — Routes V4

Suivre strictement le **V4 Route Pattern** documenté dans `.claude/CLAUDE.md`. Tous les endpoints sont sous `/api/v4/studio/`.

### Structure de fichiers à créer

```
backend/src/
├── routes/v4/
│   └── studio_routes.js          # mount /api/v4/studio/*
├── controllers/v4/
│   ├── trendsControllerV4.js
│   ├── infographicTemplateControllerV4.js
│   ├── infographicResolverControllerV4.js
│   ├── infographicExportControllerV4.js
│   └── tweetDraftControllerV4.js
├── services/v4/
│   ├── TrendsServiceV4.js
│   ├── InfographicTemplateServiceV4.js     # liste les .json du repo (lecture FS, pas DB)
│   ├── InfographicResolverServiceV4.js     # cœur anti-hallucination — lit DB seulement
│   ├── InfographicExportServiceV4.js       # Puppeteer headless
│   └── TweetDraftServiceV4.js              # CRUD v4.scheduled_tweets
└── schemas/v4/
    ├── trendsSchema.js
    ├── infographicSchema.js
    └── tweetDraftSchema.js
```

### Endpoints

| Méthode | Path | Service | Description |
|---------|------|---------|-------------|
| `GET`  | `/api/v4/studio/trends`              | TrendsServiceV4              | Liste trends X.com récents (24h) |
| `GET`  | `/api/v4/studio/templates`           | InfographicTemplateServiceV4 | Liste tous les templates JSON |
| `GET`  | `/api/v4/studio/templates/:id`       | InfographicTemplateServiceV4 | Schéma complet d'un template |
| `POST` | `/api/v4/studio/resolve`             | InfographicResolverServiceV4 | `{ templateId, formValues }` → `{ resolved, missing }` |
| `POST` | `/api/v4/studio/export`              | InfographicExportServiceV4   | `{ templateId, formValues, styleVariant }` → PNG |
| `GET`  | `/api/v4/studio/tweets`              | TweetDraftServiceV4          | Liste brouillons (filtre `?status=`) |
| `POST` | `/api/v4/studio/tweets`              | TweetDraftServiceV4          | Crée un brouillon |
| `PATCH`| `/api/v4/studio/tweets/:id`          | TweetDraftServiceV4          | Édite texte / statut / scheduled_for |
| `DELETE`| `/api/v4/studio/tweets/:id`         | TweetDraftServiceV4          | Soft-delete (status='cancelled') |
| `POST` | `/api/v4/studio/tweets/:id/mark-posted` | TweetDraftServiceV4       | L'utilisateur clique "j'ai publié" → `posted_at = NOW()` |

**Toutes les réponses** : `{ success: true, data: ... }` ou `{ success: false, error: "..." }`.
**Toutes les entrées** : validées via Zod dans le controller (jamais dans le service).
**Logs** : `logger.info()` / `logger.error({ err }, 'context')` — jamais `console.*`.

### Suggestion d'infographies (algo simple)

`GET /api/v4/studio/suggestions` — pas un endpoint critique mais utile.

Logique :
1. Lire les trends 24h récents (`v4.x_trends`)
2. Pour chaque trend, essayer de matcher : nom de joueur (`v4.people`), nom de club (`v4.clubs`), match récent (`v4.matches WHERE match_date > NOW() - 7 days`)
3. Pour chaque match trouvé, proposer un template applicable (`player-comparison` si 2 joueurs en trend, `match-recap` si un match récent, etc.)
4. Renvoyer une liste `{ trendId, templateId, suggestedFormValues, confidence: 0..1 }`

L'utilisateur clique sur une suggestion → l'UI pré-remplit le formulaire avec `suggestedFormValues`.

---

## 3. Frontend — Structure

### Routes (à ajouter dans `App.jsx`)

```
/studio/infographics                 → InfographicStudioPageV4
/studio/infographics/preview/:draftId  → InfographicRenderOnlyPage (utilisé par Puppeteer)
```

`InfographicRenderOnlyPage` est une page **sans navbar, sans layout** — juste l'infographie en plein écran avec dimensions fixes (1200×675 pour Twitter). C'est elle que Puppeteer screenshote.

### Composants

```
frontend/src/components/v4/infographic/
├── InfographicStudioPageV4.jsx           # page principale, layout 3 colonnes
├── TrendsPanelV4.jsx                     # colonne gauche : trends X.com
├── TemplateGalleryV4.jsx                 # sélection du template
├── FormBuilderV4.jsx                     # formulaire dynamique (driven by template JSON)
├── InfographicPreviewV4.jsx              # rendu live (centre)
├── StyleVariantSwitcher.jsx              # 3 boutons radio pour les variants
├── TweetDraftPanelV4.jsx                 # colonne droite : brouillons
├── MissingDataBadge.jsx                  # composant DS — badge "donnée manquante"
└── templates/                            # un .jsx par template
    ├── PlayerComparisonTemplate.jsx
    ├── MatchRecapTemplate.jsx
    ├── LeagueStandingsTemplate.jsx
    └── ...
```

### Templates JSON (versionnés, immuables)

```
frontend/src/infographic-templates/
├── player-comparison.json
├── match-recap.json
├── league-standings.json
├── top-scorers.json
└── club-form.json
```

Format détaillé : voir `template-spec.md`.

---

## 4. Scraper — Structure (Phase 1)

Trois scripts avec séparation stricte Python (scrape, pas de DB) / Node (DB writer) / orchestrateur. Le détail du flux est dans `trends-scraper.md`.

```
.claude/skills/infographic-studio/scripts/
├── run-trends-scraper.py             # orchestrateur (lance le scrape, vérifie, lance le writer)
├── scrape-x-trends.py                # Playwright → JSON stdout
├── update-x-trends.js                # JSON stdin → DB
└── verify-trends-run.py              # rapport d'état (avant/après)
```

**Sémantique d'idempotence** : la business key `(trend_label, captured_at::date)` empêche les doublons jour-même. L'orchestrateur peut tourner toutes les heures sans saturer la table.

**Cadence recommandée** : 1 run / heure via cron Docker (ajouter à `docker-compose.yml` un service `statfoot-scheduler`).

---

## 5. Composants Design System à vérifier

**Avant de créer quoi que ce soit, vérifier l'existence dans `frontend/src/design-system/components/`** :

```bash
ls frontend/src/design-system/components/
grep -rn "Skeleton\|Card\|Badge\|Button\|Tabs" frontend/src/design-system/index.js
```

Composants probablement déjà présents (à utiliser tels quels) : `ds-card`, `ds-button`, `ds-badge`, `ds-skeleton`, `ds-tabs`, `ds-input`, `ds-select`.

Composant à créer s'il n'existe pas (et seulement après vérification) :
- `<MissingDataBadge />` — badge `ds-badge` variant `warning` avec icône ⚠ et texte "Donnée manquante : [champ]"

---

## 6. Sécurité

- **XSS dans les SVG/templates** : le texte utilisateur (form values) doit passer par `escapeHTML` avant injection dans un `<text>` SVG ou un attribut. Voir skill `security/xss-prevention`.
- **SQL injection** : zéro string interpolation. Toujours `db.all(sql, [params])`.
- **Puppeteer DoS** : timeout strict 30s, limite de 3 exports concurrents (queue avec `p-limit` ou similaire).
- **Tweet text** : limiter à 280 caractères côté Zod, pas seulement côté UI.

---

## 7. Tests

Suivre `qa-automation` skill (triple-check) :

- **Unit** (`*.test.js`) : services V4 mockés, schemas Zod validés
- **API contract** : Supertest sur chaque endpoint, vérifier `{ success: true, data }` ou `{ success: false, error }`
- **Non-régression** : un test e2e qui exécute `resolve` sur un template avec données réelles d'une saison passée — si on casse le resolver, ce test rouge

QA-REPORT obligatoire pour chaque phase mergée.
