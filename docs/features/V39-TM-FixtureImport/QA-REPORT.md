# QA Report — V39 TM-FixtureImport

**Date** : 2026-03-25
**Branche** : `feature/V39-TM-FixtureImport`
**QA Engineer** : qa-runner (claude-sonnet-4-6)

---

## 1. Build Docker

Non exécuté dans cette session (stack déjà up depuis 2h+ pour frontend/backend, 7 jours pour DB). Statut des conteneurs au moment du QA :

| Conteneur | Statut |
|---|---|
| statfoot-db | Up 7 days |
| statfoot-backend | Up 15 minutes |
| statfoot-frontend | Up 2 hours |
| statfoot-ml-service | Up 2 hours |

---

## 2. Vérification de la migration DB

**Statut : OK**

Colonnes vérifiées avec `psql -U statfoot_user -d statfoot` :

### V3_Fixtures
| Colonne | Type | Défaut | Contrainte |
|---|---|---|---|
| api_id | integer | — | NULLABLE (migration OK) |
| data_source | text | 'api_football' | — |
| tm_match_id | text | — | UNIQUE WHERE NOT NULL |
| home_logo_url | text | — | — |
| away_logo_url | text | — | — |

Index créés : `idx_v3_fixtures_api_id_notnull`, `idx_v3_fixtures_tm_match_id`, `idx_v3_fixtures_external_id`

### V3_Teams
- `data_source` : text, défaut `'api-sports'` — OK

### V3_Fixture_Events
- `data_source` : text, défaut `'api-sports'` — OK

---

## 3. Dépendances Python

**Statut : OK**

`pip3 install -r scripts/requirements.txt` — toutes les dépendances déjà présentes (psycopg2, tqdm, unidecode, python-dotenv).

---

## 4. Dry-run — Bundesliga 2009-2010

**Statut : OK**

```
DRY-RUN mode — no writes to database
Processing bundesliga/2009-2010 — 306 files
Import complete: Files read: 306 | Fixtures inserted: 0 | Fixtures enriched: 306 | Fixtures skipped: 0 | Events inserted: 0 | Teams created: 0 | Errors: 0
```

306 fichiers parsés, 0 erreur de parsing, aucune écriture.

---

## 5. Import réel — Bundesliga 2009-2010

**Statut : OK**

```
Import complete: Files read: 306 | Fixtures inserted: 0 | Fixtures enriched: 306 | Fixtures skipped: 0 | Events inserted: 3632 | Teams created: 0 | Errors: 0
```

**Comportement constaté et validé** : Les 306 fixtures Bundesliga 2009-2010 étaient déjà présentes en base avec `data_source='engsoccerdata'`. Le script les a correctement enrichies (tm_match_id + logos) sans créer de doublons. Aucun `INSERT` de fixture, 3632 events TM insérés.

**Preuve de l'enrichissement :**
```sql
SELECT COUNT(*) FROM V3_Fixtures
WHERE league_id = 19 AND season_year = 2009 AND tm_match_id IS NOT NULL;
-- Résultat : 306
```

---

## 6. Counts en DB

| Métrique | Valeur |
|---|---|
| Fixtures data_source='api_football' | 630 620 |
| Fixtures data_source='engsoccerdata' | 64 403 |
| Fixtures data_source='transfermarkt' | 216 209 |
| Fixtures data_source='oddsportal' | 12 529 |
| Events data_source='transfermarkt' | 1 247 961 |
| Fixtures api_football enrichies avec tm_match_id | 798 |

---

## 7. Taux de matching (fixtures TM-only vs API-Football)

**Statut : OK — comportement conforme**

```sql
SELECT matched_with_api, tm_only, match_rate_pct
FROM (
  SELECT
    COUNT(*) FILTER (WHERE api_id IS NOT NULL) AS matched_with_api,
    COUNT(*) FILTER (WHERE api_id IS NULL) AS tm_only,
    ROUND(...) AS match_rate_pct
  FROM V3_Fixtures WHERE data_source = 'transfermarkt'
);
-- matched_with_api=0, tm_only=216209, match_rate_pct=0.0
```

Le champ `api_id` sur les fixtures `transfermarkt` est toujours NULL : le matching se fait dans le sens inverse (les fixtures `api_football` recoivent un `tm_match_id`). 798 fixtures `api_football` ont été enrichies avec un `tm_match_id`.

---

## 8. Test d'idempotence (second run)

**Statut : OK (DB stable, comportement documenté)**

Second run — output du script :
```
Import complete: Files read: 306 | Fixtures inserted: 0 | Fixtures enriched: 306 | Fixtures skipped: 0 | Events inserted: 3632 | Teams created: 0 | Errors: 0
```

**Note** : Le compteur `Events inserted` affiche 3632 au second run (non zéro). C'est dû à la stratégie intentionnelle DELETE+INSERT dans `_insert_events` (ligne 514 du script) qui supprime les events TM existants avant de les réinsérer pour permettre la mise à jour des champs (notamment `side`). Le count en DB est stable avant/après le second run :

```
1 247 961 events TM (avant 2e run) = 1 247 961 events TM (après 2e run)
```

La DB est idempotente. Seul le compteur du script est trompeur sur ce point.

---

## 9. Tests backend

**Statut : 110/110 PASS**

```
Test Files  14 passed (14)
     Tests  110 passed (110)
  Duration  725ms
```

Fichiers testés :
- probabilityService.test.js (19 tests)
- SearchRepository.test.js (6 tests)
- LeagueRepository.test.js (7 tests)
- StatsEngine.test.js (9 tests)
- ResolutionService.test.js (11 tests)
- api/dashboard.test.js (6 tests)
- fuzzy.test.js (17 tests)
- smoke.test.js (1 test)
- sqlHelpers.test.js (5 tests)
- utils/CompetitionRanker.test.js (7 tests)
- api/mlForesight.test.js (7 tests)
- api/mlPerformanceROI.test.js (3 tests)
- api/leagues.test.js (8 tests)
- StudioAPI.test.js (4 tests)

Note : erreur EACCES sur `/app/node_modules/.vite/vitest/results.json` en post-run (permissions volume Docker) — non bloquante, tous les tests sont verts avant cette erreur.

---

## 10. Tests frontend

**Statut : 20/20 PASS**

```
Test Files  3 passed (3)
     Tests  20 passed (20)
  Duration  554ms
```

- smoke.test.js (1 test)
- components/ErrorBoundary.test.jsx (7 tests)
- components/Button.test.jsx (12 tests)

---

## 11. Checklist UI

Non applicable à cette feature (backend/script uniquement, pas de nouveaux composants UI dans cette livraison).

---

## 12. Bugs trouvés

### BUG-1 — Compteur `Events inserted` trompeur au second run (MINEUR / NON BLOQUANT)

**Symptome** : Le script affiche `Events inserted: 3632` au second run au lieu de `0`.

**Cause racine** : `_insert_events` fait un DELETE+INSERT systématique (ligne 514-517) même quand la fixture est déjà connue (cas enrichissement). C'est un choix de design documenté pour permettre la mise à jour des events avec de nouveaux champs, mais il invalide le critère d'idempotence strict sur le compteur.

**Impact** : Aucun sur la DB (count stable). Impact uniquement sur la lisibilité des logs.

**Recommandation** : Si l'idempotence stricte du compteur est requise, conditionner le DELETE+INSERT au cas `is_new=True` et faire un UPDATE partiel dans le cas `is_new=False`.

---

## Verdict

**FEATURE VALIDEE POUR MERGE**

- Migration appliquée et vérifiée
- Import Bundesliga 2009-2010 : 306 fixtures enrichies, 3632 events insérés, 0 erreur
- DB idempotente (count stable au second run)
- 798 fixtures api_football enrichies avec tm_match_id (matching cross-source fonctionnel)
- 110/110 tests backend
- 20/20 tests frontend
- 1 bug mineur documenté (non bloquant)
