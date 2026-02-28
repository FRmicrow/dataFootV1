---
name: architecture
description: "Concevoir une architecture logicielle modulaire, évolutive et maintenable."
risk: safe
---

## When to use
Employez cette compétence lors de la structuration initiale d’un projet ou lors de révisions majeures afin de déterminer les responsabilités et interactions des différents modules.

## Instructions
1. Identifiez les domaines fonctionnels à partir des exigences (authentification, catalogue, panier, etc.).
2. Sélectionnez un style architectural adapté (par exemple Clean Architecture, microservices, monolithique modulaire) en fonction des objectifs de scalabilité, de maintenabilité et de l’équipe.
3. Définissez des interfaces et contrats entre les modules pour clarifier les points d’intégration (API, événements).
4. Documentez l’architecture via des diagrammes (C4, UML) et un texte explicatif accessible aux développeurs et parties prenantes.
5. Ajustez l’architecture en fonction des retours d’expérience et des évolutions du produit, en respectant les principes SOLID et DRY.

## Example
Séparez la logique métier en plusieurs services (compte utilisateur, gestion des produits, commandes), chacun exposant son propre ensemble d’API, et reliant l’interface frontend via un Gateway ou un BFF (Backend For Frontend).

## Limitations
Les détails d’implémentation (choix des frameworks, des librairies) sont traités ailleurs. L’architecture doit être validée avec l’équipe et réévaluée régulièrement.