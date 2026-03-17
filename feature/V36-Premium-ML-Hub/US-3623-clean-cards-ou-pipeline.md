# US-3623 - Clean Cards Ou Pipeline

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Cards pipeline`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux construire un pipeline cards over/under propre afin que l'intensité, les fautes et la discipline soient traitées dans un cadre gouverné.

**Raison (Pourquoi) :**
Afin de corriger les incohérences actuelles entre features, outputs et évaluation cards.

**Détails Techniques & Contraintes :**
- Définir les lignes supportées
- Utiliser les features discipline et contexte adaptées
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
- Pipeline `CARDS_OU`

**Scénarios de Test / Preuves de QA :**
- Vérification de la cohérence lignes -> sélection -> évaluateur
- Vérification que les features cards dédiées sont bien utilisées
