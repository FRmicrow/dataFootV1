# US-3601 - Remediation Audit Paths And Artifacts

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Artifact Management`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux définir une source de vérité unique pour les chemins d'artefacts afin que l'inférence charge exactement les modèles entraînés.

**Raison (Pourquoi) :**
Afin d'éliminer les fallbacks silencieux provoqués par des chemins incohérents entre training et inference.

**Détails Techniques & Contraintes :**
- PostgreSQL uniquement
- Inventorier les chemins d'écriture et de lecture des artefacts spécialisés
- Définir une convention unique par marché et par scope
- Le livrable est une spécification, pas encore l'implémentation

**Skills à activer :**
- `project-context`
- `machine-learning`
- `code-quality`

**Dépendances :**
- Aucune

**Livrable :**
- Spécification de localisation unifiée des artefacts

**Scénarios de Test / Preuves de QA :**
- Vérification statique des chemins de training et inference pour FT, HT, Corners, Cards
- Preuve que chaque artefact attendu possède une localisation cible unique
- Liste des points de fallback silencieux à supprimer
