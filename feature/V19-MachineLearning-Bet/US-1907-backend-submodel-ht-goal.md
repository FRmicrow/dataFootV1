# US-1907 - Sous-modèle ML : HT_GOAL

**Rôle :** Machine Learning Engineer
**Objectif :** Développer et entraîner le sous-modèle prédisant la probabilité d'un but en 1ère mi-temps (> 0.5 HT).

## Contexte
Ce modèle se concentre sur l'intensité offensive précoce. Il aide à la décision sur les marchés Over/Under HT.

> [!IMPORTANT]
> **Indépendance Totale** : Unité de traitement isolée. Ne modifie aucune autre logique de prédiction ou de pari du système actuel.

## Tâches
- [ ] Préparer le dataset (target = 'HT_GOAL_O0_5'). (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Entraîner une `Binary Logistic Regression`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Évaluer via Log Loss et calibration (ECE). (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Enregistrer le modèle dans `V3_Model_Registry`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Stocker `p_over_0_5` et `lambda_goals_1h` dans `V3_Submodel_Outputs`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la modélisation de Poisson et la calibration binaire.
    - `qa-engineer.md` : Pour les tests de calibration ECE.
- **Skills :**
    - `machine-learning` : Régression de Poisson, transformation de probabilités.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour valider le modèle HT Goal.
    - **Analyse des Logs Docker** : Vérifier que `lambda_goals_1h` est cohérent.
    - **Validation 100%** : Pas de leakage identifié dans les datasets de test.

## Critères d'Acceptation
- Le modèle est capable de distinguer les matchs à forte intensité offensive initiale.
- La calibration est vérifiée (Isotonic / Platt scaling si nécessaire).
- Les outputs sont disponibles pour le Meta-modèle.
