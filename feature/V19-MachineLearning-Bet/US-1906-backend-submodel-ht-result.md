# US-1906 - Sous-modèle ML : HT_RESULT

**Rôle :** Machine Learning Engineer
**Objectif :** Développer et entraîner le sous-modèle prédisant le résultat à la mi-temps (1X2 HT).

## Contexte
Le résultat à la mi-temps est un signal fort pour le résultat final. Ce modèle prédit `P(HomeHTWin)`, `P(HTDraw)`, `P(AwayHTWin)`.

## Tâches
- [ ] Préparer le dataset d'entraînement via `V3_ML_Feature_Store_V2` (target = 'HT_RESULT').
- [ ] Implémenter une `Multinomial Logistic Regression` (ou XGBoost avec calibration).
- [ ] Réaliser un découpage `walk-forward` pour l'évaluation (pas de random split).
- [ ] Enregistrer le modèle dans `V3_Model_Registry` avec ses métriques (Log Loss, Brier Score).
- [ ] Générer et stocker les prédictions dans `V3_Submodel_Outputs`.

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour le choix de l'algo et le protocole de validation.
    - `qa-engineer.md` : Pour la validation de la log loss par rapport à la baseline.
- **Skills :**
    - `machine-learning` : Classification multiclasse, calibration de probabilités.

## Critères d'Acceptation
- Le modèle affiche une Log Loss inférieure à la baseline de probabilités constantes.
- Les métriques d'évaluation sont stockées en JSON dans le registre.
- Les outputs sont correctement formatés (somme des probas = 1).
