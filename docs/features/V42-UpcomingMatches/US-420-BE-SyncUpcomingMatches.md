# US-420 — Synchronisation des matchs à venir (API Football)

**En tant que** Modérateur de données, **je veux** synchroniser les prochains matchs de la saison 2025 via l'API Football **afin de** disposer d'un calendrier complet pour les ligues V4.

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le script identifie les compétitions V4 et les mappe aux IDs API Football.
- [ ] Le script récupère les fixtures 2025 non jouées (goals === null).
- [ ] Le script mappe les équipes API aux clubs V4 de la même compétition.
- [ ] Les matchs sont insérés dans `v4.matches` avec `source_provider = 'api-football'`.
- [ ] Un UPSERT est utilisé pour éviter les doublons sur `match_id`.

## Scénarios de test
1. **Nominal** : Lancer le script pour la Ligue 1, vérifier que les matchs futurs apparaissent en base.
2. **Edge case** : Lancer le script pour une ligue sans mapping API, vérifier que le log indique le saut de la ligue.
3. **Erreur** : Simulation d'une coupure réseau API, vérifier que le script s'arrête proprement ou log l'erreur par ligue.

## Notes techniques
- Utilisation de `footballApi.js`.
- Schéma cible : `v4`.
- Offset d'ID pour éviter les collisions TM.
