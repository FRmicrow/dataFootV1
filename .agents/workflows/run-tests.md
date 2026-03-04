---
description: Ce workflow décrit comment exécuter les suites de tests et analyser les résultats.
---

# run-tests

Ce workflow décrit comment exécuter les suites de tests et analyser les résultats.

## Étapes
1. Lancez les tests unitaires backend avec la compétence `testing/unit-testing-node`.
2. Exécutez les tests de composants front-end via `testing/frontend-testing-react`.
3. Lancez les tests d’intégration en utilisant `testing/integration-testing`.
4. Exécutez les tests end‑to‑end avec `testing/e2e-testing-playwright`.
5. Analysez les rapports de tests, identifiez les échecs et corrigez le code en conséquence.
6. Répétez le cycle de test jusqu’à ce que toutes les suites soient passées.
7. Documentez les problèmes rencontrés et les solutions apportées pour référence future.

## Notes
Ce workflow est généralement automatisé dans la CI. Toutefois, il peut être exécuté localement pour un diagnostic rapide.
