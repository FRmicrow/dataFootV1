# US-1908 - Sous-modèle ML : CORNERS_TOTAL

**Rôle :** Machine Learning Engineer
**Objectif :** Prédire le nombre total de corners du match (FT) via une régression de Poisson.

## Contexte
Les corners sont un marché à forte valeur. Ce modèle prédit l'espérance mathématique (`lambda_total`) du nombre de corners.

> [!IMPORTANT]
> **Indépendance Totale** : Système de prédiction parallèle. Les données produites sont stockées indépendamment.

## Tâches
- [ ] Préparer le dataset (target = 'CORNERS_TOTAL'). (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Implémenter une `Poisson Regression`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Évaluer via MAE (Mean Absolute Error) et Poisson Deviance. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Enregistrer dans `V3_Model_Registry`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Générer des probabilités pour les lignes de betting standard. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la modélisation de Poisson et le choix des lois de probabilité.
    - `qa-engineer.md` : Pour la validation de la déviance et de l'erreur absolue (MAE).
- **Skills :**
    - `machine-learning` : Régression de comptage, statistiques sportives.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour vérifier le modèle Corners.
    - **Analyse des Logs Docker** : Vérifier que `lambda_total` reste réaliste.
    - **Validation 100%** : Comparer les probabilités Over/Under avec les cotes moyennes du marché.

## Critères d'Acceptation
- L'erreur moyenne (MAE) est inférieure à la baseline historique.
- Le modèle prend en compte les features "For" et "Against" (capacité à gagner des corners vs vulnérabilité).
- Les probabilités par ligne sont calculées via la loi de Poisson à partir du lambda.
