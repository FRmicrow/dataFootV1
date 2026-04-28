# Architecture Globale du Projet

Ce document décrit l'architecture de haut niveau du projet StatFootV3. Il est destiné à donner une vue d'ensemble lorsqu'une nouvelle feature nécessite de comprendre les interactions entre les différents services.

## Services (Définis via Docker Compose)

Le projet est divisé en quatre services principaux conteneurisés :

### 1. Base de données (`statfoot-db`)
- **Technologie** : PostgreSQL 15
- **Port** : 5432
- **Rôle** : Base de données unique de la stack locale. Le `backend` et le `ml-service` s'y connectent via `DATABASE_URL`.

### 2. Frontend (`/frontend`)
- **Technologie** : React (Vite)
- **Port** : 5173
- **Rôle** : Interface utilisateur principale. Il interagit avec le Backend via des appels API REST (exposé sur `http://localhost:3001/api`).

### 3. Backend (`/backend`)
- **Technologie** : Node.js (probablement Express, vu la structure `routes`/`controllers`)
- **Port** : 3001
- **Rôle** : Cœur logique de l'application. Fournit les données au frontend, gère l'authentification, la logique métier, et lit/écrit dans PostgreSQL.

### 4. ML-Service (`/ml-service`)
- **Technologie** : Python (modèles CatBoost/Scikit-learn)
- **Port** : 8008
- **Rôle** : Service dédié à l'entraînement de modèles (Forge), à l'orchestration des données ML, l'évaluation des risques et la génération de prédictions.

## Base de Données
- Le projet utilise une base de données **PostgreSQL** servie par le conteneur `statfoot-db`.
- Le `backend` et le `ml-service` n'embarquent pas de base locale. Ils se connectent tous les deux à PostgreSQL via `DATABASE_URL`.
- Le conteneur `statfoot-backend` sert l'API et la logique métier. Le conteneur `statfoot-db` contient les données.

## Flux de données standard pour une Feature Complexe (ex: Nouveau modèle de prédiction)
1. **Frontend** : L'utilisateur demande une prédiction via l'UI. L'UI appelle l'API Backend.
2. **Backend** : Le Backend reçoit la requête, peut-être récupère l'état actuel depuis la DB, et relaye une demande de calcul au ML-Service ou lit des résultats pré-calculés en DB.
3. **ML-Service** : S'il est sollicité, il calcule la prédiction via ses modèles Python et retourne le résultat au Backend (ou écrit en DB).
4. **Backend -> Frontend** : Le Backend formate la réponse et l'envoie au Frontend pour affichage.
