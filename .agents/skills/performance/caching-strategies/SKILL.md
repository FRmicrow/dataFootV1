---
name: caching-strategies
description: "Choisir et appliquer des stratégies de mise en cache pour améliorer les performances du système."
risk: safe
---

## When to use
Servez-vous de cette compétence lorsque vous identifiez des goulots d’étranglement liés à des lectures répétées de données identiques ou peu volatiles.

## Instructions
1. Analysez les parties de votre application où les mêmes données sont demandées fréquemment sans changement rapide (listes de référence, configurations).
2. Décidez où positionner le cache : côté client (navigateur), côté serveur (cache en mémoire), intermédiaire (proxy ou CDN).
3. Choisissez une stratégie d’expiration adaptée : TTL (time-to-live) fixe, invalidation à l’événement (webhook), ou combinaison des deux.
4. Implémentez le mécanisme en vous appuyant sur des outils existants (HTTP cache, Redis, bibliothèque de memoization).
5. Surveillez les performances et l’usage du cache (taux de hits/misses) et ajustez les durées de conservation pour éviter les désynchronisations de données.

## Example
Pour un catalogue de produits rarement modifié, utilisez un CDN avec un TTL d’une heure pour les pages statiques et un cache côté serveur pour les réponses JSON, en invalidant ces caches lorsqu’un produit est ajouté ou modifié.

## Limitations
Cette compétence ne couvre pas la mise en cache dans les bases de données (ex. index de caches internes) ni l’optimisation du code pour réduire la consommation de ressources.