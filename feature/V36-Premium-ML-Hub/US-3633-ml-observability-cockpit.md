# US-3633 - Ml Observability Cockpit

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `FullStack / Observability`
- Rôle principal : `FullStack`

**Intention (Qui & Quoi) :**
En tant qu'équipe produit, je veux un cockpit minimal d'observabilité ML afin de visualiser l'état des modèles, des runs et des fallbacks.

**Raison (Pourquoi) :**
Afin de superviser la santé du système ML après la refonte et de repérer rapidement les dérives ou régressions.

**Détails Techniques & Contraintes :**
- Exposer santé, modèle actif, métriques, couverture features, taux de fallback
- Réutiliser les conventions backend et frontend du projet
- La partie UI reste secondaire par rapport au contrat de données

**Skills à activer :**
- `project-context`
- `web-dev`
- `testing`
- `design`
- `docs`

**Dépendances :**
- `US-3630`
- `US-3632`

**Livrable :**
- Cockpit minimal de supervision ML

**Scénarios de Test / Preuves de QA :**
- Vérification des états loading / error / success
- Vérification que les indicateurs exposent bien les statuts V36
