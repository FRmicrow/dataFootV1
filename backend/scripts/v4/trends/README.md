# V47 — X.com Trends Scraper

Pipeline qui alimente la table `v4.x_trends` à partir des trends football de
[`https://x.com/explore/tabs/sports`](https://x.com/explore/tabs/sports).

## Architecture

```
backend/scripts/v4/trends/
├── login-x-trends.py           # one-time : ouvre Chromium headful, attend la connexion manuelle
├── scrape-x-trends.py          # Playwright headless → JSON sur stdout (ZÉRO DB)
├── update-x-trends.js          # JSON sur stdin → DB (Node, ESM, Zod)
├── run-trends-scraper.py       # orchestrateur (US4 — à venir)
├── verify-trends-run.py        # rapport CLI (US5 — à venir)
├── test-parser.py              # tests unitaires du parser HTML (29 cas)
├── requirements.txt            # deps Python
├── user-agents.txt             # pool de UAs (un par ligne)
├── fixtures/                   # HTML de test (committé)
└── .x-profile/                 # profil Chromium persistant — JAMAIS COMMITÉ
```

Spec complète : `docs/features/V47-Studio-Infographics-Phase1-Trends/technical-spec.md`.

## Setup (à faire une seule fois)

### 1. Créer le venv Python

```bash
cd backend/scripts/v4/trends
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

Le venv pèse ~300 MB (browsers Chromium inclus). Il est gitignored.

### 2. Login one-time avec un compte X dédié

> ⚠️ **Utilise un compte X jetable**, pas ton compte personnel. En cas de ban,
> tu en crées un autre et tu relances ce script.

```bash
source .venv/bin/activate
python3 login-x-trends.py
```

Une fenêtre Chromium s'ouvre sur `https://x.com/login`. Tu te connectes
manuellement, tu reviens dans le terminal, tu tapes ENTRÉE. Les cookies sont
persistés dans `.x-profile/` (chmod 700).

À refaire seulement si :
- Les cookies expirent (typiquement après ~30 jours sans activité)
- Le compte est banni → tu repars d'un compte neuf
- Tu vois `exit code 6` au prochain run

## Usage quotidien

### Scraper + insérer en DB (production)

Cadence cible : **1 run par semaine** (jitter ±2h, géré par l'orchestrateur en US4).

Flux manuel équivalent en attendant l'orchestrateur :

```bash
cd backend
source scripts/v4/trends/.venv/bin/activate
python3 scripts/v4/trends/scrape-x-trends.py \
  | node scripts/v4/trends/update-x-trends.js
```

Sortie attendue (stdout du writer) :
```json
{"inserted":47,"updated":0,"skipped":0,"errors":0,"total":47,"dry_run":false}
```

### Dry-run (validation sans écriture DB)

```bash
python3 scripts/v4/trends/scrape-x-trends.py \
  | node scripts/v4/trends/update-x-trends.js --dry-run
```

### Test offline du parser (sans réseau, sans DB)

```bash
python3 scripts/v4/trends/test-parser.py
# → 29 tests (parsers, détecteurs login wall / captcha, fixtures HTML)
```

### Debug headful + sauvegarde HTML

```bash
python3 scripts/v4/trends/scrape-x-trends.py \
  --headful \
  --save-html=/tmp/x-debug.html \
  > /tmp/x-payload.json
```

## Codes de sortie

### `scrape-x-trends.py`
| Code | Signification | Action |
|---|---|---|
| 0 | Succès | OK |
| 1 | Erreur générique | Lire stderr |
| 2 | Mauvais arguments CLI | Vérifier `--help` |
| 3 | Timeout réseau / Playwright | Réessayer plus tard |
| 4 | Login wall détecté | Re-run `login-x-trends.py` |
| 5 | Captcha / challenge détecté | Patienter (cadence trop élevée ?) |
| 6 | Profil manquant ou cookies expirés | Re-run `login-x-trends.py` |
| 7 | Structure DOM changée | Mettre à jour les sélecteurs en tête du fichier |
| 8 | 0 trend trouvé | Empty state X.com ou parser cassé |

### `update-x-trends.js`
| Code | Signification |
|---|---|
| 0 | Succès (commit ou rollback dry-run) |
| 1 | Erreur validation Zod ou DB |
| 2 | Mauvais arguments CLI |

## Sécurité

- **Cookies dans `.x-profile/`** : équivalent à un mot de passe X. Jamais commité (`.gitignore` patché). En prod : `chmod 700`, propriété de l'utilisateur du service.
- **Pas de bypass captcha** : si X montre un challenge, le scraper exit 5 et logue. C'est ta cadence qui est trop élevée — espace les runs.
- **Compte X jetable** : utilise un compte créé pour ce scraping. Jamais ton compte personnel.

## Sélecteurs DOM — fragiles par construction

Les sélecteurs sont en tête de `scrape-x-trends.py` (`SEL_TREND_CARD`, etc.).
À confirmer **manuellement** la première fois en ouvrant
`https://x.com/explore/tabs/sports` dans Chrome avec DevTools, puis à
re-vérifier à chaque échec `exit 7` (DOM changé).

Le test `test-parser.py` utilise des fixtures synthétiques (`fixtures/*.html`)
basées sur le contrat documenté. **Quand tu confirmes les sélecteurs réels,
remplace ces fixtures par un dump depuis une vraie session x.com**.
