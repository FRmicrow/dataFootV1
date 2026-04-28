# US-481 — Backfill des IDs Transfermarkt

**En tant que** développeur, **je veux** migrer les IDs Transfermarkt actuellement stockés dans les colonnes `source_tm_id` vers les nouvelles tables de mapping **afin d'** initialiser le système de résolution.

## Skills requis
`[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Tous les `source_tm_id` non nuls des tables `v4.teams`, `v4.people`, `v4.competitions` et `v4.venues` sont copiés dans les tables de mapping correspondantes.
- [ ] La source est fixée à `'transfermarkt'`.
- [ ] Aucune donnée n'est perdue durant le transfert.

## Scénarios de test
1. **Nominal** : Vérifier que le nombre de lignes dans `v4.mapping_teams` correspond au nombre de `team_id` ayant un `source_tm_id` dans `v4.teams`.
2. **Idempotence** : Relancer le script ne doit pas créer de doublons.

## Notes techniques
- Réaliser cette opération via un script de migration ou un script de maintenance ponctuel.
- Vérifier les performances (plusieurs millions de lignes pour People).
