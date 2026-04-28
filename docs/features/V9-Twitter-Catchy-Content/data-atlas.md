# V9 — Data Atlas V4 (zero-invention reference)

**Mission :** Lister ce que la BDD `v4.*` peut réellement servir aujourd'hui, par catégorie de contenu Twitter. Toute idée d'infographie doit pointer vers une ligne de ce tableau ou être marquée `data_gap`.

**Source de vérité :** `backend/src/services/v4/*` + `backend/src/controllers/v4/*` + `frontend/src/services/api.js`.

**Convention :**
- `OK` = service + endpoint + service frontend câblés.
- `partiel` = service ou table OK, endpoint manquant ou stub.
- `data_gap` = la donnée n'existe pas en BDD V4 et doit être marquée explicitement dans l'UI.

---

## 1. Résumé exécutif

Sur 11 catégories de contenu envisagées pour Twitter, **8 sont 100 % servables**, **2 sont partielles** (xG côté joueur, séries/streaks), **1 est un data_gap** (profil joueur enrichi : nationalité, taille, photo).

| Catégorie | Statut | Service V4 |
|---|---|---|
| Match preview (avant-match enrichi) | ✅ OK | `MatchPreviewContentServiceV4.getMatchPreview()` |
| Classement live | ✅ OK | `StandingsV4Service.calculateStandings()` |
| Top buteurs / passeurs | ✅ OK | `LeagueServiceV4.getTopScorers/getTopAssists()` |
| xG saison équipe | ✅ OK | `XgV4Service.getTeamSeasonXg()` / `getXgByCompetitionSeason()` |
| Forme récente (5 matchs) | ✅ OK | `MatchPreviewContentServiceV4.fetchRecentForm()` |
| Head-to-Head | ✅ OK | `MatchPreviewContentServiceV4.fetchH2H()` |
| Événements de match (buts/cartons/subs) | ✅ OK | `MatchDetailV4Service.getFixtureEvents()` |
| Prédictions ML (1X2) | ⚠️ partiel | `MatchPreviewContentServiceV4.fetchPrediction()` (table `v4.ml_predictions`) |
| Logos clubs / compétitions versionnés | ✅ OK | `v4.club_logos` / `v4.competition_logos` (centralisé via `mediaConstants.js`) |
| Classement xG saison joueur | ⚠️ partiel | table `v4.player_season_xg` existe — endpoint dédié à câbler |
| Profil joueur (photo, nationalité, âge…) | ❌ data_gap | `v4.people` ne stocke pas systématiquement ces champs |

---

## 2. Détail par catégorie

### 2.1 Match preview enrichi

**Service :** `backend/src/services/v4/MatchPreviewContentServiceV4.js`

**Endpoint frontend :** `api.getFixtureDetailsV4(matchId)` → `/v4/match/:fixtureId` (préview wrappée par le service `MatchPreviewContentServiceV4.getMatchPreview()` selon le contrôleur).

**Champs servis :**
- `home`, `away` : `{ club_id, name, logo_url }` (logos via `mediaConstants` + `data_gap` flag si manquant)
- `kickoff` : ISO + `extractKickoffTime()`
- `competition`, `season`, `round`
- `recent_form_home`, `recent_form_away` : 5 derniers résultats (`fetchRecentForm`)
- `season_xg_home`, `season_xg_away` : xG / xGA / xGD moyens (`fetchSeasonXgAvg`)
- `home_record_at_home`, `away_record_away` : V/N/D + buts (`fetchHomeAwayRecord`)
- `h2h` : 5 derniers face-à-face avec scores (`fetchH2H`)
- `prediction` : probas 1X2 (`fetchPrediction`)
- `standings_home`, `standings_away` : ligne classement (rank, pts, GD) (`findStandingsRow`)

**Twitter use cases couverts :** preview avant-match, "voici ce que disent les chiffres".

---

### 2.2 Classement live

**Service :** `backend/src/services/v4/StandingsV4Service.js` — `calculateStandings(competitionIds, season)`

**Endpoint :** `api.getSeasonOverviewV4(league, season)` retourne `standings` calculé live à partir de `v4.matches` (+ groupes pour coupes/Nations League).

**Champs servis (par équipe) :** `team_id`, `team_name`, `played`, `wins`, `draws`, `losses`, `goals_for`, `goals_against`, `goal_difference`, `points`, `rank`, `group_name` (le cas échéant).

**Limitation :** pas de classement par journée historique (`v4.standings_snapshots` n'existe pas). Pour produire un "tableau au fil de la saison", il faut recalculer en bornant `match_date` (faisable mais non câblé aujourd'hui).

**Twitter use cases couverts :** classement à date, podiums, course au titre, lutte maintien.

---

### 2.3 Top buteurs / passeurs

**Service :** `LeagueServiceV4.getTopScorers(competitionId, season)` et `getTopAssists(competitionId, season)`

**Endpoint :** `api.getSeasonOverviewV4(league, season)` retourne `top_scorers` et `top_assists` (top 10 par défaut).

**Champs servis :** `person_id`, `first_name`, `last_name`, `goals` ou `assists`, `team_id`, `team_name`, `team_logo` (versionné).

**Limitation :** pas de minutes jouées au niveau saison via cet endpoint → le ratio "buts par 90'" n'est pas direct. Voir `getPlayerSeasonStats` (point 2.10).

**Twitter use cases couverts :** Soulier d'or, race buteurs, nouveau record buteur d'un club.

---

### 2.4 xG saison équipe

**Service :** `XgV4Service` — `getTeamSeasonXg(leagueName, season)` et `getXgByCompetitionSeason(competitionId, season)`. Table source : `v4.team_season_xg`.

**Endpoint :** `api.getTeamSeasonXgV4(league, season)`.

**Champs servis :** `team_id`, `team_name`, `xg_for`, `xg_against`, `xg_diff`, `matches_played`, `xg_per_match_for`, `xg_per_match_against`.

**Twitter use cases couverts :** "Sur-performance / sous-performance", scatter goals vs xG, classement réel vs classement xG.

---

### 2.5 Forme récente (5 matchs)

**Service :** `MatchPreviewContentServiceV4.fetchRecentForm(clubId, beforeDate, limit=5)`.

**Champs servis (par match) :** `result` ∈ `W|D|L`, `goals_for`, `goals_against`, `opponent_name`, `is_home`, `match_date`.

**Limitation :** pas de série dynamique calculée à l'API ("4ᵉ victoire de rang"). On peut la dériver côté frontend ou ajouter un util backend (cheap).

**Twitter use cases couverts :** "5 victoires de suite", "invaincus depuis…", forme avant choc.

---

### 2.6 Head-to-Head

**Service :** `MatchPreviewContentServiceV4.fetchH2H(homeClubId, awayClubId, beforeDate, limit=5)`.

**Champs servis :** `home_score`, `away_score`, `match_date`, `competition_name`, `winner` ∈ `home|away|draw`.

**Twitter use cases couverts :** "Bilan des 5 derniers", "premier face-à-face de la saison".

---

### 2.7 Événements de match

**Service :** `MatchDetailV4Service.getFixtureEvents(fixtureId)` — table `v4.match_events`.

**Endpoint :** `api.getFixtureEventsV4(fixtureId)`.

**Champs servis :** `minute_label`, `event_type` (goal, card, sub, penalty, own_goal…), `player_id`, `player_name`, `team_id`, `detail`.

**Twitter use cases couverts :** récap post-match (tweet ligne du temps), goal-of-the-week, hat-trick clip cards.

---

### 2.8 Prédictions ML (1X2)

**Service :** `MatchPreviewContentServiceV4.fetchPrediction(matchId)` — table `v4.ml_predictions`.

**Champs servis :** `prob_home`, `prob_draw`, `prob_away`, `model_version`, `predicted_at`.

**Limitation :** la couverture dépend du pipeline V44 (V4-ML-Pipeline) ; certains matchs n'ont pas de prédiction → l'UI doit afficher un état neutre ("modèle indisponible") plutôt qu'un placeholder à 33/33/33.

**Twitter use cases couverts :** "le modèle dit X%", "ML vs cotes".

---

### 2.9 Cotes (odds)

**Service :** `OddsV4Service` — table `v4.match_odds` (pré-existante).

**Limitation :** non audité dans cette passe. À vérifier avant tout tweet "cotes vs proba ML".

**Statut :** ⚠️ à confirmer — ne pas servir tant que la couverture n'est pas mesurée.

---

### 2.10 Stats joueur saison

**Service :** `LeagueServiceV4.getPlayerSeasonStats(competitionId, season, personId)`.

**Endpoint :** `api.getPlayerSeasonStatsV4(league, season, playerId)`.

**Champs servis :** buts, passes, minutes jouées, matchs, jaunes/rouges (à confirmer avec un test live, mais la signature et la table `v4.player_season_stats` existent).

**Twitter use cases couverts :** comparaisons joueur vs joueur (DuoComparison), pizza chart, percentile vs ligue.

---

### 2.11 xG joueur saison

**Service :** table `v4.player_season_xg` existe en BDD (vue dans la doc V43-V4-Consolidation-Odds-xG).

**Limitation :** pas d'endpoint frontend direct — il faut câbler une route `/v4/league/:league/season/:season/player-xg` ou enrichir `getPlayerSeasonStats`.

**Statut :** ⚠️ partiel — usable en V9 si on passe 1 jour à câbler le service.

---

### 2.12 Profil joueur enrichi

**Statut :** ❌ data_gap

**Champs manquants ou incertains dans `v4.people` :** photo, nationalité, date de naissance complète, taille, poids, pied fort.

**Action recommandée :** ne **PAS** créer un template "fiche joueur" tant qu'un import enrichi n'est pas planifié (V47 ou ultérieur). Si un visuel l'exige, marquer chaque champ manquant `data_gap` dans la pré-vue.

---

### 2.13 Logos & assets

**Tables :** `v4.club_logos`, `v4.competition_logos`. Versionnées (le service prend la dernière version active).

**Helper :** `backend/src/config/mediaConstants.js` expose `DEFAULT_LOGO`, `DEFAULT_PHOTO` pour les fallbacks.

**Recommandation V9 :** quand un logo est absent, **ne pas afficher le silhouette générique en silence** — tagger le visuel avec un badge `data_gap` discret pour que l'utilisateur sache qu'il doit compléter avant publication.

---

### 2.14 Couverture (méta)

**Service :** `LeagueServiceV4.getCoverageByCompetition()`

**Endpoint :** `api.getCoverageV4()`.

**Usage :** surface dans IdeasHub — *une idée de tweet n'est proposée que si la compétition cible est couverte pour la saison cible*. Évite les promesses mortes.

---

## 3. Inventaire des manques (data_gap)

| Donnée | Impact | Priorité |
|---|---|---|
| Photo joueur | Bloque tout visuel "portrait" | P2 — V47 import |
| Nationalité joueur | Limite drapeaux dans pizza/percentile | P2 |
| Tactiques / formations match | Limite "tactical board" template | P3 — déjà partiel via `MatchDetailV4Service.getFixtureTacticalStats` |
| Buzz social ("Moral", mentions) | Fait sauter le KPI "Moral" de NarrativeGrid v1 | P0 — supprimer le KPI tant qu'aucune source n'est câblée |
| Séries/streaks pré-calculées | Tweet "5ᵉ victoire de rang" doit être calculé front | P2 — util backend `getCurrentStreak(clubId)` souhaité |
| Classement par journée historique | Bloque "course au titre" graphique multi-points | P2 — recalcul à la volée possible |
| xG joueur exposé via API | Bloque pizza/scatter joueur vs joueur | P1 — endpoint à câbler |
| Cotes / couverture odds | Bloque "ML vs cotes" | P1 — audit `OddsV4Service` |

---

## 4. Règles "zero invention"

1. **Aucun template ne doit recevoir une valeur en dur** sauf demo (`demoData`).
2. **Tout KPI doit pointer vers une ligne du tableau § 2** ou être marqué `data_gap`.
3. **Les états vides ne sont pas des zéros** — NarrativeGrid v1 affichait `0` pour Possession/Moral, ce qui est trompeur. v2 doit afficher `—` ou `data_gap` (cf. `narrative-grid-v2.md`).
4. **Pas de prédiction "neutre 33/33/33"** quand le modèle n'a pas tourné — masquer la zone proba et afficher un message dédié.

---

## 5. Sources & vérifications effectuées

- `backend/src/services/v4/MatchPreviewContentServiceV4.js` — 12 méthodes lues.
- `backend/src/services/v4/LeagueServiceV4.js` — 12 méthodes lues (lignes 195–890).
- `backend/src/services/v4/StandingsV4Service.js` — 2 méthodes lues.
- `backend/src/services/v4/XgV4Service.js` — 2 méthodes lues.
- `backend/src/services/v4/MatchDetailV4Service.js` — 5 méthodes lues.
- `backend/src/controllers/v4/leagueControllerV4.js` — câblage Promise.all confirmé (top scorers/assists/standings dans le seasonOverview).
- `frontend/src/services/api.js` — 16 endpoints `*V4` listés.

**Dernière vérification :** 2026-04-25.
