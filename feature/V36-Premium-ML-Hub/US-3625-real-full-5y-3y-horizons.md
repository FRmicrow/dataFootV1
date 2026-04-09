# US-3625 - Real Full 5y 3y Horizons

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Machine Learning / Training Windows`
- Rôle principal : `Machine Learning Engineer`

**Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux transformer les horizons `full`, `5y` et `3y` en vrais jeux d'entraînement distincts afin que ces labels aient une signification effective.

**Raison (Pourquoi) :**
Afin d'éviter des horizons simplement taggés sans impact réel sur les données d'entraînement.

**Détails Techniques & Contraintes :**
- Définir les règles de coupe temporelle
- Garantir la cohérence entre horizon entraîné et horizon servi
- Préserver la traçabilité par marché

**Skills à activer :**
- `project-context`
- `machine-learning`
- `data-analyzer`
- `testing`

**Dépendances :**
- `US-3620`

**Livrable :**
- Horizons `full / 5y / 3y` réels

**Scénarios de Test / Preuves de QA :**
- Vérification que les tailles et plages temporelles diffèrent réellement
- Vérification que les artefacts sont distingués par horizon
