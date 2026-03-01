# US-1910 - Meta-modèle Final : 1N2 Meta-V1

**Rôle :** Machine Learning Engineer
**Objectif :** Développer le modèle final de prédiction du résultat FT exploitant les signaux de tous les sous-modèles.

## Contexte
Ce modèle "Meta" combine les features de base et les probabilités calculées par les sous-moèles (HT, Corners, Cards) pour une prédiction 1N2 de haute précision.

## Tâches
- [ ] Préparer le dataset `META_V1` (Feature Store + Submodel Outputs).
- [ ] Implémenter un `XGBoost Multiclass` ou une `Logistic Regression` de haut niveau.
- [ ] Appliquer une calibration post-entraînement (Platt Scaling ou Isotonic).
- [ ] Effectuer un backtest de validation sur la saison en cours (Log Loss & Brier Score).
- [ ] Enregistrer comme modèle "Challenger" prêt pour les simulations.

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour l'architecture du Meta-modèle et l'empilement (stacking).
    - `fullstack-engineer.md` : Pour la cohérence entre les outputs submodels et le meta-modèle.
- **Skills :**
    - `machine-learning` : Algorithmes de Boosting (XGBoost), calibration avancée.

## Critères d'Acceptation
- Le Meta-modèle surperforme systématiquement les sous-modèles individuels sur la target 1N2.
- La Log Loss est minimisée et la calibration est quasi-parfaite (ECE < 0.05).
- Toutes les prédictions sont historisées dans `V3_ML_Predictions`.
