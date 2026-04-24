# Technical Specification Document — V41 League Page Graphic Improvement

## 1. Contexte & Objectif
Suite au raffinement, l'objectif est d'améliorer graphiquement la page d'une compétition (League) pour gérer dynamiquement l'affichage selon le type (Championnat classique, Coupe, Format hybride type LDC). 
Le but est d'éviter d'afficher des onglets vides (ex: "Standings" ou "Title Race" pour une coupe) et d'intégrer un système de filtres par phase (Tournoi principal vs Qualifications).
**Règle d'or fixée par le PO :** Modification graphique sans impacter ou mélanger les données existantes.

## 2. Analyse d'Impact
- **Frontend** : Refonte de `SeasonOverviewPageV4.jsx`, `FixturesListV4.jsx`, `LeagueOverviewV4.jsx`, `SquadExplorerV4.jsx`
- **Backend** : Modifications MINEURES et CIBLÉES sur `LeagueServiceV4.js` uniquement pour ajouter les flags de colonnes dynamiques (`has_cards`, `has_xg`) et permettre le filtrage de phase, **sans récursion CTE dangereuse** qui risquerait de ramener les équipes d'autres compétitions.

## 3. Data Contracts & Backend

### 3.1. getSeasonOverviewV4 (Extension)
*Objectif : Fournir au frontend les infos de typologie sans modifier la structure des données de classement.*
- Ajout de `display_mode` (`league`, `cup`, `hybrid`) déduit depuis `competition_type`.
- Ajout de `has_xg` (boolean) pour masquer l'onglet si aucun xG n'est dispo pour la compétition sur la saison donnée.
- Ajout de `phases` (tableau) : Extraction simple (sans CTE) des compétitions filles (ex: Qualifiers) liées via `v4.competition_relations` (profondeur 1 max).

### 3.2. getSeasonPlayersV4 (Extension)
*Objectif : Remonter les données de cartons et minutes de manière isolée et sécurisée.*
- On garde la requête existante stricte (sans CTE récursive).
- On ajoute des JOIN simples sur `v4.match_events` pour compter `yellow_cards` et `red_cards`.
- On renvoie un objet `{ players: [...], column_flags: { has_cards, has_xg, has_minutes } }` pour que le front sache s'il doit afficher les colonnes.

## 4. UI Blueprint (Frontend)

### 4.1. SeasonOverviewPageV4
- **Onglets Dynamiques** : 
  - `League` : Standings, Schedule, Player Insights, Title Race, xG, Squads.
  - `Cup` : Schedule, Player Insights, Squads.
  - `Hybrid` : Standings, Schedule, Player Insights, Squads.
- **Défaut** : `Standings` pour League, `Schedule` pour Cup/Hybrid.

### 4.2. FixturesListV4
- Ajout d'une "Pill Bar" horizontale pour filtrer la phase (ex: "Tournoi Principal", "Qualification"). 
- Par défaut, la phase "Tournoi Principal" est sélectionnée, isolant les matchs pertinents.

### 4.3. SquadExplorerV4
- Masquage conditionnel des colonnes "xG" et "Cartons" en se basant sur le nouveau `column_flags` de l'API. Si la compétition n'a pas de data de carton, la colonne disparaît.

## 5. Edge Cases identifiés
- Les Coupes Nationales sans phases de groupe doivent bien s'afficher sans faire crasher le scroller.
- Les compétitions sans XG ne doivent pas afficher un onglet vide menant à une erreur 404/vide.

## 6. Découpage en User Stories
Si validé, ce TSD sera découpé en :
- `US-410-BACKEND-Typology-Flags`
- `US-411-BACKEND-Player-Insights`
- `US-412-FRONTEND-Dynamic-Tabs`
- `US-413-FRONTEND-SquadExplorer-Columns`
- `US-414-FRONTEND-Fixtures-Phase-Filter`
