# US-282: Conception et implémentation des API Endpoints des Cotes

## 1. Rôle ciblé
@[.agents/rules/api-designer.md] / @[.agents/rules/backend-engineer.md]

## 2. Objectif
Concevoir les routes API RESTful et les implémenter pour exposer les données de cotes (Odds) stockées en base de données au FrontEnd.

## 3. Contexte (Pourquoi)
Une fois les cotes insérées en DB (US-281), le Frontend qui gérera le "ML Hub" (US-283) aura besoin de les interroger. Il faut définir des routes claires, typées (ex: Zod) et rapides pour récupérer ces informations.

## 4. Tâches attendues
- **API Designer** :
  - Définir le path des futures routes (généralement sous `/api/ml/odds/` ou similaire). Par exemple, une route pour les cotes d'un match précis, une route pour la liste des matchs ayant des cotes sur une période donnée.
  - Définir les paramètres (Query params, ex: `date_from`, `date_to`, `league_id`).
  - Mettre à jour le contrat de l'API dans `.agents/project-architecture/backend-swagger.yaml`.
- **Backend Engineer** :
  - Implémenter les contrôleurs et les routes Express.
  - Créer l'accès BDD (Repository) pour remonter les cotes depuis SQL vers du JSON structuré.
  - Implémenter la validation des requêtes avec les schémas existants dans `backend/src/schemas/v3Schemas.js` ou en créer de nouveaux.

## 5. Exigences spécifiques & Contraintes
- **Structure API-First** : Ne coder les routes qu'une fois le contrat Swagger mis à jour et acté.
- **Performance** : Les requêtes devront remonter potentiellement de multiples cotes par match (plusieurs bookmakers), il faut structurer le JSON intelligemment pour que le Front s'y retrouve rapidement.
- **Pagination** : Si on liste de nombreux matchs, prévoir la pagination.

## 6. Critères d'acceptation (Definition of Done)
- [ ] Le Swagger est mis à jour avec les endpoints des cotes.
- [ ] Les routes backend rattachées renvoient correctement un code `200` avec la donnée mockée puis réelle depuis PostgreSQL.
- [ ] La validation en entrée est effectuée via Zod.
- [ ] Tests fonctionnels validés via un client HTTP ou Mocha.
