---
description: Ce workflow coordonne la mise en œuvre d’une fonctionnalité du backlog de la définition à la livraison.
---

# implement-feature

Ce workflow coordonne la mise en œuvre d’une fonctionnalité du backlog de la définition à la livraison.

## Étapes
1. Sélectionnez la User Story à implémenter et lisez attentivement ses critères d’acceptation.
2. Activez la compétence `design/architecture` pour choisir l’architecture adaptée, puis `design/api-specification` si des endpoints doivent être ajoutés.
3. Concevez le schéma de données en appliquant `database/normalization` et `database/indexing-strategy`, puis rédigez les scripts avec `database/migration-script` si nécessaire.
4. Développez l’API en suivant les compétences `backend/rest-endpoint-design`, `backend/input-validation`, `backend/error-handling` et `backend/authentication-authorization` au besoin.
5. Implémentez l’interface utilisateur en appliquant `frontend/component-architecture`, `frontend/state-management`, `frontend/form-validation` et `frontend/accessibility-and-ux`.
6. Intégrez l’API côté front à l’aide de `fullstack/api-integration` et vérifiez la cohérence avec `fullstack/cross-layer-coordination`.
7. Rebuild l'application en appliquant `docker/SKILL.md` et s'assurer que l'application compile correctement.
8. Realisez les test en appliquant `run-tests` et s'assurer de n'avoir aucune regression sur l'intégralité du code.
9. Écrivez et exécutez les tests en suivant `testing/unit-testing-node`, `testing/frontend-testing-react`, `testing/integration-testing` et `testing/e2e-testing-playwright`.
10. Mettez à jour la documentation avec `documentation/api-documentation` et `documentation/readme-guidelines`.
11. Soumettez votre travail pour revue en vérifiant la liste de contrôle de `review-checklist.md`.
12. Une fois les revues terminées faire valider à l'utilisateur que les changements sont OK. Une fois fait lancer le workflow `gitflow`. Lorsque c'est terminé, s'assurer que tout est validé pour clore la feature et déplacer le dossier de la feature courante dans le dossier /feature/Completed-Feature

## Notes
Ce workflow s’étend sur plusieurs rôles et compétences. Adaptez ou sautez certaines étapes selon la nature de la fonctionnalité.