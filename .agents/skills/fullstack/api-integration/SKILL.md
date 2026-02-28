---
name: api-integration
description: "Intégrer les appels API dans l’interface utilisateur et gérer les données reçues."
risk: safe
---

## When to use
Employez cette compétence chaque fois que le frontend doit communiquer avec le backend (lecture et écriture de données).

## Instructions
1. Répertoriez les endpoints nécessaires et leurs paramètres, en vous référant à la documentation API.
2. Utilisez un client HTTP (fetch, axios) pour effectuer des appels asynchrones, en gérant les promesses ou en utilisant async/await.
3. Gérez les états de chargement (loading), de succès et d’erreur pour informer l’utilisateur.
4. Transformez les données reçues (formatage de dates, tri des listes) avant de les passer aux composants.
5. Nettoyez les abonnements ou annulez les requêtes lorsque les composants sont démontés pour éviter les fuites de mémoire.

## Example
Pour récupérer et afficher une liste d’utilisateurs, appelez `GET /users`, stockez la réponse dans un état local, affichez un spinner pendant l’attente et un message d’erreur en cas d’échec.

## Limitations
Cette compétence se concentre sur la consommation d’API côté client. La création et la sécurisation des endpoints relèvent des compétences backend.