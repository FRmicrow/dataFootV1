# US-502 — Ingestion des mappings Stades

**En tant que** Système de Données, **je veux** importer les mappings des stades **afin de** localiser précisément les rencontres.

## Skills requis
`[BACKEND]` `[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Le fichier `Final-TM-FS-IDs/venues.csv` est parsé.
- [ ] Ingestion des mappings TM et FS vers `v4.mapping_venues`.
- [ ] Résolution basée sur les IDs sources et le nom du stade si nécessaire.

## Scénarios de test
1. **Nominal** : Un stade TM est lié à son ID canonique.
