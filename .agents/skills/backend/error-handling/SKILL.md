---
name: error-handling
description: "Gérer les erreurs de manière centralisée et fournir des réponses cohérentes."
risk: safe
---

## When to use
Activez cette compétence pour capturer et traiter de manière uniforme les erreurs afin d’améliorer la résilience et la lisibilité de votre API.

## Instructions
1. Centralisez la capture des exceptions via un middleware global ou une fonction utilitaire.
2. Classez les erreurs (validation, authentification, autorisation, interne) et assignez-leur des codes HTTP et des messages adaptés.
3. Ne renvoyez jamais d’informations sensibles dans les messages d’erreur (stacks, détails d’implémentation).
4. Journalisez les erreurs critiques pour faciliter le débogage et la supervision.
5. Testez les différents scénarios d’erreur pour vous assurer que votre gestion est robuste et cohérente.

## Example
Si un identifiant d’utilisateur est absent : renvoyez `400 Bad Request` avec un message `{ "error": "Missing user ID" }`. Si la ressource n’existe pas : renvoyez `404 Not Found` avec `{ "error": "User not found" }`.

## Limitations
Cette compétence couvre les erreurs côté backend. Les erreurs côté frontend doivent être traitées par les compétences de test et d’interface utilisateur.