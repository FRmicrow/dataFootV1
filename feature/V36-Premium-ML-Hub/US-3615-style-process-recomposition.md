# US-3615 - Style Process Recomposition

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Feature Engineering`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux recomposer les signaux de style et de process afin de mieux capturer les différences de déroulement de match sans multiplier artificiellement les modèles.

**Raison (Pourquoi) :**
Afin d'encoder les variations de style de jeu dans les features plutôt que dans une explosion de modèles spécifiques.

**Détails Techniques & Contraintes :**
- Reprendre possession, tirs, corners, contrôle, fautes, cartes, tempo proxies
- Clarifier ce qui relève du style et non de la simple forme
- Préparer une consommation cohérente pour corners, cards et goals OU

**Skills à activer :**
- `project-context`
- `machine-learning`
- `data-analyzer`
- `code-quality`

**Dépendances :**
- `US-3611`

**Livrable :**
- Bloc `STYLE_PROCESS`

**Scénarios de Test / Preuves de QA :**
- Tableau des signaux style retenus
- Justification des proxys utilisés pour les notions non directement observées
