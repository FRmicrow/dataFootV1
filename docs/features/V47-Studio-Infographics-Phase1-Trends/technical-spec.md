# Technical Spec — V47 Studio Infographics · Phase 1 — X.com Trends Scraper

> **Status:** DRAFT — en attente de validation utilisateur
> **Author:** Product Architect (rôle assumé)
> **Date:** 2026-04-26
> **Phase:** 1 / 5 du pipeline Infographic Studio
> **Pré-requis lus:** `infographic-studio/references/trends-scraper.md`, `infographic-studio/references/architecture.md`, `.claude/rules/data-ingestion-standards.md`, `.claude/rules/visual-manifesto.md` (non-applicable Phase 1), `tasks/lessons.md`

---

## 1. Objectif

Mettre en place le pipeline qui alimente la table `v4.x_trends` à partir des trends football affichés sur `https://x.com/explore/tabs/sports`. Cette table est la **seule source** consommée par l'algo de suggestion d'infographies (Phase 2-3).

**Pas de UI dans cette phase.** L'output utilisateur final est :
- Une table `v4.x_trends` qui se remplit automatiquement (cron 1×/h).
- Un script de vérification CLI qui prouve l'idempotence et la fraîcheur.
- Une suite de tests Vitest verte.

**Pas d'endpoints exposés dans cette phase non plus.** Les endpoints `/api/v4/studio/trends` arrivent en Phase 2 (consumer côté UI).

---

## 2. Scope

### Dans le scope (Phase 1)
- Migration additive `v4.x_trends` + index.
- 4 scripts CLI : `scrape-x-trends.py`, `update-x-trends.js`, `run-trends-scraper.py`, `verify-trends-run.py`.
- Validation Zod du payload JSON intermédiaire.
- Upsert idempotent en transaction.
- Tests unitaires (writer, schémas) + 1 test "canary DOM".
- Test E2E `--dry-run` qui prouve **zéro écriture DB**.
- Script one-time de login X.com (`login-x-trends.py`) — décision validée : session authentifiée headful avec compte X dédié (cf. §11).
- QA-REPORT V47.

### Hors scope (renvoyé aux phases suivantes)
- Endpoints REST `GET /api/v4/studio/trends`, `/templates`, `/resolve`, `/export`, `/tweets/*`.
- Algo de matching trend → joueur/club/match (`v4.people`, `v4.clubs`, `v4.matches`).
- UI `TrendsPanelV4`, `InfographicStudioPageV4`.
- Cron Docker (sera ajouté plus tard via service `statfoot-scheduler`). En Phase 1 : exécution **manuelle** via `python3 backend/scripts/v4/trends/run-trends-scraper.py`. Cadence cible : **hebdomadaire** (1 run / semaine, jitter ±2 h).

### Précédent à NE PAS confondre
`docs/features/V40-StudioFix/` concerne le **Studio Wizard vidéo** (BarChartRace / LineChartRace export). C'est un autre composant, indépendant. V47 = nouveau Studio "Infographic" (PNG statiques pour X.com). Ne pas réutiliser ses tables ni ses controllers.

---

## 3. Data Contract

### 3.1 Migration DB — `20260426_01_V4_X_Trends.js`

```sql
CREATE TABLE IF NOT EXISTS v4.x_trends (
  id            BIGSERIAL PRIMARY KEY,
  trend_label   TEXT        NOT NULL,
  trend_type    TEXT        NOT NULL CHECK (trend_type IN ('hashtag', 'topic', 'event')),
  rank_position INTEGER     NOT NULL CHECK (rank_position BETWEEN 1 AND 50),
  post_count    INTEGER     CHECK (post_count IS NULL OR post_count >= 0),
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_url    TEXT        NOT NULL,
  raw_payload   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business key : un trend par jour-calendaire UTC
CREATE UNIQUE INDEX IF NOT EXISTS uq_x_trends_label_day
  ON v4.x_trends (trend_label, (captured_at::date));

-- Lecture rapide des trends récents (24h)
CREATE INDEX IF NOT EXISTS idx_x_trends_recent
  ON v4.x_trends (captured_at DESC);

-- Filtre rapide par type pour le matching futur
CREATE INDEX IF NOT EXISTS idx_x_trends_type
  ON v4.x_trends (trend_type, captured_at DESC);
```

**Choix d'ingénierie justifiés** :
- **`UNIQUE (trend_label, (captured_at::date))`** plutôt que `(trend_label, captured_at)` strict : un trend peut bouger de rang dans la journée, on update au lieu de dupliquer.
- **`raw_payload JSONB`** : audit trail. On stocke l'objet brut pour pouvoir rejouer le mapping si on ajoute de nouveaux champs plus tard.
- **`updated_at`** : permet de savoir quand un trend a été vu pour la dernière fois sans toucher `captured_at` (qui reste l'instant du **premier** scraping du jour).
- **Migration additive uniquement** — conformément à `protection BDD` rule. Le `down()` fait `DROP TABLE IF EXISTS v4.x_trends CASCADE` mais **ne sera jamais lancé en prod sans accord explicite de l'utilisateur**.

### 3.2 Format JSON intermédiaire (stdout `scrape-x-trends.py` → stdin `update-x-trends.js`)

```json
{
  "captured_at": "2026-04-26T14:32:00Z",
  "source_url": "https://x.com/explore/tabs/sports",
  "scraper_version": "v47.1.0",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/...",
  "trends": [
    { "rank_position": 1, "trend_label": "Mbappé",     "trend_type": "topic",   "post_count": 142000 },
    { "rank_position": 2, "trend_label": "#ElClasico", "trend_type": "hashtag", "post_count": null   },
    { "rank_position": 3, "trend_label": "Real Madrid - Barcelona", "trend_type": "event", "post_count": 86500 }
  ]
}
```

**Inférence `trend_type` côté Python** :
- Préfixe `#` → `hashtag`
- Texte contient un séparateur de match (` - `, ` vs `, ` v `) ET au moins un token capitalisé de chaque côté → `event`
- Sinon → `topic`

(Le matching fin contre `v4.matches` se fera en Phase 2-3 dans le resolver, pas ici. La règle ci-dessus est purement heuristique sur le label brut.)

### 3.3 Schémas Zod (writer Node)

```js
// backend/src/schemas/v4/trendsSchema.js
import { z } from 'zod';

export const TrendItemSchema = z.object({
  rank_position: z.number().int().min(1).max(50),
  trend_label:   z.string().min(1).max(280).trim(),
  trend_type:    z.enum(['hashtag', 'topic', 'event']),
  post_count:    z.number().int().nonnegative().nullable(),
});

export const TrendsPayloadSchema = z.object({
  captured_at:     z.string().datetime({ offset: true }),
  source_url:      z.string().url().refine(u => u.startsWith('https://x.com/'), {
    message: 'source_url must be on x.com domain',
  }),
  scraper_version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  user_agent:      z.string().min(10).max(512),
  trends:          z.array(TrendItemSchema).min(1).max(50),
}).refine(
  (p) => new Set(p.trends.map(t => t.trend_label.toLowerCase())).size === p.trends.length,
  { message: 'Duplicate trend_label inside the same payload' }
).refine(
  (p) => new Set(p.trends.map(t => t.rank_position)).size === p.trends.length,
  { message: 'Duplicate rank_position inside the same payload' }
);
```

**Pourquoi ces refinements** : on rejette **avant** d'écrire en DB un payload avec un même trend dupliqué dans la même journée — c'est le signe d'un scrape buggé qui a parsé deux fois la même tuile DOM.

---

## 4. Architecture des scripts (3 + 1)

### 4.1 Localisation

```
backend/scripts/v4/trends/
├── run-trends-scraper.py        # orchestrateur (Python, lance les autres)
├── scrape-x-trends.py           # Playwright → stdout JSON, ZÉRO DB
├── update-x-trends.js           # stdin JSON → DB (Node, ESM, Zod)
├── verify-trends-run.py         # rapport CLI standalone
├── login-x-trends.py            # one-time : ouvre Chromium headful, attend que l'user se connecte, sauvegarde le profil
├── user-agents.txt              # pool de UAs (one per line)
├── .venv/                       # venv Python dédié — gitignored
└── .x-profile/                  # profil Chromium persistant avec cookies de session — gitignored, chmod 700
```

**Critique sécurité** : le dossier `.x-profile/` contient des cookies de session valides du compte X. À ajouter immédiatement à `.gitignore` (entrée `backend/scripts/v4/trends/.x-profile/`). Sur le serveur de prod, ce dossier est en `chmod 700` et possédé par l'utilisateur du service.

> **Note de placement** : `backend/scripts/` plutôt que `.claude/skills/.../scripts/` parce que ces scripts ont besoin de `pg`, du `logger`, des migrations et du `DATABASE_URL` du backend. Le skill `infographic-studio` reste pédagogique ; le code de prod vit dans le repo applicatif.

### 4.2 Responsabilités strictes

| Script | Langue | Lit | Écrit | Touche DB ? |
|---|---|---|---|---|
| `scrape-x-trends.py` | Python 3.11 + Playwright | x.com (HTTP, profil persistant) | stdout (JSON) | **Non** |
| `update-x-trends.js` | Node ESM | stdin (JSON) | DB + stdout (rapport) | **Oui** (writer) |
| `run-trends-scraper.py` | Python 3.11 | rien | stdout (logs) | Non (lance les autres) |
| `verify-trends-run.py` | Python 3.11 + psycopg | DB | stdout (rapport) | Lecture seule |
| `login-x-trends.py` | Python 3.11 + Playwright | x.com (HTTP headful) | `.x-profile/` (cookies) | Non |

**Cette séparation est non-négociable** : aucun appel réseau dans le writer, aucune écriture DB dans le scraper. Si un script doit faire les deux, c'est qu'on s'est trompé d'architecture.

### 4.3 Flow de l'orchestrateur

```
run-trends-scraper.py
  │
  ├─ pré-check : .x-profile/ existe et contient des cookies non-expirés ?
  │   └─ NON → exit 6 + log "Run login-x-trends.py first"
  │
  ├─ verify-trends-run.py        → snapshot AVANT (compte 7 jours, dernier run)
  │
  ├─ scrape-x-trends.py --profile-dir=.x-profile → JSON sur stdout
  │   │
  │   ├─ retry up to N (--max-retries, default 2)
  │   ├─ jitter aléatoire 0-30s avant chaque tentative
  │   ├─ user-agent piochée dans user-agents.txt
  │   └─ exit 0 = JSON OK ; exit !=0 = pas d'écriture DB
  │
  ├─ self-heal : DELETE FROM v4.x_trends WHERE captured_at::date = TODAY AND rank_position IS NULL
  │
  ├─ update-x-trends.js < <(cat ce_json)   → upsert transactionnel
  │
  └─ verify-trends-run.py        → snapshot APRÈS (delta visible)
```

### 4.3.1 Flow `login-x-trends.py` (one-time)

Lancé une seule fois pour amorcer le profil, puis re-lancé seulement si les cookies expirent (typiquement après 30 jours sans activité).

```
login-x-trends.py
  │
  ├─ ouvre Chromium en mode HEADFUL avec --profile-dir=.x-profile
  ├─ navigue vers https://x.com/login
  ├─ affiche un message : "Connecte-toi à X.com avec le compte dédié, puis tape ENTRÉE dans ce terminal"
  ├─ attend l'input utilisateur (sys.stdin.readline())
  ├─ vérifie qu'on est bien connecté (présence cookie auth_token + redirection /home)
  ├─ ferme proprement le browser (les cookies sont persistés dans .x-profile/)
  └─ exit 0 si succès, 1 sinon
```

Le script affiche en sortie le chemin du profil et la date d'expiration estimée des cookies — l'utilisateur sait ainsi quand re-lancer.

**Échec atomique** : si `scrape-x-trends.py` exit ≠ 0 ou si Zod rejette, **rien n'est écrit**. Le writer retourne `exit 1` et l'orchestrateur exit 1 lui aussi.

### 4.4 Options CLI

#### `run-trends-scraper.py`
| Option | Défaut | Description |
|---|---|---|
| `--dry-run` | `False` | Lance scrape + valide Zod, mais saute l'écriture DB. |
| `--max-retries=N` | `2` | Tentatives max sur le scrape. |
| `--output=PATH` | (rien) | Sauvegarde le JSON intermédiaire à ce chemin (debug). |
| `--user-agent=STR` | (pool) | Force un UA précis. Sinon, choisi aléatoirement dans `user-agents.txt`. |
| `--profile-dir=PATH` | `.x-profile` | Profil Chromium persistant (cookies de session X). |
| `--headful` | `False` | Playwright en mode visible (debug local). En prod : toujours headless. |
| `--verbose` | `False` | Logs DEBUG au lieu de INFO. |

#### `login-x-trends.py`
| Option | Défaut | Description |
|---|---|---|
| `--profile-dir=PATH` | `.x-profile` | Où sauver le profil. |
| `--timeout-min=N` | `10` | Temps max d'attente que l'utilisateur se connecte. |

#### `update-x-trends.js`
| Option | Défaut | Description |
|---|---|---|
| `--dry-run` | `false` | Valide Zod et exécute la transaction puis ROLLBACK au lieu de COMMIT. |
| `--input=PATH` | stdin | Lit depuis un fichier au lieu de stdin. |

#### `verify-trends-run.py`
| Option | Défaut | Description |
|---|---|---|
| `--window-hours=N` | `24` | Fenêtre du rapport. |
| `--strict` | `False` | Exit 1 si dernier run > window-hours OU si total < 5. |

### 4.5 Pattern d'upsert (writer)

Strictement conforme à `data-ingestion-standards.md` :

```js
// pseudo, détail complet en US3
async function upsertTrends(payload) {
  const validated = TrendsPayloadSchema.parse(payload);     // 1. Zod first
  const client = await db.pool.connect();
  let inserted = 0, updated = 0;

  try {
    await client.query('BEGIN');                             // 2. Transaction

    for (const t of validated.trends) {
      const existing = await client.query(
        `SELECT id FROM v4.x_trends
          WHERE trend_label = $1 AND captured_at::date = $2::date`,
        [t.trend_label, validated.captured_at]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE v4.x_trends
             SET rank_position = $1, post_count = $2, raw_payload = $3,
                 trend_type = $4, source_url = $5, updated_at = NOW()
           WHERE id = $6`,
          [t.rank_position, t.post_count, t, t.trend_type, validated.source_url, existing.rows[0].id]
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO v4.x_trends
             (trend_label, trend_type, rank_position, post_count,
              captured_at, source_url, raw_payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [t.trend_label, t.trend_type, t.rank_position, t.post_count,
           validated.captured_at, validated.source_url, t]
        );
        inserted++;
      }
    }

    await client.query('COMMIT');                           // 3. Commit
    logger.info({ inserted, updated, total: validated.trends.length },
                'X trends upserted');
    return { inserted, updated, skipped: 0, errors: 0 };
  } catch (err) {
    await client.query('ROLLBACK');                         // 4. Rollback all-or-nothing
    logger.error({ err }, 'X trends upsert failed — rollback');
    throw err;
  } finally {
    client.release();
  }
}
```

---

## 5. Sélecteurs DOM (à confirmer en exploration manuelle avant US2)

> **Important** : ces sélecteurs sont **fragiles**. La cible est un produit tiers qui change fréquemment. La référence skill propose une base, mais on **doit** ouvrir Chrome/Firefox manuellement sur `https://x.com/explore/tabs/sports` (en navigation anonyme, pas connecté) et capturer les sélecteurs réels avant d'implémenter.

Tentative initiale (à vérifier) :

```python
TREND_CONTAINER_SELECTOR  = '[data-testid="trend"]'
TREND_LABEL_SELECTOR      = 'div[dir="ltr"] span'
TREND_POSTCOUNT_SELECTOR  = 'div:has(> span:contains("posts"))'
TREND_CATEGORY_SELECTOR   = 'div[dir="ltr"]:not(:has(span))'  # "Sports · Trending"
```

**Procédure obligatoire avant US2** :
1. Ouvrir `https://x.com/explore/tabs/sports` en navigation privée (sans login).
2. Si X impose un login wall → escalader à l'utilisateur (cf. §8).
3. Capturer 1 screenshot + le HTML du conteneur de trends.
4. Mettre à jour ce TSD §5 avec les sélecteurs réels.
5. Le test "canary DOM" (US6) lèvera une erreur claire si la structure change ensuite.

---

## 6. API & Intégration (Phase 2+, hors scope ici)

Documenté pour anticiper l'évolution — **ne sera pas implémenté en V47**.

| Méthode | Path | Phase | Service |
|---|---|---|---|
| `GET` | `/api/v4/studio/trends` | 2 | TrendsServiceV4 |
| `GET` | `/api/v4/studio/suggestions` | 3 | TrendsServiceV4 + Resolver |

Le writer V47 met simplement la table `v4.x_trends` dans un état que ces endpoints futurs pourront consommer en lecture seule.

---

## 7. Scénarios de test

### 7.1 Tests unitaires Vitest

Fichier : `backend/scripts/v4/trends/__tests__/update-x-trends.test.js`

| # | Scénario | Attendu |
|---|---|---|
| T1 | Payload valide, table vide | INSERT × N, `inserted: N, updated: 0` |
| T2 | Payload identique relancé | UPDATE × N (rang/postcount potentiellement bougés), `inserted: 0, updated: N` |
| T3 | Payload avec doublon de label dans le même array | Zod rejette, exit 1, **aucune** transaction ouverte |
| T4 | Payload avec `rank_position = 0` | Zod rejette |
| T5 | Payload avec `trend_type = "person"` | Zod rejette (enum) |
| T6 | `source_url = "https://twitter.com/..."` | Zod rejette (refinement domaine) |
| T7 | DB connection drop pendant transaction | ROLLBACK, exit 1, table inchangée |
| T8 | `--dry-run` avec payload valide | Validation OK + transaction puis ROLLBACK, table inchangée |

Fichier : `backend/scripts/v4/trends/__tests__/trends-schema.test.js`
Tests classiques de schéma Zod (15+ cas limites).

### 7.2 Test "canary DOM"

Fichier : `backend/scripts/v4/trends/__tests__/scrape-canary.test.js` (Node mais lance Python via subprocess sur fixture HTML locale).

| # | Scénario | Attendu |
|---|---|---|
| C1 | Fixture HTML "happy path" enregistrée | Parse correctement N trends |
| C2 | Fixture HTML avec sélecteur container manquant | Exit 2 + log clair "DOM structure changed: TREND_CONTAINER_SELECTOR not found" |
| C3 | Fixture HTML avec 0 trend | Exit 3 + log "No trends found, possible empty state" |

### 7.3 Test E2E `--dry-run`

Procédure manuelle documentée dans QA-REPORT :
1. `psql -c "SELECT COUNT(*) FROM v4.x_trends" → N0`
2. `python3 backend/scripts/v4/trends/run-trends-scraper.py --dry-run --output=/tmp/scrape.json`
3. `psql -c "SELECT COUNT(*) FROM v4.x_trends" → N1`
4. **Assert** : `N0 == N1` (zéro écriture)
5. `cat /tmp/scrape.json | jq '.trends | length'` → N ≥ 1

### 7.4 Test idempotence

1. Lancer `run-trends-scraper.py` (sans `--dry-run`) → captures N trends.
2. Re-lancer immédiatement.
3. **Assert** : nombre de lignes ne grandit pas (la business key empêche les doublons).

---

## 8. Risques & Limitations

| # | Risque | Mitigation |
|---|---|---|
| R1 | Cookies de session X expirent | Détection : exit 6 si `.x-profile/` absent ou cookie `auth_token` expiré. Re-lancement manuel de `login-x-trends.py`. Documenté dans QA-REPORT. |
| R1bis | Ban du compte X dédié | **Compte jetable** : utiliser un compte X créé exprès pour ce scraping, pas le compte personnel. Si banni : on en crée un autre, on relance `login-x-trends.py`. Cadence hebdo réduit drastiquement le risque. |
| R2 | X.com change la structure DOM | Test canary (§7.2) déclenche un fail visible. Pas de retry silencieux. Mise à jour manuelle des sélecteurs. |
| R3 | X.com retourne 429 / 403 | Circuit breaker côté orchestrateur : 3 échecs consécutifs → pause 6h (fichier `/tmp/x-scraper-cooldown` avec timestamp). |
| R4 | Captcha ou challenge | Détection : `iframe[src*="captcha"]` ou `data-testid="challenge"`. Exit 5 + WARN dans les logs. **Pas de bypass automatique** (CGU). L'utilisateur regarde les logs si besoin. |
| R5 | Ban IP du serveur | Cadence très basse (**1 run/semaine** + jitter ±2h), pool de 5 UAs, mode headless en prod, headful réservé au dev local. |
| R6 | Run en parallèle qui corrompt la DB | Lock fichier `/tmp/x-scraper.lock` (flock) + check au démarrage de l'orchestrateur. |
| R7 | Saturation table sur le long terme | Avec cadence hebdo : ~50 lignes/semaine × 52 = ~2 600 lignes/an. Aucune purge nécessaire. |
| R8 | Données scrapées corrompues côté Zod | Rollback transaction, exit 1, alerte logs. Aucune écriture partielle. |
| R9 | Différence de fuseau horaire entre serveur et X.com | `captured_at` toujours en UTC (`TIMESTAMPTZ DEFAULT NOW()`). Le bucket "jour" se fait sur `captured_at::date AT TIME ZONE 'UTC'`. |
| R10 | `.x-profile/` committé par erreur | Entrée explicite dans `.gitignore` ajoutée dans US2. Test pre-commit ou hook qui rejette le push si le dossier apparaît dans `git status`. |

**Notice CGU** : ce scraping est explicitement assumé par l'utilisateur (cf. `references/trends-scraper.md`). Tout doit être logué pour pouvoir prouver la cadence basse en cas de question.

---

## 9. Plan d'implémentation (US)

| US | Titre | Fichiers livrés | Tests |
|---|---|---|---|
| US1 | Migration `v4.x_trends` | `backend/src/migrations/registry/20260427_01_V4_X_Trends.js` | Run migration sur DB de dev, vérifier schéma + index + UNIQUE |
| US2 | Scraper Playwright + login | `backend/scripts/v4/trends/scrape-x-trends.py`, `login-x-trends.py`, `user-agents.txt`, venv setup, `.gitignore` patché + fixtures HTML pour tests | Canary DOM C1-C3 + smoke test login |
| US3 | Writer Node + Zod | `backend/scripts/v4/trends/update-x-trends.js` + `backend/src/schemas/v4/trendsSchema.js` | T1-T8 Vitest |
| US4 | Orchestrateur | `backend/scripts/v4/trends/run-trends-scraper.py` | Test E2E dry-run + idempotence |
| US5 | Verifier | `backend/scripts/v4/trends/verify-trends-run.py` | Test exit codes + format de sortie |
| US6 | Suite de tests + CI | `__tests__/*` + ajout au `vitest.config` | Couverture > 80% sur le writer |

**Ordre d'implémentation strict** : US1 → US3 → US2 → US4 → US5 → US6 (le writer avant le scraper permet de tester avec un payload JSON statique avant d'avoir Playwright).

---

## 10. Checklist de validation finale (avant merge)

- [ ] Migration appliquée en dev, `\d v4.x_trends` montre les bons types et contraintes.
- [ ] `run-trends-scraper.py --dry-run` produit un JSON valide sans toucher la DB.
- [ ] `run-trends-scraper.py` (sans flag) ajoute des lignes ; relancé, n'en ajoute pas.
- [ ] `verify-trends-run.py` produit un rapport propre exit 0.
- [ ] `npm test` côté backend passe à 100% (zéro régression).
- [ ] Nouveaux tests `update-x-trends.test.js` et `trends-schema.test.js` couvrent T1-T8.
- [ ] Test canary C1-C3 en place (même si C2/C3 utilisent des fixtures synthétiques).
- [ ] Logs pino structurés (`{inserted, updated, total}`) — pas de `console.log`.
- [ ] Sélecteurs DOM réels confirmés en exploration manuelle et documentés §5.
- [ ] QA-REPORT V47 rédigé avec captures CLI avant/après.
- [ ] Aucun secret committé, aucun `console.*`, aucun fichier `.tmp` ou `node_modules` poussé.

---

## 11. Décisions validées (sign-off partiel)

| # | Question | Décision | Conséquence |
|---|---|---|---|
| Q1 | Stratégie face au login wall X.com | **Session authentifiée headful** | Ajout d'un script `login-x-trends.py` (US2). Compte X dédié jetable. Persistance `.x-profile/`. |
| Q2 | Cadence du cron | **1 run / semaine** (jitter ±2h) | Risque de ban quasi-nul. Volume de données : ~50 trends/semaine. Pas de purge à prévoir. |
| Q3 | Environnement Python | **Venv dédié** `backend/scripts/v4/trends/.venv/` | Isolation propre. `.venv/` ajouté à `.gitignore`. Doc d'install dans le QA-REPORT. |
| Q4 | Comportement captcha | **Log + exit** (minimaliste) | Pas d'alerting Phase 1 — juste pino WARN + exit 5. L'utilisateur regarde les logs s'il s'inquiète. |

### Décisions par défaut (recommandations du TSD, non re-confirmées explicitement, à signaler si tu veux changer)
- **Politique de purge** : on garde tout l'historique de `v4.x_trends` (volume négligeable avec cadence hebdo).
- **User-agents** : fichier `backend/scripts/v4/trends/user-agents.txt`, 5 UAs récents (Chrome/Firefox/Safari macOS+Linux), facile à actualiser sans toucher au code.

---

## 12. Sign-off final — points encore à valider

Avant de passer à US1, j'attends ton OK explicite sur :

- **(a) Le scope §2** (in/out) — confirmer qu'on n'oublie rien et qu'on ne mord pas sur les phases suivantes
- **(b) Le schéma DB §3.1** — types, contraintes, business key `(trend_label, captured_at::date)`, raw_payload JSONB, updated_at
- **(c) L'ordre US1→US6 §9** — particulièrement le choix US3 (writer) avant US2 (scraper) : est-ce que ça te va de coder le writer en premier sur des fixtures JSON statiques ?
- **(d) La localisation `backend/scripts/v4/trends/`** plutôt que `.claude/skills/.../scripts/` — confirmer

Aucun code écrit avant ces 4 OK.
