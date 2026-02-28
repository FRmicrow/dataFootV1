---
trigger: always_on
---

# Liste de Vérification pour la Revue de Code

Cette checklist aide à garantir la qualité et la cohérence lors des revues de pull requests.

## Architecture et Design
- Le changement respecte‑t‑il l’architecture existante et les conventions du projet ?
- La responsabilité de chaque module est‑elle claire et bien délimitée ?
- Le code réutilise‑t‑il des composants existants plutôt que d’en recréer inutilement ?

## Qualité de Code
- Le code est‑il lisible et correctement formaté ?
- Les noms de variables et de fonctions sont‑ils explicites ?
- Les commentaires sont‑ils pertinents et à jour ?

## Fonctionnalité
- La modification répond‑elle à la User Story ou au ticket ?
- Les cas limites et les erreurs potentielles sont‑ils pris en compte ?
- Les critères d’acceptation du Product Owner sont‑ils satisfaits ?

## Tests
- Des tests appropriés (unitaires, intégration, end‑to‑end) ont‑ils été ajoutés ou mis à jour ?
- Les tests passent‑ils sans échec ?
- La couverture de code reste‑t‑elle suffisante ?

## Sécurité
- Les entrées utilisateur sont‑elles correctement validées et assainies ?
- Aucune information sensible n’est‑elle exposée ?
- Les dépendances ajoutées sont‑elles fiables et maintenues ?

## Performance
- Le code introduit‑il des ralentissements ou une consommation excessive de ressources ?
- Les optimisations (mise en cache, lazy loading) sont‑elles utilisées si nécessaire ?

## Documentation
- Les changements sont‑ils bien documentés (README, commentaires, diagrammes) ?
- Les API et contrats de données sont‑ils à jour ?

## Validation finale
- Le build CI s’exécute‑t‑il sans erreurs ?
- Toutes les demandes de modification soulevées lors de la revue ont‑elles été traitées ?