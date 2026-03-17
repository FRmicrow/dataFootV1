# US-3610 - Ml Contract Audit And Source Of Truth

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Architecture / Documentation`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux auditer le contrat ML actif et formaliser les sources de vérité afin que toutes les décisions V36 reposent sur un socle cohérent.

**Raison (Pourquoi) :**
Afin d'éliminer les ambiguïtés entre code actif, docs utiles et dette historique.

**Détails Techniques & Contraintes :**
- Définir les composants actifs côté backend et ml-service
- Définir les tables actives, endpoints actifs et artefacts actifs
- PostgreSQL uniquement

**Skills à activer :**
- `project-context`
- `docs`
- `code-quality`
- `productivity`

**Dépendances :**
- `US-3601`
- `US-3602`
- `US-3603`
- `US-3604`
- `US-3605`
- `US-3606`

**Livrable :**
- Matrice source de vérité code / doc / runtime

**Scénarios de Test / Preuves de QA :**
- Vérification que chaque composant V36 pointe vers une source de vérité explicite
- Liste des zones grises résiduelles à lever avant implémentation
