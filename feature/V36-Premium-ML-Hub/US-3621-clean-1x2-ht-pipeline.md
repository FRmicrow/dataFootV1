# US-3621 - Clean 1x2 Ht Pipeline

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / HT pipeline`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux décliner l'architecture propre V36 pour `1X2_HT` afin d'avoir un pipeline halftime gouverné comme le FT.

**Raison (Pourquoi) :**
Afin d'éviter un pipeline HT dérivé de manière ad hoc du FT.

**Détails Techniques & Contraintes :**
- Adapter les features market-specific HT
- Définir les labels et métriques HT
- Réutiliser le contrat de persistance V36

**Skills à activer :**
- `project-context`
- `machine-learning`
- `testing`
- `data-analyzer`

**Dépendances :**
- `US-3620`

**Livrable :**
- Pipeline `1X2_HT`

**Scénarios de Test / Preuves de QA :**
- Vérification que les features HT sont bien spécifiques
- Vérification de la cohérence entre outputs et évaluateur HT
