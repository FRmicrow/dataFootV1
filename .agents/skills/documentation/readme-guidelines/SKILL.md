---
name: readme-guidelines
description: "Structurer et maintenir un fichier README utile pour les développeurs et utilisateurs."
risk: none
---

## When to use
Activez cette compétence lors de la création d’un nouveau dépôt ou lorsque des changements importants justifient une mise à jour du README.

## Instructions
1. Commencez par un titre clair et une description succincte du projet.
2. Détaillez les prérequis nécessaires à l’installation (versions de Node, variables d’environnement, accès aux services externes).
3. Indiquez les étapes pour installer et exécuter le projet en local (commande d’installation des dépendances, lancement du serveur).
4. Expliquez les scripts disponibles (test, lint, build, migration) et leur usage.
5. Ajoutez des sections pour la configuration, la contribution (processus de PR), les licences et les contacts utiles.
6. Mettez à jour le README dès que les procédures changent (nouvelles dépendances, modifications de commande).

## Example
Le README d’un projet Node pourrait inclure :  
- `npm ci` pour installer les dépendances.  
- `npm run dev` pour démarrer en mode développement.  
- `npm run test` pour lancer les tests.  
- Une section décrivant les variables d’environnement à définir (`DATABASE_URL`, `JWT_SECRET`).

## Limitations
Le README doit rester concis et ne remplace pas une documentation détaillée pour les API ou l’architecture (voir les autres compétences).