# Audit Global & Plan d'Action - V16

## 1. Synthèse de l'Audit par Domaine

### 🏗️ Architecture & Backend
- **Points de Friction** : 
    - Migrations DB codées en dur dans `server.js`.
    - Routes monolithiques dans `v3_routes.js`.
    - Accès direct à la base de données (SQL) depuis les contrôleurs.
    - Logique métier, logging et accès aux données entremêlés dans les services.
- **Standards Non Respectés** : `backend-engineer.md` (séparation des couches), `database-architect.md` (gestion des migrations).

### 🎨 Frontend & UI/UX
- **Points de Friction** : 
    - Certains composants n'utilisent peut-être pas encore à 100% le nouveau Design System.
    - Besoin de vérifier l'accessibilité et les états de chargement (skeletons).
- **Standards Non Respectés** : À valider lors du passage en revue détaillé, mais les bases (`tokens.css`) sont excellentes.

### 🤖 Machine Learning
- **Points de Friction** : 
    - Structure de dossier plate dans `ml-service/`.
    - Mélange des scripts d'entraînement, d'inférence et des fichiers de modèles (.joblib).
- **Standards Non Respectés** : `machine-learning-engineer.md` (structure modulaire).

### 🚀 DevOps & Global
- **Points de Friction** : 
    - Absence de tests unitaires automatisés visibles dans le pipeline CI pour toutes les couches.
    - Convention de commits à renforcer.
- **Standards Non Respectés** : `devops-engineer.md`, `qa-engineer.md`.

---

## 2. Plan d'Action Priorisé (V16)

### Étape 1 : Infrastruture & Data (US-161)
- Extraire les migrations de `server.js` vers un système dédié (Prisma ou fichiers SQL ordonnés).
- Documenter le schéma de base de données final.

### Étape 2 : Modularité Backend (US-162)
- Refactoriser les contrôleurs pour qu'ils n'appellent que des services.
- Introduire un pattern Repository pour l'accès aux données.
- Découper `v3_routes.js` par domaine fonctionnel.

### Étape 3 : Excellence Visuelle (US-163)
- Audit de chaque page frontend pour assurer l'utilisation systématique des tokens.
- Implémentation de micro-animations et skeletons de chargement premium.

### Étape 4 : Industrialisation ML (US-164)
- Réorganiser `ml-service` en sous-dossiers (`src/`, `models/`, `training/`).
- Standardiser le format d'export des modèles et les métriques associées.

### Étape 5 : Sécurité & Qualité (US-165 & US-166)
- Audit de sécurité (XSS/SQLi) et audit de performance.
- Mise en place d'une suite de tests unitaires sur les services backend critiques.

---

## 3. Recommandations Spécifiques
- Utiliser **Prisma Studio** pour la gestion visuelle de la DB.
- Adopter systématiquement la règle des commits atomiques.
- Chaque nouvelle feature doit commencer par une US de design/planification.
