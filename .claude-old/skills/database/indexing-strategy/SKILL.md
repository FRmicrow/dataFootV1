---
name: indexing-strategy
description: "Optimiser les requêtes SQL avec des index. Utiliser quand une requête est lente ou lors de la création d'un schéma."
risk: safe
---

## When to use
Servez-vous de cette compétence lorsque les requêtes deviennent lentes ou lors de la conception initiale pour anticiper les besoins de performance.

## Instructions
1. Analysez les requêtes exécutées fréquemment (via des logs ou un outil de profilage).
2. Créez des index sur les colonnes utilisées pour filtrer ou joindre des tables (WHERE, JOIN), ou pour trier (ORDER BY).
3. Limitez le nombre d’index pour ne pas nuire aux performances d’écriture (INSERT, UPDATE, DELETE).
4. Surveillez régulièrement les performances des index et ajustez-les en fonction de l’évolution du schéma et des requêtes.
5. Documentez les index créés et leur justification pour que l’équipe comprenne leur utilité.

## Example
Dans une table `customers` fréquemment filtrée par `email` et triée par `created_at`, créez un index composite `(email, created_at)`.

## Limitations
Les index ne peuvent pas compenser une mauvaise conception de schéma ; ils doivent être utilisés en complément d’une bonne normalisation.