---
name: rest-endpoint-design
description: "Concevoir des endpoints REST cohérents pour exposer les services backend."
risk: safe
---

## When to use
Utilisez cette compétence lorsque vous définissez ou réorganisez des routes HTTP pour votre service backend.

## Instructions
1. Identifiez les ressources principales (noms au pluriel) et attribuez une route de base à chacune (ex. `/users`, `/orders`).
2. Utilisez les verbes HTTP appropriés : GET pour lire, POST pour créer, PUT/PATCH pour mettre à jour, DELETE pour supprimer.
3. Structurez les URLs de manière hiérarchique pour exprimer les relations (ex. `/users/{id}/orders`).
4. Prévoyez des paramètres pour la pagination, le filtrage et le tri.
5. Retournez des codes d’état cohérents (201 en cas de création, 200 pour un succès, 400/404 selon l’erreur) et documentez chaque endpoint.

## Example
Pour la ressource `products` :  
- `GET /products` : lister les produits.  
- `POST /products` : créer un produit.  
- `GET /products/{id}` : récupérer un produit.  
- `PUT /products/{id}` : mettre à jour un produit.  

## Limitations
Cette compétence se concentre sur la conception d’URL et de conventions HTTP. L’implémentation, la sécurité et la validation des entrées sont abordées dans d’autres compétences backend.