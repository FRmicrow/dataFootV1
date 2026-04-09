---
name: cross-layer-coordination
description: "Coordonner backend et frontend. Utiliser quand une feature touche simultanément l'API et l'interface."
risk: safe
---

## When to use
Activez cette compétence dès que vos modifications impactent simultanément la base de données, le backend et le frontend, afin de maintenir la cohérence et de prévenir les régressions.

## Instructions
1. Définissez des types et schémas communs (interfaces TypeScript, classes) et partagez-les dans un package utilisé par le backend et le frontend.
2. Adaptez les migrations de base de données et les modèles backend à toute modification de la structure des données.
3. Mettez à jour les DTO (Data Transfer Objects) et les composants frontend pour refléter ces changements.
4. Effectuez des tests bout-à-bout pour vérifier que les flux de données (création, modification, suppression) fonctionnent correctement de la base jusqu’à l’interface.
5. Documentez les modifications croisant plusieurs couches pour aider l’équipe et faciliter la maintenance.

## Example
Lorsqu’on ajoute un champ `dateOfBirth` au modèle `User`, créez une migration SQL, ajustez l’interface correspondante dans votre code commun, modifiez le contrôleur d’API et mettez à jour le formulaire d’utilisateur dans le frontend.

## Limitations
Cette compétence concerne la synchronisation technique. Elle ne couvre pas la gestion de projet ni la coordination des équipes.