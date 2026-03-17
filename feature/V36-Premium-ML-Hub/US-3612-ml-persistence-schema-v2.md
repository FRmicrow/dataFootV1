# US-3612 - Ml Persistence Schema V2

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Architecture de données`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux définir un schéma de persistance ML v2 afin que runs, modèles, outputs et statuts soient traçables de bout en bout.

**Raison (Pourquoi) :**
Afin de gouverner proprement l'entraînement, l'inférence et l'observabilité du système.

**Détails Techniques & Contraintes :**
- Définir les besoins pour registry, runs, outputs et statuts
- Inclure marché, scope, horizon, version de schéma et métriques
- Utiliser une approche additive côté base

**Skills à activer :**
- `project-context`
- `docs`
- `code-quality`
- `devops`

**Dépendances :**
- `US-3610`
- `US-3611`

**Livrable :**
- Spécification de persistance v2 PostgreSQL

**Scénarios de Test / Preuves de QA :**
- Vérification que tous les champs gouvernance nécessaires sont couverts
- Vérification qu'aucun besoin métier n'exige un retour au schéma actuel ambigu
