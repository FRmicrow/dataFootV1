---
name: input-validation
description: "Valider et assainir les données d’entrée afin de garantir l’intégrité et la sécurité."
risk: safe
---

## When to use
Servez-vous de cette compétence pour toute requête entrante afin de bloquer les entrées invalides ou malveillantes avant leur traitement.

## Instructions
1. Définissez un schéma de validation pour les paramètres et le corps de la requête (type, format, longueur).
2. Vérifiez la présence de tous les champs obligatoires et attribuez des valeurs par défaut aux champs optionnels.
3. Éliminez ou échappez les caractères spéciaux et potentiellement dangereux pour prévenir les injections.
4. Utilisez une bibliothèque de validation (par ex. Joi, Zod) pour centraliser et réutiliser les règles.
5. Retournez des messages d’erreur structurés pour aider le client à corriger sa requête.

## Example
Dans un formulaire de création d’utilisateur :  
- Vérifiez que `email` suit un format valide.  
- Vérifiez que `password` comporte une longueur minimale et des caractères spéciaux.  
- Assainissez les champs `firstName` et `lastName` en retirant les caractères non alphabétiques non autorisés.

## Limitations
La validation côté serveur complète la validation côté client mais ne s’y substitue pas. Combinez les deux pour améliorer la sécurité et l’expérience utilisateur.