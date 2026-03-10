---
name: machine-learning
description: "Concevoir des modèles ML pour prédire les matchs. Utiliser quand on travaille dans ml-service/ ou les features de prédiction."
risk: critical
---

## When to use
Utilisez cette compétence lorsque vous devez développer, entraîner, évaluer et déployer des modèles de machine learning destinés à prédire les issues de rencontres sportives à partir de données historiques.

## Instructions
1. **Collecte de données** : rassemblez les données pertinentes (résultats passés, classements, statistiques d’équipes et de joueurs).
2. **Préparation des données** : nettoyez et transformez les données ; gérez les valeurs manquantes et encodez les variables catégorielles.
3. **Ingénierie des features** : créez des indicateurs pertinents (notes d’équipe, forme récente, performance à domicile/extérieur).
4. **Sélection du modèle** : choisissez un algorithme adapté (arbres de décision, forêt aléatoire, gradient boosting). Des travaux récents montrent que les modèles CatBoost obtiennent de très bons résultats pour ce type de tâche:contentReference[oaicite:1]{index=1}.
5. **Entraînement et évaluation** : entraînez le modèle sur un jeu d’entraînement et évaluez-le sur un jeu de validation à l’aide de métriques (précision, score Brier, F1).
6. **Interprétabilité et biais** : analysez l’importance des variables et vérifiez qu’aucun biais injustifié n’impacte les prédictions.
7. **Déploiement** : encapsulez le modèle dans un service backend (API REST) et prévoyez des processus de surveillance et de réentraînement périodique.

## Example
Pour prédire le vainqueur d’un match, collectez les dix derniers résultats et les pi‑ratings de chaque équipe, créez un dataset de caractéristiques (différence de buts, classement), entraînez un modèle de gradient boosting, mesurez la précision et exposez une route `/predict` qui prend en entrée deux équipes et renvoie la probabilité de victoire.

## Limitations
Cette compétence couvre la conception et le développement de modèles standards. Les architectures de deep learning avancées, la gestion de flux de données en temps réel ou l’orchestration Big Data doivent être traitées par des compétences complémentaires.