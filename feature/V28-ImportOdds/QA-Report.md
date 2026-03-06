# Rapport de Test QA - Docker Build Verification

## 📝 Informations Générales
- **Date** : 2026-03-05
- **Feature** : Dockerization & Environment Stability
- **Statut** : ✅ REUSSI

## 🧪 Scénarios de Test
### 1. Build & Orchestration
- **Action** : Lancement de `colima start` suivi de `docker compose build` et `up -d`.
- **Résultat** : Les 3 images ont été construites avec succès et les conteneurs sont "Up".

### 2. Stabilité Backend & BDD
- **Action** : Inspection des logs `statfoot-backend`.
- **Preuve** : 
  ```text
  🧪 Connecting to SQLite (Native): /app/data/database.sqlite
  🔒 Database connected & optimized (WAL Mode Enabled)
  🚀 Server running on http://localhost:3001
  ```
- **Résultat** : Connexion BDD OK, migration OK.

### 3. Intégration Frontend (Proxy Fix)
- **Anomalie détectée** : Erreur 500 sur `/api/stats` car le proxy pointait sur `localhost:3001` (interne au conteneur).
- **Correction** : Mise à jour de `vite.config.js` pour utiliser `process.env.VITE_BACKEND_URL` (cible `http://backend:3001`).
- **Validation** : `curl -i http://localhost:5173/api/stats` -> **200 OK**. Payload reçu avec 353 leagues et 327k players.

### 4. Visualisation Browser
- **Action** : Navigation via `browser_subagent`.
- **Résultat** : Shell V3 visible, Dashboard chargé. Erreur 500 résolue.

## 🏁 Conclusion
L'environnement Docker est stable et prêt pour le développement. Le correctif du proxy garantit la portabilité entre l'hôte et le conteneur.

---

# Rapport de Test QA - V29 ML Hub Rework

## 📝 Informations Générales
- **Date** : 2026-03-05
- **Feature** : V29 ML Hub Rework & Database Recovery
- **Statut** : ✅ REUSSI (avec limitations acceptées)

## 🧪 Scénarios de Test
### 1. Database Integrity & Recovery
- **Action** : Restauration d'un dump de 3.5GB suite à des erreurs `SQLITE_CORRUPT`.
- **Résultat** : La BDD a été reconstruite. Les tables principales sont peuplées (Fixtures: ~20k, Leagues: 353, Risk_Analysis: ~335k). Le PRAGMA integrity_check retourne 'ok'. 
- **Note** : La synchronisation des cotes (`V3_Odds`) a été volontairement ignorée pour le moment ("S'il y a un problème avec V3_odds, abandonne nous verrons plus tard").

### 2. Frontend UI - Design System Compliance
- **Action** : Refactoring complet des composants `MLDashboard`, `MLLeaderboard`, `MLTestLab`, et `MLModelFactory`.
- **Résultat** : Utilisation exclusive des composants du Design System (`Card`, `Stack`, `Table`, `Badge`, `Input`). 
    - L'interface utilise désormais des listes consultables (tables) au lieu de simples menus déroulants pour `MLTestLab` et `MLModelFactory`.
    - L'exécution de modèles est possible via des boutons d'action directement par ligne ("Run Model", "Build Models").

### 3. Backend - Importance Sorting
- **Action** : Mise à jour des requêtes de contrôleurs (`mlController.js`, `oddsController.js`).
- **Résultat** : Intégration de `country_importance_rank` et `league_importance_rank`. Les ligues majeures avec un fort "importance rank" s'affichent désormais en tête du Dashboard, Leaderboard, et Test Lab.

## 🏁 Conclusion ML Hub
Le module ML Hub version 31 est techniquement déployé. La structure UI est conforme aux standards visuels premiums exigés, et les données historiques sont de nouveau consultables sans erreurs 500 serveur. Le module Odds sera revisité ultérieurement.
