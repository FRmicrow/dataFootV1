# US-3606 - Remediation Audit Ml Guardrails

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / QA`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux définir des garde-fous minimum sur les schémas de features, la validation temporelle et la qualité des données afin de sécuriser les futurs pipelines V36.

**Raison (Pourquoi) :**
Afin d'éviter qu'un pipeline apparemment fonctionnel produise des probabilités instables ou non traçables.

**Détails Techniques & Contraintes :**
- Définir la validation train vs inference
- Définir le contrôle minimal de couverture de features
- Définir une approche minimale pour drift et skew
- Définir la validation temporelle par marché

**Skills à activer :**
- `project-context`
- `machine-learning`
- `testing`
- `data-analyzer`

**Dépendances :**
- `US-3602`
- `US-3604`

**Livrable :**
- Spécification des garde-fous ML minimum

**Scénarios de Test / Preuves de QA :**
- Tableau des contrôles train/inference à imposer
- Tableau des métriques et seuils minimum à exposer
- Définition documentée de la validation temporelle
