# US-3616 - Match Context Block

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Feature Engineering`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux définir un bloc de contexte match afin que les modèles distinguent proprement niveau de compétition, repos, domicile et autres effets de contexte.

**Raison (Pourquoi) :**
Afin de capturer les différences comme "favori domestique mais outsider européen" sans créer un modèle par club.

**Détails Techniques & Contraintes :**
- Couvrir domicile/extérieur, repos, stage, competition level, derby, travel
- Définir les proxys acceptables si certains signaux manquent
- Ne retenir que des signaux disponibles pré-match

**Skills à activer :**
- `project-context`
- `machine-learning`
- `data-analyzer`

**Dépendances :**
- `US-3611`

**Livrable :**
- Bloc `MATCH_CONTEXT`

**Scénarios de Test / Preuves de QA :**
- Liste des variables de contexte retenues
- Justification de leur disponibilité pré-match
