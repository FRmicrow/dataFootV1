# QA Report — V47 Studio Infographics · Phase 1 — X.com Trends Scraper

> **Status:** ✅ Phase 1 complete — ready for first live run on dev DB
> **Author:** QA Engineer (rôle assumé)
> **Date:** 2026-04-27
> **Reference:** `docs/features/V47-Studio-Infographics-Phase1-Trends/technical-spec.md`

---

## 1. Sommaire exécutif

V47 Phase 1 livre le pipeline de scraping des trends football X.com qui alimentera le moteur de suggestion d'infographies (Phase 2-3). Tous les composants sont testés en isolation et le contrat Python ↔ Node est verrouillé par un test cross-language. La prochaine étape requiert l'utilisateur : créer le venv, exécuter `login-x-trends.py` une fois, puis lancer un premier scrape live pour valider les sélecteurs DOM réels et regénérer la fixture happy-path.

---

## 2. Périmètre livré

### Code applicatif

| US | Fichier(s) | Rôle |
|---|---|---|
| US1 | `backend/src/migrations/registry/20260427_01_V4_X_Trends.js` | Migration additive : table `v4.x_trends` + 3 index + UNIQUE business key `(trend_label, captured_at::date UTC)` |
| US3 | `backend/src/schemas/v4/trendsSchema.js` | Schémas Zod `TrendItemSchema` + `TrendsPayloadSchema` (refinements anti-doublons) |
| US3 | `backend/scripts/v4/trends/update-x-trends.js` | Writer Node : stdin JSON → upsert transactionnel `v4.x_trends` |
| US2 | `backend/scripts/v4/trends/scrape-x-trends.py` | Scraper Playwright + parser BS4 pur (offline-testable) |
| US2 | `backend/scripts/v4/trends/login-x-trends.py` | Login one-time headful, persiste cookies dans `.x-profile/` |
| US4 | `backend/scripts/v4/trends/run-trends-scraper.py` | Orchestrateur : pre-check → verify → scrape → writer → verify |
| US5 | `backend/scripts/v4/trends/verify-trends-run.py` | Rapport DB read-only (humain + JSON, mode strict) |

### Configuration

| Fichier | Rôle |
|---|---|
| `backend/scripts/v4/trends/requirements.txt` | `playwright==1.49.1`, `beautifulsoup4==4.12.3`, `psycopg2-binary==2.9.10` |
| `backend/scripts/v4/trends/user-agents.txt` | Pool de 5 UAs récents |
| `backend/scripts/v4/trends/README.md` | Procédure install/run/debug complète |
| `.gitignore` | Patché : `.x-profile/`, `.venv/`, `*.lock`, `__pycache__/`, `debug-*.html` |

### Tests + fixtures

| Fichier | Tests |
|---|---|
| `backend/src/schemas/v4/trendsSchema.test.js` | 22 tests Vitest (schéma Zod) |
| `backend/scripts/v4/trends/update-x-trends.test.js` | 8 tests Vitest (writer T1-T8) |
| `backend/scripts/v4/trends/cross-lang.test.js` | 4 tests Vitest (Python ↔ Node round-trip) |
| `backend/scripts/v4/trends/test-parser.py` | 29 tests unittest (parser pur + détecteurs) |
| `backend/scripts/v4/trends/fixtures/x-explore-sports-happy.html` | 5 trends (mixed types) |
| `backend/scripts/v4/trends/fixtures/x-explore-sports-login-wall.html` | Login wall canary |
| `backend/scripts/v4/trends/fixtures/x-explore-sports-no-cards.html` | DOM cassé canary |
| `backend/scripts/v4/trends/fixtures/x-explore-sports-empty-cards.html` | No-trends canary |

---

## 3. Couverture des scénarios de test (TSD §7)

### 3.1 Tests Vitest writer (TSD §7.1)

| # | Scénario | Statut | Fichier |
|---|---|---|---|
| T1 | Payload valide, table vide → INSERT × N, commit | ✅ | `update-x-trends.test.js` |
| T2 | Re-run même payload → UPDATE × N, commit | ✅ | `update-x-trends.test.js` |
| T3 | Doublon trend_label intra-payload → Zod rejette, **aucune** transaction | ✅ | `update-x-trends.test.js` |
| T4 | `rank_position = 0` → Zod rejette | ✅ | `update-x-trends.test.js` |
| T5 | `trend_type = 'person'` → Zod rejette (enum) | ✅ | `update-x-trends.test.js` |
| T6 | `source_url = 'https://twitter.com/...'` → Zod rejette (refinement domaine) | ✅ | `update-x-trends.test.js` |
| T7 | DB error mid-transaction → ROLLBACK + release + re-throw | ✅ | `update-x-trends.test.js` |
| T8 | `--dry-run` → validation + transaction + ROLLBACK (pas COMMIT) | ✅ | `update-x-trends.test.js` |

### 3.2 Canary DOM (TSD §7.2)

| # | Scénario | Statut |
|---|---|---|
| C1 | Fixture happy-path → 5 trends parsées | ✅ Python + Vitest cross-lang |
| C2 | Sélecteur `[data-testid="trend"]` ne match plus → exit 7 (DomStructureError) | ✅ Python + Vitest cross-lang |
| C3 | Cards présentes mais aucun label exploitable → exit 8 (NoTrendsError) | ✅ Python + Vitest cross-lang |

### 3.3 Tests parser (parsing pur Python)

| Catégorie | # tests |
|---|---|
| `_parse_post_count` (K/M/B/comma/singular/empty) | 9 |
| `_infer_trend_type` (hashtag/event-dash/event-vs/event-v/topic) | 7 |
| `detect_login_wall` | 2 |
| `detect_captcha` (iframe + testid) | 3 |
| `parse_trends_from_html` happy + 3 canary | 8 |
| **Total** | **29** |

### 3.4 Tests orchestrateur (US4)

Validés par exécution directe :

| # | Scénario | Code attendu | Code observé |
|---|---|---|---|
| T-A | Profile dir manquant | 6 | ✅ 6 |
| T-B | Cooldown actif (4h restantes) | 9 | ✅ 9 |
| T-C | Lock fichier récent (< 2h) | 10 | ✅ 10 |
| T-D | Stale lock (> 2h) → repris automatiquement | 6 (after takeover) | ✅ 6 + log "Stale lock found" |
| T-E | `verify-trends-run.py` absent → log "skipping" et continue | scraper exit | ✅ 3 (timeout) avec log de skip |

### 3.5 Tests verifier (US5)

Validés par exécution directe :

- `--help` fonctionne sans psycopg2 installé (lazy import) ✅
- Aucune `DATABASE_URL` ou `psycopg2` manquant → exit 3 + message clair ✅
- DB injoignable → exit 3 + message d'erreur lisible ✅
- `render_human()` produit un rapport aligné lisible ✅
- `is_anomaly()` détecte : last_run vieux (> window), 0 ligne dans la fenêtre ✅
- `is_anomaly()` retourne False sur données fraîches ✅

### 3.6 Cross-language Python ↔ Node (US6)

Spawn subprocess Python depuis Vitest sur les 4 fixtures :

| # | Fixture | Exit code Python attendu | Validation Zod | Statut |
|---|---|---|---|---|
| 1 | `x-explore-sports-happy.html` | 0 | 5 trends parsées + round-trip Zod | ✅ |
| 2 | `x-explore-sports-login-wall.html` | 4 | (n/a — error path) | ✅ |
| 3 | `x-explore-sports-no-cards.html` | 7 | (n/a — error path) | ✅ |
| 4 | `x-explore-sports-empty-cards.html` | 8 | (n/a — error path) | ✅ |

---

## 4. Métriques de tests

| Suite | Tests | Statut |
|---|---|---|
| Vitest backend complet | 66 (57 pass + 9 pre-existing fails) | Aucune régression |
| Vitest V47 (schemas + writer + cross-lang) | 34 / 34 | ✅ |
| Python `test-parser.py` | 29 / 29 | ✅ |
| **Total nouveaux tests V47** | **63 / 63** | ✅ |

> **Note sur les 9 échecs pré-existants** : tous dans `tests/flashscore-scraper.test.js`. Ce sont des tests d'intégration qui requièrent une connexion DB live (`db.init()` + queries directes sans mock). Ils échoueraient déjà avant V47 dans le sandbox, et passeraient sur la machine de l'utilisateur où `localhost:5432` est joignable. Aucun rapport avec V47.

---

## 5. Procédures de validation (à exécuter par l'utilisateur)

### 5.1 Migration DB (US1) — DÉJÀ APPLIQUÉE

Confirmé : la table `v4.x_trends` existe avec ses 10 colonnes (id, trend_label, trend_type, rank_position, post_count, captured_at, source_url, raw_payload, created_at, updated_at) et ses 4 index.

### 5.2 Setup local (one-time)

```bash
cd "/Users/domp6/Projet Dev/NinetyXI/dataFootV1/backend/scripts/v4/trends"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
python3 test-parser.py        # → 29 tests OK
```

### 5.3 Login one-time

```bash
source .venv/bin/activate
python3 login-x-trends.py
# → Chromium s'ouvre sur x.com/login → tu te connectes manuellement → ENTRÉE
# → "✅ Login successful. Profile saved to .x-profile"
```

### 5.4 Smoke E2E dry-run

```bash
cd "/Users/domp6/Projet Dev/NinetyXI/dataFootV1/backend"
source scripts/v4/trends/.venv/bin/activate
python3 scripts/v4/trends/run-trends-scraper.py --dry-run --output=/tmp/v47-smoke.json
```

Sortie attendue (extraits) :
- Logs JSON sur stderr : `"V47 trends scraper run starting"` → `"Launching scraper"` → `"Scraper produced payload" trends=N` → `"Launching writer" dry_run=true` → `"X trends upsert simulated"` → `"V47 trends scraper run complete"`
- Sur stdout : `{"inserted":N,"updated":0,...,"dry_run":true}`
- `/tmp/v47-smoke.json` existe et contient le payload validé

### 5.5 Run réel

```bash
python3 scripts/v4/trends/run-trends-scraper.py
```

Vérifier ensuite :

```sql
SELECT COUNT(*), MAX(captured_at) FROM v4.x_trends;
SELECT rank_position, trend_label, trend_type, post_count
  FROM v4.x_trends
 WHERE captured_at::date = CURRENT_DATE
 ORDER BY rank_position
 LIMIT 10;
```

### 5.6 Test idempotence

Re-lancer `run-trends-scraper.py` immédiatement après le run précédent. Le summary writer doit montrer `"updated": N, "inserted": 0` (la business key empêche les doublons intra-jour).

---

## 6. Sécurité

| Item | Statut |
|---|---|
| `.x-profile/` ignoré par git (cookies de session = secret) | ✅ vérifié |
| `.venv/` ignoré par git (300MB de browsers) | ✅ vérifié |
| `chmod 700` sur `.x-profile/` après création | ✅ best-effort dans `login-x-trends.py` |
| Pas de hardcoded credentials dans le code | ✅ DATABASE_URL via env, UAs via fichier externe |
| Parameterized queries uniquement | ✅ writer + verifier |
| Validation Zod systématique avant DB | ✅ writer rejette avant `BEGIN` |
| Pas de bypass captcha | ✅ exit 5 + log + cooldown 6h |

---

## 7. Risques résiduels & follow-ups

| # | Risque | Plan |
|---|---|---|
| R1 | Sélecteurs DOM synthétiques (fixtures non-réelles) | À la première session live, sauvegarder `page.content()` réel et regénérer `fixtures/x-explore-sports-happy.html`. Mettre à jour `SEL_*` constants si différents. |
| R2 | Cookies expirent (~30 jours typique) | `verify-trends-run.py --strict` détecte un last_run vieux. À l'utilisateur de re-lancer `login-x-trends.py`. |
| R3 | Algo de matching trend ↔ joueur/club encore très grossier (verifier §4) | Phase 3 (resolver) ownera la logique précise — c'est expected. |
| R4 | Compte X dédié peut être banni | Documenté README. Solution : créer un autre compte, re-login. |
| R5 | Le `verify` algo ILIKE en O(N×M) avec N=trends (~50/sem) et M=people (~50k) — peut être lent | À monitorer. Si > 5s, indexer ou pré-calculer. Pas un blocker Phase 1. |

---

## 8. Décisions techniques figées

| Décision | Choix retenu | Motivation |
|---|---|---|
| Auth X.com | Session authentifiée headful + compte dédié jetable | Login wall obligatoire, API X payante non souhaitée |
| Cadence | 1 run / semaine + jitter ±2h | Ban risk minimal, 50 lignes/semaine = ~2.6k/an, pas de purge |
| Venv | Dédié `backend/scripts/v4/trends/.venv/` | Isolation Playwright (~300MB browsers) |
| Captcha | Log + exit 5 + cooldown 6h | Phase 1 minimaliste, pas d'alerting runtime |
| Self-heal "rank IS NULL" | Retiré du scope | Schema empêche déjà rank_position NULL — moot |
| Cross-language | Test Vitest spawn subprocess Python | Garantit que les 2 sides ne dérivent pas |

---

## 9. Sign-off

| Role | Item | Statut |
|---|---|---|
| Product Architect | TSD complet et validé | ✅ |
| Backend Engineer | US1, US3, US4, US5 livrées | ✅ |
| Backend Engineer (Python) | US2 livrée + parser pur testable | ✅ |
| QA Engineer | 63 nouveaux tests verts, zéro régression | ✅ |
| DevOps | Cron à câbler (Phase suivante : `statfoot-scheduler`) | ⏸️ Hors scope V47 |
| Security | `.x-profile/` gitignored, queries paramétrées, pas de bypass | ✅ |

**Phase 1 prête au merge** dès que la procédure §5 est exécutée par l'utilisateur sur la dev DB et que les sélecteurs DOM réels sont confirmés.

---

## 10. Suite — vers Phase 2

Phase 2 = système de templates JSON + composants React de rendu + premier template `player-comparison`. Aucune dépendance à V47 pour démarrer Phase 2 — les deux peuvent avancer en parallèle (Phase 2 = lecture seule sur `v4.x_trends` quand elle existera côté UI).

Endpoints à venir (Phase 2-3) :
- `GET /api/v4/studio/trends`        → consume `v4.x_trends`
- `GET /api/v4/studio/templates`     → liste les `infographic-templates/*.json`
- `POST /api/v4/studio/resolve`      → resolver anti-hallucination
- `GET /api/v4/studio/suggestions`   → algo de matching trend ↔ template
