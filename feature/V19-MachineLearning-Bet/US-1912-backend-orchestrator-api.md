# US-1912 - API d'Orchestration des Training Runs

**Rôle :** Backend Engineer
**Objectif :** Développer l'API permettant de piloter, monitorer et historiser les runs d'entraînement ML.

## Contexte
Le pipeline ML est complexe et long. Une API dédiée est nécessaire pour gérer le cycle de vie d'un run (Queued, Running, Completed, Failed) et assurer la traçabilité.

> [!IMPORTANT]
> **Indépendance Totale** : Nouvelles routes API (`/runs/...`) dédiées exclusivement à l'orchestration ML. Aucun changement sur les contrats d'API existants.

## Tâches
- [ ] Créer les endpoints `POST /runs`, `GET /runs/:id`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Implémenter le DAG d'exécution. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Gérer les `Quality Gates`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Journaliser les logs d'exécution dans `V3_Run_Steps`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour la conception de l'API RESTful et du DAG d'exécution.
    - `devops-engineer.md` : Pour la gestion des logs et de la stabilité du pipeline.
- **Skills :**
    - `machine-learning` : Orchestration de workflows ML complexes.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour vérifier les endpoints d'orchestration.
    - **Analyse des Logs Docker** : Vérifier la bonne transition des états du DAG.
    - **Validation 100%** : Un run complet doit aboutir sans blocage technique.

## Critères d'Acceptation
- Un run peut être lancé via API et son avancement suivi en temps réel.
- En cas d'échec d'une étape, le run s'arrête proprement avec un log d'erreur explicite.
- Seuls les modèles passant les Quality Gates peuvent être promus au statut "Champion".
