---
name: flashscore-scraper
description: "Scrapper les résultats de matchs sur Flashscore et les insérer en DB. Utiliser quand des matchs joués n'ont pas encore de score ou de détails (events, lineups, stats) dans v4.matches."
risk: safe
---

## When to use
Déclencher ce skill quand :
- Des matchs joués n'ont pas encore de score dans `v4.matches` (`home_score IS NULL`)
- Des matchs scorés manquent leurs détails (events, lineups, stats)
- On veut alimenter le pipeline ML après un weekend de matchs
- On veut backfiller des données historiques

---

## Architecture

```
run-scraper.py (orchestrateur)
  ├── verify-run.py       → vérifie l'état DB avant et après chaque tentative
  ├── scrape-flashscore-results.py → scrape Flashscore via Playwright (→ stdout JSON)
  └── update-match-results.js      → lit stdin JSON et écrit en DB PostgreSQL
```

**Flux** :
1. `verify-run.py` liste les matchs incomplets
2. `scrape-flashscore-results.py` scrape Flashscore → JSON sur stdout
3. `update-match-results.js` lit stdin → écrit en DB, pose les marqueurs
4. Vérification post-run : si des matchs restent incomplets, retry (jusqu'à `--max-retries`)
5. `repair_empty_markers` réinitialise les marqueurs posés sans données réelles avant chaque tentative (self-healing)
6. `resolve_lineup_player_ids` résout rétrospectivement les `player_id NULL` dans `match_lineups` (noms abrégés Flashscore → `v4.people`)

---

## Dépendances

```bash
cd backend
pip install playwright psycopg2-binary python-dotenv
playwright install chromium
npm install  # pg déjà dans package.json
```

---

## Commande principale

```bash
cd backend

# Run standard (lookback J-15, ligues + coupes)
python3 ../.claude/skills/flashscore-scraper/scripts/run-scraper.py --mode=all --force-tier=1

# Avec une date de départ précise
python3 ../.claude/skills/flashscore-scraper/scripts/run-scraper.py --mode=all --force-tier=1 --since=2026-04-01

# Marquer les matchs introuvables après les retries (évite les boucles infinies)
python3 ../.claude/skills/flashscore-scraper/scripts/run-scraper.py --mode=all --force-tier=1 --mark-unreachable

# Filtrer une seule compétition
python3 ../.claude/skills/flashscore-scraper/scripts/run-scraper.py --mode=update --league=PremierLeague

# Dry-run (aucune écriture DB)
python3 ../.claude/skills/flashscore-scraper/scripts/run-scraper.py --mode=all --dry-run
```

### Options de `run-scraper.py`

| Option | Défaut | Description |
|--------|--------|-------------|
| `--since=YYYY-MM-DD` | J-15 | Date de début du lookback |
| `--mode=update\|discover\|all` | `update` | `update` = ligues pré-importées, `discover` = coupes à créer, `all` = les deux |
| `--force-tier=1` | `1` | Force Tier 1 (Full) sur toutes les compétitions |
| `--max-retries=N` | `3` | Nombre max de tentatives avant abandon |
| `--mark-unreachable` | off | Après max retries, marque les matchs persistants comme "tenté" |
| `--dry-run` | off | Aucune écriture DB — affiche uniquement ce qui serait fait |
| `--league=KEY` | — | Filtre une seule compétition (ex: `PremierLeague`, `SerieA`) |

---

## Vérification standalone

```bash
cd backend

# Rapport d'état sans rien scraper
python3 ../.claude/skills/flashscore-scraper/scripts/verify-run.py --since=2026-04-01

# JSON pour parsing automatique
python3 ../.claude/skills/flashscore-scraper/scripts/verify-run.py --since=2026-04-01 --json
```

---

## Scripts bas-niveau (usage direct déconseillé)

Pour debug ou tests unitaires uniquement. Préférer `run-scraper.py` en production.

```bash
cd backend

# Scraper seul → fichier JSON (debug)
python3 ../.claude/skills/flashscore-scraper/scripts/scrape-flashscore-results.py \
  --mode=all --since=2026-04-01 --output=/tmp/results.json

# Writer seul depuis fichier JSON (debug)
node ../.claude/skills/flashscore-scraper/scripts/update-match-results.js \
  --input=/tmp/results.json --dry-run

# Pipeline direct (sans orchestrateur)
python3 ../.claude/skills/flashscore-scraper/scripts/scrape-flashscore-results.py --mode=all \
  | node ../.claude/skills/flashscore-scraper/scripts/update-match-results.js
```

---

## Système de tiers (dynamique)

Le tier d'une compétition est déterminé automatiquement en début de run :

| Tier | Condition | Données collectées |
|------|-----------|-------------------|
| **Tier 1 (Full)** | La compétition a déjà ≥1 match avec `scraped_events_at IS NOT NULL` cette saison | Score + Stats + Events + Lineups |
| **Tier 2 (Score only)** | Aucun event encore scrapé pour cette saison | Score uniquement |

`--force-tier=1` court-circuite la détection et force Tier 1 sur toutes les compétitions (backfill initial, reprise après erreur).

---

## Marqueurs d'idempotence DB

Posés sur `v4.matches` après chaque write réussi :

| Marqueur | Signification |
|----------|---------------|
| `scraped_score_at` | Score écrit en DB |
| `scraped_stats_at` | Stats de match écrites |
| `scraped_events_at` | Events écrits (ou tentés — `NOT NULL` = "ne plus retenter") |
| `scraped_lineups_at` | Lineups écrits (ou tentés) |

**Sémantique** : `NOT NULL` = "tenté, ne pas retenter". Un match avec `scraped_lineups_at IS NOT NULL` ne sera plus jamais inclus dans un backfill lineups, même si la table `match_lineups` est vide (certains matchs n'ont pas de composition publiée).

**Self-healing** : `repair_empty_markers` (appelé automatiquement à chaque tentative de l'orchestrateur) réinitialise les marqueurs posés sans données réelles :
- Réinitialise `scraped_lineups_at` si `match_lineups` est vide pour ce match
- Réinitialise `scraped_events_at` si `match_events` est vide ET le match a eu des buts (un match sans buts peut légitimement n'avoir aucun event)

---

## Déduplication

- **Ligues** (`action=update`) : filtre `WHERE scraped_score_at IS NULL` — un match déjà marqué est ignoré
- **Coupes** (`action=insert`) : vérification par `(match_date, home_club_id, away_club_id)` :
  - Existe + scoré → ignoré
  - Existe + pas scoré → UPDATE du score
  - N'existe pas → INSERT
- **Lineups** : `INSERT ... WHERE NOT EXISTS (match_id, club_id, side, player_name IS NOT DISTINCT FROM ?)` — NULL-safe

---

## Compétitions supportées

### Ligues (`--mode=update` ou `--mode=all`)
| Clé | Compétition |
|-----|-------------|
| `PremierLeague` | Premier League (Angleterre) |
| `Championship` | Championship (Angleterre) |
| `Ligue1` | Ligue 1 (France) |
| `Ligue2` | Ligue 2 (France) |
| `SerieA` | Serie A (Italie) |
| `SerieB` | Serie B (Italie) |
| `LaLiga` | LaLiga (Espagne) |
| `LaLiga2` | LaLiga 2 (Espagne) |
| `Bundesliga` | Bundesliga (Allemagne) |
| `2Bundesliga` | 2. Bundesliga (Allemagne) |
| `LigaPortugal` | Liga Portugal |
| `Eredivisie` | Eredivisie (Pays-Bas) |

### Coupes (`--mode=discover` ou `--mode=all`)
| Clé | Compétition |
|-----|-------------|
| `ChampionsLeague` | UEFA Champions League |
| `EuropaLeague` | UEFA Europa League |
| `ConferenceLeague` | UEFA Conference League |
| `FACup` | FA Cup (Angleterre) |
| `CoupeDeFrame` | Coupe de France |
| `CopadelRey` | Copa del Rey (Espagne) |
| `DFBPokal` | DFB-Pokal (Allemagne) |
| `CoppaItalia` | Coppa Italia |
| `TacaDePortugal` | Taça de Portugal |
| `KNVBCup` | KNVB Cup (Pays-Bas) |

---

## Données insérées

### `v4.matches`
- `home_score`, `away_score` — score final
- `scraped_score_at`, `scraped_stats_at`, `scraped_events_at`, `scraped_lineups_at` — marqueurs d'idempotence

### `v4.match_stats` (par période : FT / 1H / 2H)
- `home_score_ht`, `away_score_ht` — score mi-temps
- `home_poss_*`, `away_poss_*` — possession (%)
- `home_shots_*`, `away_shots_*` — tirs totaux
- `home_shots_ot_*`, `away_shots_ot_*` — tirs cadrés
- `home_shots_off_*`, `away_shots_off_*` — tirs non cadrés
- `home_corners_*`, `away_corners_*` — corners
- `home_yellows_*`, `away_yellows_*` — cartons jaunes

### `v4.match_events` (timeline)
- Types : but normal / contre-son-camp / penalty, carton jaune / rouge / jaune-rouge, remplacement
- `minute_label`, `side` (home/away), `score_at_event`
- `player_id` résolu via `v4.people` (NULL si inconnu, fallback dans `detail`)

### `v4.match_lineups` (compositions)
- `side` (home/away), `is_starter` (titulaire = true, remplaçant = false)
- `jersey_number`, `position_code` (G/D/M/A)
- `player_name` — nom brut extrait du DOM Flashscore (span `wcl-name` pour titulaires, `img[alt]` pour entrants)
- `player_id` résolu via `v4.people` avec matching multi-stratégie :
  1. Nom complet exact (`ILIKE`)
  2. Format abrégé `Nom I.` → word-boundary regex + initiale du prénom
  3. Nom seul → recherche comme nom de famille (`% Nom`)

  Taux de résolution typique : 88–98% selon la compétition. Les non-résolus (`player_id IS NULL`) sont des joueurs absents de `v4.people`.

---

## Notes techniques

### Fuseau horaire
Les `match_date` en DB sont stockés en UTC. Flashscore affiche les dates en heure de Paris. Toutes les comparaisons de dates utilisent `AT TIME ZONE 'Europe/Paris'` pour éviter les décalages de minuit (ex: match à 22h UTC = J+1 à Paris).

### BIGINT et JavaScript
Les identifiants PostgreSQL (`match_id`, `club_id`, `competition_id`, `person_id`) sont des BIGINT 64 bits. JavaScript `Number` ne peut représenter que 53 bits avec précision. Toutes les lectures de ces colonnes en JS utilisent des casts `::text` pour éviter la troncature silencieuse.

### Matching d'équipes
Le matching équipe Flashscore ↔ DB est basé sur les alias (`TEAM_ALIASES`) + distance de Levenshtein. Les noms inconnus sont loggués en WARN. Les matchs introuvables après `--max-retries` peuvent être marqués via `--mark-unreachable`.

---

## Limitations
- Lookback de **15 jours** par défaut — surcharger avec `--since`
- Respecter les CGU Flashscore — ne pas lancer à haute fréquence automatique
- Les stats détaillées nécessitent un Flashscore match ID extrait du DOM — si absent, seul le score est inséré
- Certains matchs de coupes très précoces peuvent ne pas encore avoir leurs lineups publiées sur Flashscore
