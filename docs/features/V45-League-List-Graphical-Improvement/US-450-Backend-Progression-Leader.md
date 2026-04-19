# US-450 — Backend: Enrichir GET /v4/leagues avec progression et leader

**En tant que** frontend developer, **je veux** recevoir la progression (J32/38) et le leader actuel pour chaque compétition, **afin de** afficher ces données sur les LeagueCard sans requête supplémentaire.

## Skills requis
`[BACKEND]` `[QA]`

## Critères d'acceptation
- [ ] `GET /v4/leagues` retourne `current_matchday`, `total_matchdays`, `latest_round_label`, `leader` pour chaque compétition
- [ ] `current_matchday` = NULL si pas de matches avec score pour la saison actuelle
- [ ] `total_matchdays` = NULL pour les cups (pas de matchday fixe)
- [ ] `latest_round_label` = "Matchday 32" pour league, "Quarter-finals" pour cup
- [ ] `leader` = { club_id, name, logo_url } pour league avec données, NULL pour cup
- [ ] Les appels `StandingsV4Service.calculateStandings()` sont parallélisés (Promise.all), pas séquentiels
- [ ] Tests backend : mock StandingsV4Service, vérifier shape de réponse pour league + cup

## Scénarios de test

1. **Nominal — League avec progression actuelle**
   - Requête : `GET /v4/leagues`
   - Vérifier une compétition type "Bundesliga" retourne :
     - `current_matchday: 32`
     - `total_matchdays: 34`
     - `latest_round_label: "Matchday 32"`
     - `leader: { club_id: X, name: "Bayern München", logo_url: "..." }`

2. **Cup sans progression fixe**
   - Vérifier une compétition type "DFB-Pokal" retourne :
     - `current_matchday: null`
     - `total_matchdays: null`
     - `latest_round_label: "Quarter-finals"`
     - `leader: null`

3. **Compétition sans données de matches**
   - Vérifier une compétition ancienne/sans matches retourne tous les champs = null

4. **Performance**
   - Requête complète < 500ms (même avec ~200 compétitions)
   - Vérifier que les appels StandingsV4Service sont parallélisés (pas 200 appels séquentiels)

## Notes techniques

- **Fichier modifié :** `backend/src/services/v4/LeagueServiceV4.js`
- **Dépendance :** `StandingsV4Service.calculateStandings(competitionId, season)` (import + appel)
- **Approche :** Ajouter CTE `current_progress` pour matchday/round, puis appel JS post-query pour leader (parallélisé avec Promise.all)
- **Edge case :** Compétitions avec une saison sans aucun match (very rare) → tous les nouveaux champs = null
