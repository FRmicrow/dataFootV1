# US-431 — `v4.odds` : table + migration depuis V3

**En tant que** développeur, **je veux** une table `v4.odds` avec les cotes des bookmakers **afin de** disposer des données odds dans le schéma V4.

## Skills requis
`[DATABASE]` `[SQL]` `[SECURITY]` `[QA]`

## Critères d'acceptation
- [ ] Table `v4.odds` créée avec FK sur `v4.matches(match_id)`
- [ ] Contrainte UNIQUE (match_id, bookmaker_id, market_type)
- [ ] Script `migrate_odds_v3_to_v4.js` idempotent
- [ ] Migration uniquement pour les fixtures HIGH et MEDIUM confiance dans la mapping table
- [ ] Rapport : N lignes migrées, M ignorées (LOW/NONE confiance)

## Scénarios de test
1. **Nominal** : odds V3 liées à fixture HIGH → insérées dans v4.odds
2. **Confiance LOW** : odds V3 liées à fixture LOW/NONE → skippées (loggées)
3. **Idempotence** : re-exécution du script → 0 nouvelles insertions, 0 erreur

## Notes techniques
- Prérequis : US-430 terminé et rapport validé
- ON CONFLICT (match_id, bookmaker_id, market_type) DO NOTHING
