# US-500 — Ingestion des mappings Compétitions

**En tant que** Système de Données, **je veux** importer les mappings Flashscore pour les compétitions **afin de** permettre la résolution automatique lors de l'ingestion de résultats.

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le fichier `Final-TM-FS-IDs/competitions.csv` est parsé correctement.
- [ ] Seuls les mappings avec `confidence >= 0.8` et ayant un `flashscore_id` sont traités.
- [ ] Pour chaque `tm_id`, on récupère le `competition_id` dans `v4.mapping_competitions`.
- [ ] Le `flashscore_id` est inséré dans `v4.mapping_competitions` avec le même `competition_id`.
- [ ] Les doublons sont gérés (ON CONFLICT DO NOTHING).

## Scénarios de test
1. **Nominal** : Une compétition avec TM ID connu et FS ID valide est mappée.
2. **Exclusion** : Une compétition avec confidence < 0.8 n'est pas importée.
3. **Inconnu** : Un TM ID non présent en base est loggé comme "à vérifier".

## Notes techniques
Utiliser `csv-parse` pour lire le fichier.
Source pour FS : 'flashscore'.
