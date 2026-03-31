# US-420 — V4 Transformation & Target Load

**En tant que** architecte de données, **je veux** migrer les données du staging vers les tables V4 standardisées **afin de** disposer de données structurées selon le nouveau modèle.

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Les équipes uniques de `tm_matches` sont insérées dans `V4_Teams`.
- [ ] Les joueurs uniques (buts, cartons, compos) sont insérés dans `V4_Players`.
- [ ] Les matches sont transformés et insérés dans `V4_Fixtures` avec les FK `home_team_id` et `away_team_id` correspondantes.
- [ ] Les événements et compositions sont liés via FK à `V4_Fixtures` et `V4_Players`.
- [ ] L'intégrité référentielle est respectée à 100% (pas d'orphelins).

## Scénarios de test
1. **Nominal** : Lancer la migration complète et vérifier que `V4_Fixtures` contient le même nombre de matches que le dump initial.
2. **Edge case** : Vérifier que deux matches TM identiques ne créent pas de doublon (clé `tm_match_id`).
3. **Erreur** : Si un FK échoue (ex: joueur non trouvé), le script doit logger l'erreur et continuer (ou s'arrêter selon la gravité).

## Notes techniques
- Utiliser des scripts Node.js (`backend/scripts/v4/`) pour la logique de mapping complexe.
- Loguer la progression et le temps d'exécution.
