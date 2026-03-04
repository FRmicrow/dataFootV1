# US-1909 - Sous-modèle ML : CARDS_TOTAL

**Rôle :** Machine Learning Engineer
**Objectif :** Prédire le nombre total de cartons (jaunes/rouges pondérés) via une régression Negative Binomial.

## Contexte
La discipline est un facteur de risque et une opportunité de bet. On prédit `lambda_total_cards`.

> [!IMPORTANT]
> **Indépendance Totale** : Analyse disciplinaire parallèle. Zéro impact sur les fonctionnalités de gestion de match ou d'affichage de cartons existantes.

## Tâches
- [ ] Préparer le dataset (target = 'CARDS_TOTAL'). (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Implémenter une `Negative Binomial Regression`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Intégrer des features de contexte (Derby flag, High Stakes). (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Évaluer via MAE et calibration des probabilités Over X.5. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Stocker les résultats dans `V3_Submodel_Outputs`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la modélisation Negative Binomial et les facteurs de contexte.
    - `security-expert.md` : Pour s'assurer que les données de discipline sont traitées sans biais.
- **Skills :**
    - `machine-learning` : Modélisation de la variance élevée (overdispersion).

## Critères d'Acceptation
- Le modèle est capable d'identifier les matchs à haute tension (plus grand lambda).
- La distribution prédite est cohérente avec les observations historiques (pas de lambda délirant).
- Les outputs sont utilisables par le moteur de risque.
