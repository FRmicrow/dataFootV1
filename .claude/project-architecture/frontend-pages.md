# Frontend : Pages et Composants (V3)

Le frontend est construit avec **React** et packagé avec **Vite**. La logique principale de rendu est regroupée sous `frontend/src/`. Récemment, l'application est passée à une version 3 de son UI/UX, d'où le dossier `v3`.

## Architecture des dossiers principaux

- `src/App.jsx` & `src/main.jsx` : Points d'entrée de l'application. Gérent le routing global.
- `src/components/v3/` : C'est ici que se concentre toute la nouvelle architecture d'interface.

## Pages et Modules (dans `components/v3/`)

Bien qu'habituellement séparées dans un dossier `pages/`, les vues principales (Pages) sont imbriquées dans le dossier `components/v3/`. Voici les principales :

### Profils & Entités
- `ClubProfilePageV3.jsx` : Vue détaillée d'un club de football.
- `PlayerProfilePageV3.jsx` : Vue détaillée d'un joueur.
- `MatchDetailPage.jsx` : Détail d'un match spécifique (avec composants sous-jacents comme `MatchDetailLineups`, `MatchDetailTactical`, `MatchDetailEvents`).

### Modules d'Import et d'Administration
*(Regroupés sous `import/` et dans des composants dédiés)*
- `ImportV3Page.jsx`, `ImportMatrixPage.jsx`, `ImportEventsPage.jsx`, `ImportTrophiesPage.jsx`, `ImportLineupsPage.jsx` : Gèrent l'ingestion de flux de données externes (ex: API Sports).
- `ContentStudioV3.jsx`, `TelemetryConsole.jsx` : Outils de monitoring et d'édition de contenu.

### Modules d'Affichage Globaux
- `V3Dashboard.jsx` : Le tableau de bord principal.
- `V3LeaguesList.jsx`, `LeagueDiscovery.jsx` : Navigation et présentation des ligues/compétitions.
- `SearchPageV3.jsx` : Moteur de recherche global.
- `SeasonOverviewPage.jsx` : Résumé d'une saison pour une ligue.

### Machine Learning & Santé
- `ml/` : Dossier contenant les vues liées aux prédictions et à l'administration des modèles (ex: `ForgeLaboratory`).
- `HealthCenterPage.jsx`, `HealthCheckPage.jsx` : Suivi de l'intégrité des données et de l'état du système.

## Design System
Le projet utilise un système de design personnalisé dans `src/design-system/` documenté via `DesignSystemPage.jsx`. Lors de la création de nouvelles features, il est **impératif de réutiliser ces composants de design** plutôt que de créer du CSS "from scratch".

---

## Arbre d'Architecture des Pages (Routing)

L'application (via `App.jsx` et `react-router-dom`) est structurée selon l'arborescence suivante :

```text
/ (Redirige vers /dashboard)
│
├── /dashboard                  (V3Dashboard)
│
├── /leagues                    (V3LeaguesList)
├── /league/:id                 (SeasonOverviewPage)
├── /league/:id/season/:year    (SeasonOverviewPage)
│
├── /player/:id                 (PlayerProfilePageV3)
├── /club/:id                   (ClubProfilePageV3)
├── /match/:id                  (MatchDetailPage)
│
├── /search                     (SearchPageV3)
│
├── /import                     (ImportMatrixPage)
├── /import/matrix-status       (ImportMatrixPage)
├── /import/old                 (ImportV3Page)
├── /trophies                   (ImportTrophiesPage)
├── /events                     (ImportEventsPage)
├── /lineups-import             (ImportLineupsPage)
│
├── /studio                     (ContentStudioV3)
├── /health                     (HealthCenterPage)
│
├── /machine-learning/*         (MachineLearningHub)
│
└── /design                     (DesignSystemPage)
```

Toutes ces routes principales (sauf la redirection) sont enveloppées par le composant racine `V3Layout`.

---

## Appels API Backend depuis le Frontend

Voici un recensement des endpoints backend actuellement appelés par le frontend (généralement via `axios` ou `fetch`) :

### Santé et Admin (`/api/admin/health`, `/api/health`)
- `GET /api/admin/health/history`
- `POST /api/admin/health/revert/:groupId`
- `GET /api/health/execute?id=:id` (EventSource)
- `POST /api/health/execute`

### Matchs (Fixtures) et Événements (`/api/fixtures`)
- `GET /api/fixtures/events/candidates`
- `POST /api/fixtures/events/sync`
- `GET /api/fixtures/lineups/candidates`
- `POST /api/fixtures/lineups/import`

### Joueurs et Trophées (`/api/players`, `/api/import`)
- `GET /api/players/nationalities`
- `GET /api/players/by-nationality?country=`
- `POST /api/player/:id/sync-career`
- `GET /api/import/trophies/candidates?leagueId=`
- `POST /api/import/trophies`
- `POST /api/import/batch`

### Ligues (`/api/leagues`)
- `GET /api/leagues/imported`

### Studio et Meta-données (`/api/studio`)
- `GET /api/studio/meta/stats`
- `GET /api/studio/meta/leagues`
- `GET /api/studio/meta/nationalities`
- `GET /api/studio/meta/players?search=`
- `GET /api/studio/meta/teams?search=`
- `POST /api/studio/query/league-rankings`
- `POST /api/studio/query` (en cours d'intégration)

