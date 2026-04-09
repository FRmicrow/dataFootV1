# US-430 — Table de mapping `v4.fixture_match_mapping`

**En tant que** développeur, **je veux** une table de correspondance persistante entre les fixtures V3 et les matches V4 **afin de** pouvoir migrer les odds et xG sans perte de données.

## Skills requis
`[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Table `v4.fixture_match_mapping` créée avec les colonnes définies dans le TSD
- [ ] Script `build_fixture_match_mapping.js` exécutable et idempotent
- [ ] Stratégie EXACT (tm_match_id) appliquée en priorité
- [ ] Stratégie FUZZY (date + compétition + équipes via pg_trgm) pour les fixtures sans tm_match_id
- [ ] Rapport de couverture loggué (comptes par stratégie/confiance)
- [ ] Fixtures UNMATCHED insérées avec v4_match_id = NULL

## Scénarios de test
1. **Nominal** : fixture avec tm_match_id → strategy=EXACT_TM_ID, confidence=HIGH
2. **Fuzzy** : fixture sans tm_match_id mais date+équipes matchent → strategy=FUZZY_DATE_TEAMS, confidence=MEDIUM
3. **Unmatched** : fixture sans tm_match_id et sans correspondance → strategy=UNMATCHED, confidence=NONE

## Notes techniques
- Prérequis : extension pg_trgm installée dans PostgreSQL
- Périmètre : uniquement les fixtures V3 liées à des odds (V3_Odds)
- Idempotent : ON CONFLICT DO NOTHING sur v3_fixture_id
