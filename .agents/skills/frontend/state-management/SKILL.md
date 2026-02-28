---
name: state-management
description: "Gérer l’état d’une application front-end de manière prévisible et efficace."
risk: safe
---

## When to use
Employez cette compétence dès que les composants doivent partager des données ou que l’état doit persister entre différentes pages.

## Instructions
1. Identifiez les données à partager et déterminez si elles doivent être globales, partagées ou locales.
2. Choisissez un outil de gestion d’état adapté (Context API, Redux, Zustand) en fonction de la complexité et des performances souhaitées.
3. Structurez l’état en slices ou modules séparés et créez des actions ou des setters pour le modifier.
4. Sélectionnez uniquement les parties nécessaires de l’état dans vos composants pour éviter les re-rendus inutiles.
5. Ajoutez des middleware ou des outils de debug (Redux DevTools) pour suivre les mutations et faciliter le débogage.

## Example
Dans une application de gestion de tâches, utilisez Redux pour stocker la liste des tâches et leur état (à faire, en cours, terminées), et créez des actions `addTask`, `updateTask`, `removeTask` pour gérer la liste.

## Limitations
Cette compétence se limite au front-end ; la synchronisation des données avec le backend ou le stockage hors ligne nécessite des stratégies supplémentaires.