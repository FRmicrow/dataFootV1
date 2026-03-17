# US-3613 - Prediction Status And Persistence Policy

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Architecture produit / Persistence policy`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux définir la politique officielle de persistance des prédictions afin que seuls des outputs interprétables et gouvernés soient stockés.

**Raison (Pourquoi) :**
Afin d'empêcher la confusion entre sortie modèle, fallback et erreur.

**Détails Techniques & Contraintes :**
- Définir quand persister
- Définir quand refuser de persister
- Définir les statuts et les métadonnées obligatoires

**Skills à activer :**
- `project-context`
- `docs`
- `machine-learning`
- `code-quality`

**Dépendances :**
- `US-3612`

**Livrable :**
- Politique officielle de persistance des prédictions

**Scénarios de Test / Preuves de QA :**
- Table de décision `model / fallback / error`
- Vérification que chaque statut a une politique de stockage claire
