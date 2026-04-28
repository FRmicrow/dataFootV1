---
name: load-testing
description: "Tester les performances sous charge. Utiliser quand on mesure la capacité du système ou optimise les temps de réponse."
risk: safe
---

## When to use
Activez cette compétence avant des mises en production majeures ou pour évaluer la robustesse d’une application à fort trafic, en complément des tests fonctionnels.

## Instructions
1. Définissez des scénarios de charge représentatifs (nombre d’utilisateurs simultanés, taux de requêtes par seconde) en accord avec les exigences métier.
2. Sélectionnez un outil de tests de charge (k6, Gatling, JMeter) et configurez-le pour exécuter vos scénarios.
3. Lancez des tests en augmentant progressivement la charge jusqu’à atteindre le niveau visé ou à détecter des points de rupture.
4. Collectez les métriques (latence, débit, taux d’erreur, utilisation CPU/mémoire) et analysez les goulots d’étranglement éventuels.
5. Ajustez le code, les paramètres de configuration ou l’infrastructure selon les résultats et répétez les tests jusqu’à obtenir un niveau de performance satisfaisant.

## Example
Pour tester un service d’authentification, simulez 500 utilisateurs qui se connectent simultanément, mesurez le temps moyen de réponse et le pourcentage de connexions réussies. Identifiez les limites de la base de données ou du CPU si les temps de réponse deviennent excessifs.

## Limitations
Cette compétence se concentre sur la simulation de charge. L’optimisation de code, la mise à l’échelle horizontale ou le tuning d’infrastructure doivent être traités séparément.