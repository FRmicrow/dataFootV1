# US-410 — Transfermarkt SQL Ingestion & Staging

**En tant que** ingénieur de données, **je veux** importer le fichier `transfermarkt_dump.sql` dans des tables de staging **afin de** préparer la migration vers V4.

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le fichier `transfermarkt_dump.sql` est chargé avec succès (via `psql` ou script).
- [ ] Des tables temporaires `tm_matches`, `tm_match_events`, `tm_match_lineups` sont créées avec les données du dump.
- [ ] Les données de base (Teams/Players) sont prêtes pour la normalisation dans `V4_`.
- [ ] Le script identifie les erreurs de format avant l'ingestion massive.

## Scénarios de test
1. **Nominal** : Exécuter l'import et compter les lignes dans `tm_matches`.
2. **Edge case** : S'assurer que les caractères spéciaux (Umlauts allemands, etc.) sont correctement gérés (UTF-8).
3. **Erreur** : Si le fichier SQL est corrompu, le script s'arrête proprement.

## Notes techniques
- Le dump est au format SQL standard (statements INSERT).
- Vérifier la configuration `DATABASE_URL` pour l'accès.
