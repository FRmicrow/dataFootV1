# US-3632 - Market Aware Evaluation Layer

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Backend / Evaluation`
- Rôle principal : `Backend Engineer`

**Intention (Qui & Quoi) :**
En tant que Backend Engineer, je veux une couche d'évaluation consciente du marché afin que les métriques restituées reflètent correctement les sorties persistées.

**Raison (Pourquoi) :**
Afin de restaurer la confiance dans les tableaux de performance et les décisions métier.

**Détails Techniques & Contraintes :**
- Définir une évaluation spécifique à chaque marché
- Réutiliser le mapping officiel des labels
- Retourner des réponses cohérentes avec le wrapper backend standard

**Skills à activer :**
- `project-context`
- `code-quality`
- `testing`
- `docs`

**Dépendances :**
- `US-3631`

**Livrable :**
- Couche d'évaluation cohérente par marché

**Scénarios de Test / Preuves de QA :**
- Vérification statique des métriques par marché
- Vérification que les labels évalués correspondent aux labels stockés
