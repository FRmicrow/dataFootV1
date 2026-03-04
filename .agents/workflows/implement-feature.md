---
description: Ce workflow coordonne la mise en œuvre d’une fonctionnalité du backlog de la définition à la livraison.
---

# implement-feature

Ce workflow coordonne la mise en œuvre d’une fonctionnalité du backlog de la définition à la livraison.

## Étapes
1. Sélectionnez la User Story à implémenter et lisez attentivement ses critères d’acceptation.
2. **Analyse d'Architecture (Obligatoire)** : Avant de coder, consultez le dossier `.agents/project-architecture/` (notamment `backend-swagger.yaml` et `frontend-pages.md`) pour identifier précisément les fichiers à modifier et garantir que vous ne dupliquez pas du code existant.
3. **Planification et Soumission (BLOQUANT)** : AVANT DE FAIRE QUOI QUE CE SOIT, générez un fichier structuré `implementation_plan.md` listant les modifications exactes prévues, les rôles qui seront activés (`@api-designer`, `@backend-engineer`, etc) et pourquoi. Utilisez `notify_user` en `BlockedOnUser=true` pour soumettre ce plan. Ne passez aux étapes suivantes qu'une fois le plan explicitement "Validé" par le P.O.
4. **Design d'API (API-First)** : S'il y a un besoin de communication Client/Serveur, endossez le rôle `@api-designer`. Concevez les schémas d'entrée/sortie et mettez à jour `.agents/project-architecture/backend-swagger.yaml` *avant* d'écrire le moindre code. Faites valider ce contrat par l'utilisateur.
5. **Conception BDD (Si applicable)** : Si la User Story modifie le modèle de données, appliquez les principes de la règle `@database-architect` pour concevoir le schéma et rédigez les scripts de migration adéquats.
6. **Développement Backend** : Une fois le contrat API validé, implémentez l'API en respectant les principes de `@backend-engineer` et `@security-expert` (validation stricte des entrées via Zod en s'assurant que cela matche le Swagger, gestion des erreurs séparée).
7. **Développement Machine Learning (Si applicable)** : S'il s'agit d'une feature de prédiction, appliquez `@machine-learning-engineer` et utilisez les scripts du dossier `ml-service/scripts/`.
8. **Développement Frontend** : Implémentez l'interface utilisateur en utilisant les composants du Design System V3 (voir `frontend-pages.md`) et en respectant les principes de `@frontend-engineer`. Appuyez-vous sur le Swagger validé à l'étape 4 pour moquer ou intégrer l'API.
9. **Build & Qualité** : Appliquez les règles `@docker-engineer` et `@qa-engineer`. Assurez-vous que les conteneurs montent correctement (`docker compose build`) et qu'il n'y a pas de régressions.
10. **Checklist de Validation** : Avant de clore l'implémentation, passez en revue chaque point de la `review-checklist.md`.
11. **Finalisation et Livraison** : Une fois que le code fonctionne de bout en bout, appelez **automatiquement** le workflow `/gitflow`. L'agent `@git-engineer` prendra le relais pour planifier les commits, faire valider la fusion vers `main` et supprimer proprement la branche (voir règles du gitflow). Une fois la Feature entièrement terminée (toutes les US livrées), déplacez le **dossier entier de la fonctionnalité** (`feature/Vxx-[Nom]`) dans le répertoire `feature/Completed-Feature/` afin de garder un espace de travail propre.

## Notes
- Ce workflow s'adapte au rôle en cours (Frontend, Backend, ML, Fullstack). Ne réalisez que les étapes pertinentes pour la User Story traitée.
- La consultation de `.agents/project-architecture/` à l'étape 2 est non-négociable pour maintenir la cohérence du projet V3.