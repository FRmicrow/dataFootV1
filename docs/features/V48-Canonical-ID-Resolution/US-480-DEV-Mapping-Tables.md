# US-480 — Création des tables de mapping

**En tant que** développeur, **je veux** créer les tables de mapping pour les clubs, personnes, compétitions et stades **afin de** stocker les correspondances entre les IDs sources et les IDs canoniques.

## Skills requis
`[DATABASE]` `[SQL]` `[QA]`

## Critères d'acceptation
- [ ] Les tables `v4.mapping_teams`, `v4.mapping_people`, `v4.mapping_competitions` et `v4.mapping_venues` existent.
- [ ] Chaque table possède une contrainte d'unicité sur `(source, source_id)`.
- [ ] Chaque table possède une clé étrangère (FK) vers sa table métier respective avec `ON DELETE CASCADE`.
- [ ] Une colonne `metadata` JSONB est disponible pour stocker des infos additionnelles.

## Scénarios de test
1. **Nominal** : Insertion d'un mapping valide.
2. **Erreur** : Tentative d'insertion d'un doublon `(source, source_id)` -> doit échouer.
3. **Cascading** : Suppression d'une entité métier -> le mapping doit être supprimé automatiquement.

## Notes techniques
- Utiliser le système de migration du projet (`backend/src/migrations/registry/`).
- Namespace `v4` impératif.
