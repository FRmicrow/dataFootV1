# US-1908 - Sous-modèle ML : CORNERS_TOTAL

**Rôle :** Machine Learning Engineer
**Objectif :** Prédire le nombre total de corners du match (FT) via une régression de Poisson.

## Contexte
Les corners sont un marché à forte valeur. Ce modèle prédit l'espérance mathématique (`lambda_total`) du nombre de corners.

## Tâches
- [ ] Préparer le dataset (target = 'CORNERS_TOTAL').
- [ ] Implémenter une `Poisson Regression` ou `Negative Binomial` (mieux si sur-dispersion).
- [ ] Évaluer via MAE (Mean Absolute Error) et Poisson Deviance.
- [ ] Enregistrer dans `V3_Model_Registry`.
- [ ] Générer des probabilités pour les lignes de betting standard (Over 8.5, 9.5, 10.5) et stocker dans `V3_Submodel_Outputs`.

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la modélisation de Poisson et le choix des lois de probabilité.
    - `qa-engineer.md` : Pour la validation de la déviance et de l'erreur absolue (MAE).
- **Skills :**
    - `machine-learning` : Régression de comptage, statistiques sportives.

## Critères d'Acceptation
- L'erreur moyenne (MAE) est inférieure à la baseline historique.
- Le modèle prend en compte les features "For" et "Against" (capacité à gagner des corners vs vulnérabilité).
- Les probabilités par ligne sont calculées via la loi de Poisson à partir du lambda.
