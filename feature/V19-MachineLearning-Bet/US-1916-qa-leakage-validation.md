# US-1916 - Validation de l'Intégrité et Anti-Leakage (QA)

**Rôle :** QA Engineer / Security Expert
**Objectif :** Garantir l'absence de fuite de données (leakage) et la robustesse du pipeline ML.

## Contexte
Une erreur de leakage (utiliser le futur pour prédire le passé) rendrait les modèles inutilisables en conditions réelles.

> [!IMPORTANT]
> **Indépendance Totale** : La validation QA doit confirmer que l'activation de la feature V19 n'entraîne aucune régression sur le reste de l'application.

## Tâches
- [ ] Développer une suite de tests auto-validant `as_of <= kickoff_date`. (Agent: `QA Engineer`, Skill: `Testing/Validation`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Vérifier la cohérence des probabilités. (Agent: `QA Engineer`, Skill: `Testing/Validation`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Simuler des pannes de données et vérifier la résilience. (Agent: `QA Engineer`, Skill: `Testing/Validation`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Auditer le Circuit Breaker. (Agent: `QA Engineer`, Skill: `Testing/Validation`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `qa-engineer.md` : Pour la conception de la suite de tests anti-leakage.
    - `security-expert.md` : Pour l'audit de robustesse du moteur de risque.
- **Skills :**
    - `machine-learning` : Protocoles de validation rigoureux en séries temporelles.
- **Workflows & Validation :**
    - `run-tests.md` : **Test final d'intégration** de toute la V16.
    - **Analyse des Logs Docker** : Vérifier les rapports de QA post-exécution.
    - **Validation 100%** : Certification finale du pipeline avant remise au client.

## Critères d'Acceptation
- 100% des tests anti-leakage passent.
- Le rapport de QA certifie la validité des datasets d'entraînement.
- Le Circuit Breaker coupe les recommandations dès que les seuils critiques sont franchis.
