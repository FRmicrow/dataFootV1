# US-3605 - Remediation Audit Runtime Source Of Truth

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Product / Documentation`
- Rôle principal : `Product Owner`

**Intention (Qui & Quoi) :**
En tant que Product Owner, je veux formaliser le runtime actif PostgreSQL et les composants réellement utilisés afin que V36 s'appuie sur une source de vérité explicite.

**Raison (Pourquoi) :**
Afin d'éviter toute décision de conception polluée par des références historiques hors périmètre.

**Détails Techniques & Contraintes :**
- PostgreSQL est le seul runtime cible
- Le document doit lister:
  - composants actifs
  - docs encore pertinentes
  - docs à ignorer pour V36

**Skills à activer :**
- `project-context`
- `docs`
- `productivity`
- `code-quality`

**Dépendances :**
- Aucune

**Livrable :**
- Matrice runtime PostgreSQL / composants actifs / docs ignorées

**Scénarios de Test / Preuves de QA :**
- Vérification croisée entre code actif backend/ml-service et docs V36
- Preuve écrite que V36 ne dépend que du runtime PostgreSQL
- Liste des docs écartées du périmètre de décision
