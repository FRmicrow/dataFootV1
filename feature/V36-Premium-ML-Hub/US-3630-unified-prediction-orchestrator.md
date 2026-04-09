# US-3630 - Unified Prediction Orchestrator

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Orchestration`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux définir un orchestrateur unifié de prédiction afin que tous les marchés exposent un contrat de sortie cohérent et traçable.

**Raison (Pourquoi) :**
Afin de simplifier l'intégration backend, l'observabilité et le risk engine.

**Détails Techniques & Contraintes :**
- Définir le payload commun
- Inclure statuts, versions et métadonnées
- Respecter la séparation `model / fallback / error`

**Skills à activer :**
- `project-context`
- `machine-learning`
- `code-quality`
- `testing`

**Dépendances :**
- `US-3620`
- `US-3621`
- `US-3622`
- `US-3623`
- `US-3624`

**Livrable :**
- Contrat d'orchestration unifié

**Scénarios de Test / Preuves de QA :**
- Vérification que tous les marchés entrent dans le même schéma de sortie
- Vérification que les statuts et métadonnées sont homogènes
