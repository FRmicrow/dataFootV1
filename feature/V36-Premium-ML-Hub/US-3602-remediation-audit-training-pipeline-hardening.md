# US-3602 - Remediation Audit Training Pipeline Hardening

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Training Pipeline`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux durcir le pipeline de retrain 1X2 afin qu'un entraînement complet se termine avec une persistance correcte du registre de modèle.

**Raison (Pourquoi) :**
Afin de rendre le retrain reproductible, traçable et compatible avec le runtime PostgreSQL actif.

**Détails Techniques & Contraintes :**
- PostgreSQL uniquement
- Vérifier la compatibilité de la couche de persistence avec `psycopg2`
- Définir le statut final attendu d'un run
- Prévoir les erreurs bloquantes à remonter explicitement

**Skills à activer :**
- `project-context`
- `machine-learning`
- `code-quality`
- `testing`

**Dépendances :**
- `US-3601`

**Livrable :**
- Spécification de durcissement du pipeline de retrain

**Scénarios de Test / Preuves de QA :**
- Lecture statique du pipeline de training et de la helper DB
- Preuve qu'un enchaînement train -> save -> register est complètement défini
- Liste des points d'échec et du comportement attendu
