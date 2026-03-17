# US-3620 - Clean 1x2 Ft Vertical Slice

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / End-to-end pipeline`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux reconstruire un pipeline propre `1X2_FT` de bout en bout afin d'établir la référence qualité de V36.

**Raison (Pourquoi) :**
Afin de valider le nouveau contrat de données avant d'étendre aux autres marchés.

**Détails Techniques & Contraintes :**
- Inclure dataset, training, inference, registry et évaluation
- Utiliser le schéma de features V36
- Ne pas réintroduire de fallback silencieux
- Le pipeline FT sert de baseline globale de référence pour toute spécialisation future
- La population prioritaire initiale couvre les ligues et compétitions Tier A définies dans V36

**Skills à activer :**
- `project-context`
- `machine-learning`
- `testing`
- `code-quality`

**Dépendances :**
- `US-3612`
- `US-3613`
- `US-3614`
- `US-3615`
- `US-3616`
- `US-3617`

**Livrable :**
- Pipeline `1X2_FT` de référence

**Scénarios de Test / Preuves de QA :**
- Vérification que train et inference utilisent le même schéma
- Vérification que les métriques de validation sont persistées
- Vérification qu'aucune sortie fallback n'est promue en sortie officielle
- Vérification que les performances globales servent de baseline comparative pour les futures variantes de ligue
