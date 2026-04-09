# US-3614 - Baseline Core And Form Recomposition

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Feature Engineering`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux recomposer les signaux stables et de forme récente afin de disposer d'un socle propre pour les modèles V36.

**Raison (Pourquoi) :**
Afin de conserver la connaissance métier utile tout en clarifiant la fonction de chaque feature.

**Détails Techniques & Contraintes :**
- Reprendre Elo, rank, points, standings, lineup strength
- Séparer ce qui relève du socle stable de ce qui relève de la forme récente
- Définir les dérivés et différentiels utiles

**Skills à activer :**
- `project-context`
- `machine-learning`
- `data-analyzer`

**Dépendances :**
- `US-3611`

**Livrable :**
- Mapping `BASELINE_CORE` + `FORM_RECENT`

**Scénarios de Test / Preuves de QA :**
- Tableau des features existantes conservées, déplacées ou supprimées
- Preuve que le bloc couvre les besoins FT et HT de base
