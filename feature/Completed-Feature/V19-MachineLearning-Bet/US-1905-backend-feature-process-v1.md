# US-1905 - Feature Engineering : PROCESS_V1

**Rôle :** Backend Engineer / Machine Learning Engineer
**Objectif :** Calculer et stocker les features de dynamique de jeu (Rolling Stats) sur les 5 et 10 derniers matchs.

## Contexte
Les features `PROCESS_V1` capturent la forme récente et le style de jeu (possession, efficacité au tir, discipline). Elles complètent la baseline pour affiner les probabilités.

> [!IMPORTANT]
> **Indépendance Totale** : Le calcul de ces features est purement analytique et stocké séparément. Aucun impact sur les statistiques de match affichées ailleurs.

## Tâches
- [ ] Calculer les moyennes glissantes (Rolling Averages) (Last 5 et Last 10). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Calculer les ratios d'efficacité (`sot_rate`, `pass_acc_rate`). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Calculer le `control_index`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Calculer les stats spécifiques à la 1ère mi-temps. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Enregistrer les résultats dans `V3_Team_Features_PreMatch`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la définition des rolling windows et indices composites.
    - `backend-engineer.md` : Pour l'optimisation des requêtes de calcul massif.
- **Skills :**
    - `machine-learning` : Traitement de séries temporelles et détection de drift.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour vérifier les calculs PROCESS.
    - **Analyse des Logs Docker** : Vérifier les temps de calcul pour les batchs importants.
    - **Validation 100%** : Comparer quelques valeurs calculées manuellement.

## Critères d'Acceptation
- Le calcul exclut systématiquement le match en cours (strictement < kickoff).
- Les features capturent à la fois la performance produite ("For") et subie ("Against").
- Les 3 horizons (FULL, 5Y, 3Y) sont correctement calculés.
