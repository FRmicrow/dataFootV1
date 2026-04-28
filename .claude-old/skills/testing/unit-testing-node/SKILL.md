---
name: unit-testing-node
description: "Écrire des tests unitaires Node.js. Utiliser quand on teste une fonction isolée avec Vitest dans backend/test/."
risk: safe
---

## When to use
Utilisez cette compétence pour valider le comportement de fonctions ou de modules Node.js de manière isolée, avant de les intégrer au reste du système.

## Instructions
1. Choisissez un framework de test (Vitest) et configurez-le dans votre projet Node.js.
2. Créez un fichier de test pour chaque module et importez-y la fonction ou la classe à tester.
3. Rédigez des tests couvrant les cas d’utilisation attendus ainsi que les cas limites et erreurs possibles.
4. Utilisez des mocks pour isoler le module testé de ses dépendances (base de données, API externes).
5. Automatisez l’exécution des tests via un script NPM et intégrez-les à votre pipeline d’intégration continue.

## Example
Pour une fonction `sum(a, b)`, créez un fichier `sum.test.js` qui vérifie que `sum(2, 3)` renvoie `5` et que l’appel avec des arguments non numériques déclenche une erreur.

## Limitations
Cette compétence ne couvre pas les tests d’intégration ou end-to-end, qui sont définis dans d’autres compétences de test.