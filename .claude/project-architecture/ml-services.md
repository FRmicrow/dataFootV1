# Services de Machine Learning (ML-Service)

Le `ml-service` est un micro-service Python responsable de toute l'intelligence artificielle du projet. Contrairement au Backend qui est un serveur web transactionnel, ce service excelle dans le traitement lourd de données et les calculs statistiques.

## Architecture Interne (`ml-service/src/`)

L'architecture est découpée intelligemment pour faciliter le cycle de vie des modèles :

- `models/` : Contient les définitions des algorithmes prédictifs (CatBoost, régressions) pour divers marchés de paris (1N2, Over/Under, Buteurs...).
- `orchestrator/` : Gère le pipeline de données. Il orchestre l'extraction (de la DB partagée SQLite), la préparation des *features*, l'entraînement des modèles et leur sauvegarde.
- `risk/` : Engin de gestion des risques. Il évalue la confiance d'une prédiction en fonction de la volatilité, des blessures, ou des anomalies statistiques.

## Scripts Utilitaires (`ml-service/scripts/`)
Ce dossier regorge de scripts lancés indépendamment ou via des *cron-jobs* (ex: entrainement massif, backfilling de données, génération de rapports).
Exemples notables :
- `train_1x2.py`, `train_walkforward.py` : Entraîne des modèles d'issues de match.
- `forge_orchestrator.py` : L'"usine" qui produit, compare, et versionne les modèles ML.
- `time_travel.py`, `run_simulation.py` : Outils de backtesting pour évaluer la rentabilité d'une stratégie sur les données passées.

## Comment solliciter le ML-Service pour une nouvelle Feature ?
1. **Création du Modèle/Feature** : Ajouter la logique Python dans `models/` ou `features.py`.
2. **Exposition** : Si le Backend a besoin des résultats "à la demande", le ml-service doit exposer une route via son serveur (probablement FastAPI/Flask qui écoute sur le port 8008, via `main.py`).
3. **Persistance partagée** : Le plus souvent, le `ml-service` exécute des scripts asynchrones et écrit directement les probabilités dans la base de données SQLite partagée. Le Backend Node.js de son côté lit simplement cette table SQL (`ml_predictions` par hasard) pour les envoyer au Frontend.
