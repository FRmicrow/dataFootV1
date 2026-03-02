# US-1910 - Meta-modèle Final : 1N2 Meta-V1

**Rôle :** Machine Learning Engineer
**Objectif :** Développer le modèle final de prédiction du résultat FT exploitant les signaux de tous les sous-modèles.

## Contexte
Ce modèle "Meta" combine les features de base et les probabilités calculées par les sous-moèles (HT, Corners, Cards) pour une prédiction 1N2 de haute précision.

> [!IMPORTANT]
> **Indépendance Totale** : Le Meta-modèle est une entité isolée. Ses prédictions n'influencent aucun autre algorithme de l'application.

## Tâches
- [ ] Préparer le dataset `META_V1` (Feature Store + Submodel Outputs). (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Implémenter un `XGBoost Multiclass` ou une `Logistic Regression`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Appliquer une calibration post-entraînement (Platt Scaling ou Isotonic). (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Effectuer un backtest de validation sur la saison en cours. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Enregistrer comme modèle "Challenger" prêt pour les simulations. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour l'architecture du Meta-modèle et l'empilement (stacking).
    - `fullstack-engineer.md` : Pour la cohérence entre les outputs submodels et le meta-modèle.
- **Skills :**
    - `machine-learning` : Algorithmes de Boosting (XGBoost), calibration avancée.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour valider le Meta-modèle.
    - **Analyse des Logs Docker** : Surveiller le temps d'inférence des prédictions combinées.
    - **Validation 100%** : Vérifier que Log Loss Meta < Log Loss Submodels.
    - **Interface** : Vérifier visuellement quelques prédictions dans Prisma Studio si besoin.

## Critères d'Acceptation
- Le Meta-modèle surperforme systématiquement les sous-modèles individuels sur la target 1N2.
- La Log Loss est minimisée et la calibration est quasi-parfaite (ECE < 0.05).
- Toutes les prédictions sont historisées dans `V3_ML_Predictions`.
