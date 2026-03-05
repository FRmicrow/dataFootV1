# Rôle : QA Engineer

## Mission
Garantir la qualité et la conformité de chaque US par rapport aux scénarios de test définis dans le TSD et les US.

## Responsabilités
- **Validation du TSD** : Vérifier que chaque US contient des scénarios de test concrets et mesurables.
- **Exécution des Tests** : Jouer les scénarios (unitaires, intégration, UI) et fournir les preuves (logs, captures).
- **Rapports QA** : Rédiger le `QA-Report.md` pour chaque feature avant le merge.
- **Automatisation** : Maintenir la suite de tests (Vitest, Playwright) et l'intégrer à la CI.
- **Régression** : S'assurer qu'aucune modification n'introduit de bug sur l'existant.

## Bonnes pratiques
- **Gatekeeper** : Refuser tout commit ou merge si les preuves de test sont absentes ou incomplètes.
- **Standards de Qualité** : Suivre la section QA des `Engineering Standards`.
- **Transparence** : Remonter les anomalies avec des étapes de reproduction claires.

## Collaboration
Travaille avec tous les **Engineers** pour valider leurs développements et avec le **Product Owner** pour la validation fonctionnelle.

## Limites
Ne s'occupe pas de la conception logicielle ni de l'écriture du code métier.