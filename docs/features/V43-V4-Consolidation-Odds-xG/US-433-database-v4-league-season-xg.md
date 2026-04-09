# US-433 — `v4.league_season_xg` : table + migration saisonnière

**En tant que** développeur, **je veux** une table `v4.league_season_xg` avec les statistiques xG par équipe/saison **afin de** disposer des données xG agrégées dans le schéma V4.

## Skills requis
`[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Table `v4.league_season_xg` créée avec FKs sur `v4.competitions` et `v4.clubs`
- [ ] Script `migrate_xg_v3_to_v4.js` avec matching par nom (pg_trgm, seuil 0.6)
- [ ] Rapport : N lignes migrées, M non matchées (loggées pour revue)
- [ ] UNIQUE (competition_id, season_label, club_id)

## Scénarios de test
1. **Match exact** : V3_Leagues.name = v4.competitions.name exactement → migré
2. **Match fuzzy** : noms similaires (similarity > 0.6) → migré avec note
3. **Non matché** : aucun match → loggé dans le rapport, non inséré

## Notes techniques
- Mapping approximatif par nom → des non-matchés sont attendus → revue manuelle
- season_label format : "2023/2024" (V3 season_year = 2023 → "2023/2024")
