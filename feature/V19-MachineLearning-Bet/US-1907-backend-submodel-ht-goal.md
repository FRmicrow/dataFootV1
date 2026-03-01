# US-1907 - Sous-modèle ML : HT_GOAL

**Rôle :** Machine Learning Engineer
**Objectif :** Développer et entraîner le sous-modèle prédisant la probabilité d'un but en 1ère mi-temps (> 0.5 HT).

## Contexte
Ce modèle se concentre sur l'intensité offensive précoce. Il aide à la décision sur les marchés Over/Under HT.

## Tâches
- [ ] Préparer le dataset (target = 'HT_GOAL_O0_5').
- [ ] Entraîner une `Binary Logistic Regression` (calibrée) ou une `Poisson Regression`.
- [ ] Évaluer via Log Loss et calibration (ECE).
- [ ] Enregistrer le modèle dans `V3_Model_Registry`.
- [ ] Stocker `p_over_0_5` et `lambda_goals_1h` dans `V3_Submodel_Outputs`.

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la modélisation de Poisson et la calibration binaire.
    - `qa-engineer.md` : Pour les tests de calibration ECE.
- **Skills :**
    - `machine-learning` : Régression de Poisson, transformation de probabilités.

## Critères d'Acceptation
- Le modèle est capable de distinguer les matchs à forte intensité offensive initiale.
- La calibration est vérifiée (Isotonic / Platt scaling si nécessaire).
- Les outputs sont disponibles pour le Meta-modèle.
