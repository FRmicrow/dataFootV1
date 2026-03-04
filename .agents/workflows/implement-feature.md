---
description: Ce workflow coordonne la mise en œuvre d’une fonctionnalité du backlog de la définition à la livraison.
---

# implement-feature

Ce workflow coordonne la mise en œuvre d’une fonctionnalité du backlog de la définition à la livraison.

## Étapes
1. Sélectionnez la User Story à implémenter et lisez attentivement ses critères d’acceptation.
2. **Analyse d'Architecture (Obligatoire)** : Avant de coder, consultez le dossier `.agents/project-architecture/` (notamment `backend-swagger.yaml` et `frontend-pages.md`) pour identifier précisément les fichiers à modifier et garantir que vous ne dupliquez pas du code existant.
3. **Planification et Soumission (BLOQUANT)** : AVANT DE FAIRE QUOI QUE CE SOIT, générez un fichier structuré `implementation_plan.md`. Il doit lister les modifications prévues et les rôles activés. **Spécificité Multi-US : si la fonctionnalité comporte plusieurs US, l'implementation plan doit définir une boucle où le développement et les tests (Étape 4 à 9) se feront US par US, avec validation stricte de l'utilisateur entre chaque module.** Soumettez le plan via `notify_user` (`BlockedOnUser=true`). Ne passez à la suite qu'après validation explicite.
4. **Design d'API (API-First)** : S'il y a un besoin de communication Client/Serveur, endossez le rôle `@api-designer`. Concevez les schémas d'entrée/sortie et mettez à jour `.agents/project-architecture/backend-swagger.yaml` *avant* d'écrire le moindre code. Faites valider ce contrat par l'utilisateur.
5. **Conception BDD (Si applicable)** : Si la User Story modifie le modèle de données, appliquez les principes de la règle `@database-architect` pour concevoir le schéma et rédigez les scripts de migration adéquats.
6. **Développement Backend** : Une fois le contrat API validé, implémentez l'API en respectant les principes de `@backend-engineer` et `@security-expert` (validation stricte des entrées via Zod en s'assurant que cela matche le Swagger, gestion des erreurs séparée).
7. **Développement Machine Learning (Si applicable)** : S'il s'agit d'une feature de prédiction, appliquez `@machine-learning-engineer` et utilisez les scripts du dossier `ml-service/scripts/`.
8. **Développement Frontend** : Implémentez l'interface utilisateur en utilisant les composants du Design System V3 (voir `frontend-pages.md`) et en respectant les principes de `@frontend-engineer`. Appuyez-vous sur le Swagger validé à l'étape 4 pour moquer ou intégrer l'API.
9. **PHASE DE VALIDATION (PAR US)** : Une fois le développement d'une US terminé :
    - **Contrôle Docker & Logs** : Endossez `@qa-engineer`. Lancez `docker compose build` et vérifiez les logs. Si crash, revenez au code.
    - **Checklist** : Vérifiez `review-checklist.md`.
    - **Validation Intermédiaire (BLOQUANT)** : Vous ne devez JAMAIS enchaîner le développement de l'US suivante sans obtenir l'accord du P.O via `notify_user` (`BlockedOnUser=true`). Une fois validé, **bouclez sur l'étape 4** pour la prochaine US.
10. **TESTS GLOBAUX & RAPPORT QA (FIN DE FEATURE)** : Une fois **TOUTES** les US implémentées et validées individuellement, le `@qa-engineer` effectue les tests globaux finaux. Il **DOIT IMPÉRATIVEMENT** générer un document Markdown (par ex. `feature/Vxx-[Nom]/QA-Report.md`) faisant foi du bon fonctionnement global.
11. **LIVRAISON GÉNÉRÉE PAR LE QA (BLOQUANT)** : Si et seulement si la phase 10 est un succès et le rapport QA rédigé :
    - Déclenchez **automatiquement** le workflow `/gitflow`.
    - L'agent `@git-engineer` prendra le relais pour **l'archivage du dossier de feature** dans `Completed-Feature`, le commit final, la fusion `main` et la suppression de branche.

## Notes
- Ce workflow s'adapte au rôle en cours (Frontend, Backend, ML, Fullstack). Ne réalisez que les étapes pertinentes pour la User Story traitée.
- La consultation de `.agents/project-architecture/` à l'étape 2 est non-négociable pour maintenir la cohérence du projet V3.