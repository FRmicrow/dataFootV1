# US-3604 - Remediation Audit Market Alignment

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Architecture produit / Market Mapping`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux unifier les identifiants de marché, les sélections et la couche d'évaluation afin que chaque prédiction soit scorée avec les mêmes labels que ceux persistés.

**Raison (Pourquoi) :**
Afin d'éliminer les incohérences actuelles entre submodels, risk engine, backend et UI.

**Détails Techniques & Contraintes :**
- Définir un mapping unique pour `1X2_FT`, `1X2_HT`, `CORNERS_OU`, `CARDS_OU`, `GOALS_OU`
- Définir les sélections et lignes supportées
- Définir la correspondance exacte entre storage et evaluation

**Skills à activer :**
- `project-context`
- `machine-learning`
- `docs`
- `testing`
- `code-quality`

**Dépendances :**
- `US-3603`

**Livrable :**
- Mapping officiel marchés / sélections / évaluateurs

**Scénarios de Test / Preuves de QA :**
- Relecture statique des identifiants de marché dans le ML service et le backend
- Preuve que les labels d'évaluation reflètent exactement les labels persistés
- Tableau de correspondance final validé
