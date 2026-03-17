# US-3622 - Clean Corners Ou Pipeline

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Corners pipeline`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux construire un pipeline corners over/under propre afin que les signaux style et domination soient exploités avec un contrat cohérent.

**Raison (Pourquoi) :**
Afin de sortir de l'approche actuelle fragile sur les labels, lignes et outputs corners.

**Détails Techniques & Contraintes :**
- Définir les lignes supportées
- Utiliser les blocs `STYLE_PROCESS` et `MARKET_SPECIFIC`
- Aligner output, persistence et evaluation

**Skills à activer :**
- `project-context`
- `machine-learning`
- `testing`
- `data-analyzer`

**Dépendances :**
- `US-3620`
- `US-3617`

**Livrable :**
- Pipeline `CORNERS_OU`

**Scénarios de Test / Preuves de QA :**
- Vérification de la cohérence lignes -> sélection -> évaluateur
- Vérification que les features corners dédiées sont bien utilisées
