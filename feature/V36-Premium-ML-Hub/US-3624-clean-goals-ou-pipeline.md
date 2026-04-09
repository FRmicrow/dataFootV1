# US-3624 - Clean Goals Ou Pipeline

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Goals OU pipeline`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux construire un pipeline over/under buts propre afin que xG, tempo et asymétrie soient exploités dans un cadre cohérent.

**Raison (Pourquoi) :**
Afin d'ajouter un marché goals OU aligné avec l'architecture cible V36.

**Détails Techniques & Contraintes :**
- Définir les lignes supportées
- Prioriser xG, tempo, asymétrie et style clash
- Aligner output, persistence et evaluation
- Ce pipeline est prioritaire avant corners et cards après `1X2_FT`

**Skills à activer :**
- `project-context`
- `machine-learning`
- `testing`
- `data-analyzer`

**Dépendances :**
- `US-3620`
- `US-3617`

**Livrable :**
- Pipeline `GOALS_OU`

**Scénarios de Test / Preuves de QA :**
- Vérification que les outputs goals OU suivent le contrat des marchés OU
- Vérification que les signaux xG et tempo sont explicitement couverts
