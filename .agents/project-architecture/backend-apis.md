# Backend : APIs et Routes (V3)

Le backend (Node.js) expose une API REST pour le frontend et possiblement le ML-Service. Les routes de la nouvelle version (V3) sont structurées sous `backend/src/routes/v3/` et appelées par un fichier de regroupement `v3_routes.js`.

Voici les domaines gérés par les API (chaque domaine est couplé à des contrôleurs dans `backend/src/controllers/v3/` et des services dans `backend/src/services/`) :

## Les Routes V3 (`routes/v3/`)

- `admin_routes.js` : Points finaux pour les actions d'administration (paramétrage, forçages...).
- `betting_routes.js` : Gère les côtes, les recommandations de paris et l'historique de rentabilité.
- `dashboard_routes.js` : Agrége les données pour le `V3Dashboard` du Frontend.
- `fixture_routes.js` : Gestion des matchs (fixtures). Historique face-à-face, détails d'un match (événements, compo, tactiques).
- `import_routes.js` : Déclenche et monitore les tâches de récupération de données depuis le fournisseur de statistiques externes.
- `league_routes.js` : Informations sur les compétitions, classements, statistiques agrégées par saison.
- `ml_routes.js` : Sert de pont direct entre le Frontend et les modèles d'intelligence artificielle (déclenchement de la "Forge", récupération de prédictions sur-mesure).
- `player_routes.js` : Statistiques détaillées des joueurs, historique des transferts, apparitions.
- `resolution_routes.js` : Utilitaires pour résoudre des incohérences ou lier des entités qui auraient des identifiants corrompus/différents depuis l'API externe.
- `studio_routes.js` : Lié au `ContentStudio` frontend, permet l'édition manuelle de contenu éditorial ou la modification de données erronées.

## Conventions de création pour une nouvelle Feature API
Lors de l'ajout d'une feature nécessitant le backend :
1. **Route** : Ajouter l'endpoint dans le fichier `*_routes.js` approprié ou en créer un nouveau s'il s'agit d'un nouveau domaine.
2. **Contrôleur** : Définir la méthode d'entrée, la validation du payload et la réponse HTTP.
3. **Service** : L'intelligence métier (calculs complexes, requêtes en DB) se place dans `backend/src/services/`.
4. **Repository** (optionnel mais recommandé) : S'il y a des requêtes complexes en DB, on passe par `backend/src/repositories/`.
