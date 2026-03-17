# US-3617 - Market Specific Feature Blocks

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Product Architecture / Feature Engineering`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux définir des blocs de features dédiés par marché afin que chaque pipeline consomme des signaux adaptés à sa cible.

**Raison (Pourquoi) :**
Afin d'éviter un feature store trop générique qui traite de la même façon FT, HT, corners, cards et goals OU.

**Détails Techniques & Contraintes :**
- Définir un bloc dédié pour:
  - `1X2_FT`
  - `1X2_HT`
  - `CORNERS_OU`
  - `CARDS_OU`
  - `GOALS_OU`
- Identifier les interactions et dérivés nécessaires par marché

**Skills à activer :**
- `project-context`
- `machine-learning`
- `data-analyzer`
- `docs`

**Dépendances :**
- `US-3614`
- `US-3615`
- `US-3616`

**Livrable :**
- Spécifications market-specific par marché

**Scénarios de Test / Preuves de QA :**
- Vérification qu'aucun marché cible n'utilise un bloc inadapté par défaut
- Tableau des features prioritaires par marché
