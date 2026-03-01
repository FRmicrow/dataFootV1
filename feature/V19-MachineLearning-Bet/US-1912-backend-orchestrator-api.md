# US-1912 - API d'Orchestration des Training Runs

**Rôle :** Backend Engineer
**Objectif :** Développer l'API permettant de piloter, monitorer et historiser les runs d'entraînement ML.

## Contexte
Le pipeline ML est complexe et long. Une API dédiée est nécessaire pour gérer le cycle de vie d'un run (Queued, Running, Completed, Failed) et assurer la traçabilité.

## Tâches
- [ ] Créer les endpoints `POST /runs`, `GET /runs/:id`, `POST /runs/:id/publish`.
- [ ] Implémenter le DAG (Directed Acyclic Graph) d'exécution (Steps : Features -> Submodels -> Meta -> Backtest).
- [ ] Gérer les `Quality Gates` : validation automatique des métriques avant autorisation de publication.
- [ ] Journaliser les logs d'exécution dans `V3_Run_Steps`.

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour la conception de l'API RESTful et du DAG d'exécution.
    - `devops-engineer.md` : Pour la gestion des logs et de la stabilité du pipeline.
- **Skills :**
    - `machine-learning` : Orchestration de workflows ML complexes.

## Critères d'Acceptation
- Un run peut être lancé via API et son avancement suivi en temps réel.
- En cas d'échec d'une étape, le run s'arrête proprement avec un log d'erreur explicite.
- Seuls les modèles passant les Quality Gates peuvent être promus au statut "Champion".
