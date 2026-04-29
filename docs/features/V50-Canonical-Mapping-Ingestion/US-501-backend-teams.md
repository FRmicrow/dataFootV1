# US-501 — Ingestion des mappings Équipes

**En tant que** Système de Données, **je veux** importer les mappings Flashscore pour les équipes **afin de** garantir l'intégrité référentielle des matchs.

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le fichier `Final-TM-FS-IDs/equipes.csv` est parsé.
- [ ] Seuls les mappings avec `confidence >= 0.8` et ayant un `flashscore_id` sont traités.
- [ ] Résolution via `tm_id` dans `v4.mapping_teams`.
- [ ] Insertion du `flashscore_id` lié au `team_id` canonique.
- [ ] Log du nombre de succès et d'échecs.

## Scénarios de test
1. **Nominal** : Le Bayern Munich (tm_id: 27) est lié à son flashscore_id (nVp0wiqd).
2. **Performance** : Le script traite les ~10k lignes en moins de 30 secondes.

## Notes techniques
Vérifier si des équipes sans TM ID mais avec FS ID peuvent être résolues par nom (optionnel selon discussion).
