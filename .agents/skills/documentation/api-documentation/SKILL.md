---
name: api-documentation
description: "Créer une documentation claire et à jour pour les API exposées par le backend."
risk: none
---

## Objectif
Garantir que le fichier `.agents/project-architecture/backend-swagger.yaml` reste la source absolue de vérité concernant les API Backend du projet StatFootV3.

## Quand l'utiliser
Activez cette compétence **à la fin de chaque tâche Backend** impliquant :
- La création d'une nouvelle route API.
- La modification d'une route existante (changement de méthode, de path).
- L'ajout, la suppression ou la modification de paramètres d'entrée (Query, Path, Body).
- La modification du format de réponse (JSON retourné).

## Instructions pour l'Agent
1. **Lecture de l'existant :** Avant toute modification, vous devez lire le fichier `.agents/project-architecture/backend-swagger.yaml` pour comprendre sa structure (OpenAPI 3.0.0).
2. **Identification des changements :** Analysez le contrôleur (`backend/src/controllers/...`) et le routeur (`backend/src/routes/...`) que vous venez de coder.
3. **Analyse des schémas (Crucial) :** Consultez obligatoirement `backend/src/schemas/v3Schemas.js` pour les routes V3 afin de déterminer les paramètres exacts attendus par Zod et leur type (string, number, boolean, array, object).
4. **Mise à jour :** Éditez le fichier `backend-swagger.yaml` en ajoutant la nouvelle route au bon endroit (sous le bon "tag") ou en mettant à jour la route existante.
5. **Formatage :** Assurez-vous que le YAML est correctement indenté (espaces, pas de tabulations) et respecte le standard OpenAPI 3.0.

## Anti-Hallucination
N'inventez JAMAIS un paramètre ou un format de réponse dans le Swagger qui ne correspondrait pas EXACTEMENT au code du contrôleur et au schéma Zod. Le Swagger doit être le reflet exact du code réel.