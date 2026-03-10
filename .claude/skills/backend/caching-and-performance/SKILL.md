---
name: caching-and-performance
description: "Optimiser les performances backend. Utiliser quand les temps de réponse sont dégradés ou pour ajouter node-cache."
risk: safe
---

## When to use
Utilisez cette compétence pour améliorer les temps de réponse et réduire la charge du serveur en stockant temporairement les résultats de requêtes fréquentes.

## Instructions
1. Identifiez les endpoints susceptibles d’être mis en cache (résultats de lecture stables, listes peu volatiles).
2. Sélectionnez un store de cache adapté (memoization, en mémoire, Redis) en fonction de la volumétrie et des besoins de persistance.
3. Définissez un TTL (time-to-live) réaliste afin de rafraîchir les données à intervalle régulier sans impacter la cohérence métier.
4. Invalidez le cache lorsque des modifications de données le rendent obsolète (création, mise à jour).
5. Surveillez les performances (latence, taux de hit/miss) et ajustez la stratégie en conséquence.

## Example
Pour un endpoint `GET /categories`, stockez le résultat en mémoire pendant 15 minutes. Au moindre ajout, modification ou suppression d’une catégorie, videz le cache avant d’enregistrer les nouvelles données.

## Limitations
Le cache ne remplace pas une optimisation de requête ou de schéma. Pour les données très dynamiques, l’usage du cache doit être soigneusement évalué.