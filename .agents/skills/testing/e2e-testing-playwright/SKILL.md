---
name: e2e-testing-playwright
description: "Exécuter des tests end‑to‑end pour valider l’application complète du point de vue utilisateur."
risk: safe
---

## When to use
Utilisez cette compétence pour simuler un parcours utilisateur complet, incluant l’interface front-end et le backend, afin de valider l’application dans un environnement proche de la production.

## Instructions
1. Installez Playwright (ou un outil similaire) et configurez-le pour votre projet.
2. Définissez des scénarios représentant des parcours utilisateur réalistes (inscription, login, ajout au panier, paiement).
3. Utilisez Playwright pour ouvrir un navigateur, interagir avec les éléments de l’interface et vérifier les résultats affichés ou les changements d’URL.
4. Nettoyez ou réinitialisez les données de test entre chaque scénario pour éviter les interférences.
5. Intégrez les tests end-to-end dans un environnement de staging et, si possible, dans votre pipeline CI/CD.

## Example
Écrivez un test qui se connecte avec des identifiants valides, vérifie la redirection vers la page d’accueil, ajoute un produit au panier, procède à la validation de la commande et confirme que la page de confirmation s’affiche.

## Limitations
Les tests end-to-end sont plus lents et nécessitent un environnement stable. Ils ne remplacent pas les tests unitaires et d’intégration mais les complètent.