# US-400 — V4 Structured Baseline Schema

**En tant que** développeur backend, **je veux** définir le schéma des tables V4 **afin de** disposer d'un environnement isolé et propre pour les données historiques Transfermarkt.

## Skills requis
`[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Une nouvelle migration `20260331_03_V4_Baseline.js` est créée.
- [ ] Les tables `V4_Teams`, `V4_Players`, `V4_Fixtures`, `V4_Fixture_Events`, `V4_Fixture_Lineups` sont créées avec les types de données appropriés (PostgreSQL).
- [ ] Chaque table possède une clé primaire et les clés étrangères nécessaires entre elles.
- [ ] Les index de performance sont mis en place (ex: `tm_match_id`).

## Scénarios de test
1. **Nominal** : Lancer la migration et vérifier que les tables apparaissent dans `psql \dt`.
2. **Edge case** : S'assurer que le script est idempotent (utilisait `CREATE TABLE IF NOT EXISTS`).
3. **Erreur** : Vérifier que si une erreur survient (ex: syntaxe), la migration échoue proprement (transaction) sans laisser d'état incohérent.

## Notes techniques
- Utiliser le pattern `db.run()` standard du projet.
- Ne pas référencer les tables `V3_`.
