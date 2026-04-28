---
name: normalization
description: "Normaliser un schéma relationnel. Utiliser quand on conçoit un nouveau modèle de données pour le projet."
risk: safe
---

## When to use
Activez cette compétence lorsque vous créez une nouvelle base de données relationnelle ou lorsque vous refactorez un schéma existant qui souffre de redondances.

## Instructions
1. Énumérez les entités (tables) et leurs attributs à partir des User Stories et de l’API.
2. Appliquez la 1NF (pas de champs composés ou de listes dans une colonne).
3. Appliquez la 2NF en éliminant les dépendances partielles (chaque champ non clé dépend de toute la clé primaire).
4. Appliquez la 3NF en éliminant les dépendances transitives (les champs non clés ne dépendent que de la clé).
5. Documentez les relations (un-à-plusieurs, plusieurs-à-plusieurs) et créez des tables de jointure lorsque nécessaire.

## Example
Dans un système de vente, séparez les informations d’un client, d’une commande et des produits en trois tables différentes et créez une table de liaison `OrderLines` reliant les commandes et les produits avec des quantités.

## Limitations
Une normalisation trop poussée peut complexifier les requêtes. Combinez cette compétence avec `indexing-strategy` pour assurer performance et cohérence.