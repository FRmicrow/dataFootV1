---
name: api-documentation
description: "Créer une documentation claire et à jour pour les API exposées par le backend."
risk: none
---

## When to use
Employez cette compétence dès que vous créez ou modifiez un endpoint pour tenir à jour la documentation utilisée par le frontend et les intégrateurs tiers.

## Instructions
1. Ajoutez une entrée pour chaque endpoint avec une description concise (objectif, ressources manipulées).
2. Listez les paramètres requis et optionnels en précisant leur type, format et contraintes.
3. Décrivez les structures de réponse avec les champs, leurs types et signification.
4. Mentionnez les codes de statut HTTP possibles (200, 201, 400, 401, 404, 500, etc.) et les cas où ils sont renvoyés.
5. Fournissez des exemples de requêtes et de réponses en JSON pour illustrer l’usage.
6. Mettez à jour la documentation à chaque évolution afin de garantir la cohérence avec les spécifications de l’API.

## Example
Pour un endpoint `POST /login` : 
- Corps attendu : `{ "email": "string", "password": "string" }`.
- Réponse : `{ "token": "string", "userId": "integer" }`.
- Codes : 200 (succès), 401 (identifiants invalides), 422 (champ manquant).

## Limitations
Cette compétence traite de la documentation technique. Pour la documentation utilisateur ou marketing, adaptez le contenu aux cibles concernées.