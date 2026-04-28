---
name: api-specification
description: "Définir et documenter les API. Utiliser quand on met à jour backend-swagger.yaml ou conçoit un contrat API."
risk: safe
---

## When to use
Activez cette compétence lors de la conception d’un nouveau service ou de la refonte d’un API existant, afin d’assurer la compréhension commune entre backend, frontend et intégrateurs.

## Instructions
1. Recensez les ressources et actions à exposer à partir des User Stories ou exigences fonctionnelles.
2. Pour chaque endpoint, indiquez la méthode HTTP, l’URL, les paramètres, le format attendu du corps de requête et de réponse, et les codes de retour possibles.
3. Utilisez une nomenclature cohérente pour les ressources et adoptez une version d’API (`/api/v1`) pour gérer les évolutions.
4. Décrivez les exemples de requêtes et de réponses en JSON, y compris les champs facultatifs.
5. Mettez à jour la documentation à chaque modification afin de garder le backend et le frontend synchronisés.

## Example
Pour gérer des posts :
- `GET /posts` : liste paginée de posts.  
- `POST /posts` : création d’un post avec validation des champs (titre, contenu).  
- `GET /posts/{id}` : récupération d’un post spécifique.  
- `PATCH /posts/{id}` : mise à jour partielle d’un post.  

## Limitations
Cette compétence ne couvre pas la sécurité ou la logique métier ; elle fournit uniquement une spécification contractuelle de l’API.