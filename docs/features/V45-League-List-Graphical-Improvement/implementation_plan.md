# Implementation Plan — US-450

## Objectif
Enrichir `GET /v4/leagues` pour ajouter progression (`current_matchday`, `total_matchdays`, `latest_round_label`) et leader actuel (`leader`) par compétition.

## Approche

### 1. Modification `LeagueServiceV4.getLeaguesGroupedByCountry()`

#### Étape 1.1 : Ajouter CTE progression
```sql
current_season_progress AS (
    SELECT
        m.competition_id,
        m.season_label,
        MAX(m.matchday) AS current_matchday,
        COUNT(DISTINCT m.match_id) FILTER (WHERE m.home_score IS NOT NULL) AS played_matches,
        COUNT(DISTINCT m.match_id) AS total_matches,
        MAX(m.round_label) FILTER (WHERE m.home_score IS NOT NULL) AS latest_round_label
    FROM v4.matches m
    WHERE (m.competition_id, m.season_label) IN (
        SELECT competition_id, MAX(season_label) FROM v4.matches GROUP BY competition_id
    )
    GROUP BY m.competition_id, m.season_label
)
```

#### Étape 1.2 : Ajouter colonnes SELECT
- `CASE WHEN c.competition_type = 'league' THEN cp.current_matchday ELSE NULL END AS current_matchday`
- `CASE WHEN c.competition_type = 'league' THEN cp.total_matches ELSE NULL END AS total_matchdays`
- `cp.latest_round_label`

#### Étape 1.3 : LEFT JOIN sur `current_season_progress`
```sql
LEFT JOIN current_season_progress cp 
  ON cp.competition_id = c.competition_id 
  AND cp.season_label = MAX(m.season_label)
```

**Note :** Le `MAX(m.season_label)` doit être accessible dans le GROUP BY ou calculé dans la CTE pour éviter "aggregate of aggregate" error.

#### Étape 1.4 : Calcul du leader (post-query en JS)
- **Approche :** Post-traiter les rows groupées
- Pour chaque pays/league dans `grouped`, si `competition_type === 'league'` :
  - Appeler `StandingsV4Service.calculateStandings(competitionId, latestSeason)` 
  - Extraire `standings[0]` (le leader)
  - Assigner { club_id, name, logo_url } au champ `leader`
- **Parallélisation :** Collecter tous les appels, puis `Promise.all()` sur la liste

#### Étape 1.5 : Ajuster la réponse JS
```js
country.leagues.push({
    league_id,
    name,
    logo_url,
    seasons_count,
    latest_season,
    competition_type,  // Ajouter (nécessaire pour la logique frontend)
    current_matchday,  // null pour non-league
    total_matchdays,   // null pour non-league
    latest_round_label,
    leader             // null pour cup/sans données
});
```

### 2. Tests

**Fichier :** `backend/src/services/v4/LeagueServiceV4.test.js` (s'il existe) ou créer un nouveau

- **Mock StandingsV4Service :** `vi.mock('../../services/v4/StandingsV4Service.js')`
- **Mock db.all :** retourner un dataset de test (5-10 compétitions : 3 leagues + 2 cups)
- **Assertions :**
  - League avec progression : `current_matchday`, `total_matchdays`, `latest_round_label` non-null
  - League avec leader : `leader.name`, `leader.logo_url` présent
  - Cup : `leader` = null, `total_matchdays` = null, `latest_round_label` présent
  - Performance : appel StandingsV4Service < 50ms pour 10 compétitions

### 3. Validation

1. **Requête locale :**
   ```bash
   curl http://localhost:3001/v4/leagues | jq '.data[0].leagues[0]'
   ```
   Vérifier : `current_matchday`, `total_matchdays`, `latest_round_label`, `leader` présents

2. **Perf :** < 500ms pour ~200 compétitions (inclus les appels standings)

3. **Edge cases :**
   - Compétition sans matches → tous champs = null ✓
   - Cup sans round_label → latest_round_label = null ✓
   - League sans standings (erreur) → gérer gracefully (leader = null) ✓

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `backend/src/services/v4/LeagueServiceV4.js` | Ajouter CTE + colonnes + appel Promise.all StandingsV4Service |
| `backend/src/services/v4/LeagueServiceV4.test.js` | Créer/enrichir tests avec mocks |

## Dépendances

- `StandingsV4Service.calculateStandings(competitionId, season)` — déjà implémentée, lecture seule
- Pas de migration DB nécessaire (colonnes existantes)

## Risques & Mitigations

| Risque | Mitigation |
|--------|-----------|
| N+1 queries (1 par league) | Promise.all() avec batching optimal |
| Performance > 500ms | Cacher les résultats standings si possible, ou limiter appels |
| Erreur standings = réponse 500 | Try-catch autour Promise.all, log erreur, leader = null |
