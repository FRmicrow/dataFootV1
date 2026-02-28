---
trigger: always_on
---

# Conventions de Messages de Commit

## Objectif
Des messages de commit clairs facilitent la compréhension de l’historique et la relecture du code.

## Format
- Structurez le message en deux parties : un en‑tête et un corps optionnel.
- **En‑tête :** commencez par un verbe à l’infinitif (feat, fix, chore…), suivi d’un résumé concis (50 caractères maximum).
- Laissez une ligne vide après l’en‑tête si vous ajoutez un corps.
- **Corps :** expliquez le contexte, la motivation et les impacts du changement.

## Bonnes pratiques
- Faites des commits atomiques : un commit = une modification logique.
- Référencez les issues ou User Stories (ex. `Ref: V16‑US150`).
- Évitez les messages génériques du type « update » ou « fix bug » sans précision.
- Ne commettez jamais de secrets ou de données sensibles.

## Exemples

    feat: implémenter la pagination des résultats
    
    La route GET /users renvoie désormais les résultats paginés.
    Ajout des paramètres page et size avec validation.
    Ref: V16‑US150

    fix: corriger la requête SQL sur les commandes
    
    La jointure manquait un filtre, ce qui provoquait un doublon.
    Ajout d’un test de régression.

## Limitations
Ces conventions s’appliquent aux messages de commit manuels. Les messages générés automatiquement lors des fusions peuvent suivre un format différent.