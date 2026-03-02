# US-1906 - Sous-modèle ML : HT_RESULT

**Rôle :** Machine Learning Engineer
**Objectif :** Développer et entraîner le sous-modèle prédisant le résultat à la mi-temps (1X2 HT).

## Contexte
Le résultat à la mi-temps est un signal fort pour le résultat final. Ce modèle prédit `P(HomeHTWin)`, `P(HTDraw)`, `P(AwayHTWin)`.

> [!IMPORTANT]
> **Indépendance Totale** : Les modèles et leurs outputs sont confinés aux tables `V3_Model_Registry` et `V3_Submodel_Outputs`. Isolation complète garantie.

## Tâches
- [ ] Préparer le dataset d'entraînement via `V3_ML_Feature_Store_V2`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Implémenter une `Multinomial Logistic Regression`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Réaliser un découpage `walk-forward` pour l'évaluation. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Enregistrer le modèle dans `V3_Model_Registry`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Générer et stocker les prédictions dans `V3_Submodel_Outputs`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour le choix de l'algo et le protocole de validation.
    - `qa-engineer.md` : Pour la validation de la log loss par rapport à la baseline.
- **Skills :**
    - `machine-learning` : Classification multiclasse, calibration de probabilités.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour vérifier les performances du modèle HT.
    - **Analyse des Logs Docker** : Surveiller les métriques d'entraînement.
    - **Validation 100%** : S'assurer que les probabilités sont bien calibrées.

## Critères d'Acceptation
- Le modèle affiche une Log Loss inférieure à la baseline de probabilités constantes.
- Les métriques d'évaluation sont stockées en JSON dans le registre.
- Les outputs sont correctement formatés (somme des probas = 1).
