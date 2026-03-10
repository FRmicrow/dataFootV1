# Architecture Globale du Projet

Ce document décrit l'architecture de haut niveau du projet StatFootV3. Il est destiné à donner une vue d'ensemble lorsqu'une nouvelle feature nécessite de comprendre les interactions entre les différents services.

## Services (Définis via Docker Compose)

Le projet est divisé en trois services principaux conteneurisés :

### 1. Frontend (`/frontend`)
- **Technologie** : React (Vite)
- **Port** : 5173
- **Rôle** : Interface utilisateur principale. Il interagit avec le Backend via des appels API REST (exposé sur `http://localhost:3001/api`).

### 2. Backend (`/backend`)
- **Technologie** : Node.js (probablement Express, vu la structure `routes`/`controllers`)
- **Port** : 3001
- **Rôle** : Cœur logique de l'application. Fournit les données au frontend, gère l'authentification, la logique métier, et lit/écrit dans la base de données.

### 3. ML-Service (`/ml-service`)
- **Technologie** : Python (modèles CatBoost/Scikit-learn)
- **Port** : 8008
- **Rôle** : Service dédié à l'entraînement de modèles (Forge), à l'orchestration des données ML, l'évaluation des risques et la génération de prédictions.

## Base de Données
- Le projet utilise une base de données **SQLite** localisée dans `/backend/data/database.sqlite`.
- Ce fichier de base de données est partagé par volume entre le `backend` et le `ml-service` (ce qui signifie que les deux services peuvent y lire et écrire directement).

## Flux de données standard pour une Feature Complexe (ex: Nouveau modèle de prédiction)
1. **Frontend** : L'utilisateur demande une prédiction via l'UI. L'UI appelle l'API Backend.
2. **Backend** : Le Backend reçoit la requête, peut-être récupère l'état actuel depuis la DB, et relaye une demande de calcul au ML-Service ou lit des résultats pré-calculés en DB.
3. **ML-Service** : S'il est sollicité, il calcule la prédiction via ses modèles Python et retourne le résultat au Backend (ou écrit en DB).
4. **Backend -> Frontend** : Le Backend formate la réponse et l'envoie au Frontend pour affichage.
