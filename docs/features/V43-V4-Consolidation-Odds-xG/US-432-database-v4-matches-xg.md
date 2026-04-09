# US-432 — xG fixture : colonnes dans `v4.matches` + migration

**En tant que** développeur, **je veux** les données xG (Expected Goals) dans `v4.matches` **afin de** disposer des métriques avancées dans le schéma V4.

## Skills requis
`[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Colonnes `xg_home NUMERIC(5,2)` et `xg_away NUMERIC(5,2)` ajoutées à `v4.matches`
- [ ] Backfill via mapping table (confiance HIGH et MEDIUM uniquement)
- [ ] Rapport : N fixtures enrichies, M skippées

## Scénarios de test
1. **Nominal** : fixture V3 avec xg_home=1.5 et confiance HIGH → v4.matches.xg_home = 1.5
2. **Null xG** : fixture V3 sans xg_home/xg_away → v4.matches inchangé
3. **Confiance LOW** : fixture LOW confiance → v4.matches inchangé

## Notes techniques
- Prérequis : US-430 terminé
- ALTER TABLE ADD COLUMN IF NOT EXISTS (idempotent)
- Ne modifie pas les fixtures v4 qui ont déjà des valeurs xg
