# US-1903 - Normalisation des Lineups et Temps de Jeu

**Rôle :** Backend Engineer
**Objectif :** Normaliser les compositions d'équipes et enrichir les minutes de jeu via les événements de substitution.

## Contexte
Le calcul de `Lineup Strength` nécessite de savoir quels joueurs ont débuté et combien de temps ils ont joué. Les données brutes sont dans `V3_Fixture_Lineups`.

> [!IMPORTANT]
> **Indépendance Totale** : Toutes les données normalisées sont stockées dans la nouvelle table `V3_Fixture_Lineup_Players`, garantissant aucun impact sur les flux de données actuels.

## Tâches
- [ ] Parser `starting_xi` et `substitutes` vers la table `V3_Fixture_Lineup_Players`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Identifier les minutes d'entrée (`sub_in_minute`) et de sortie (`sub_out_minute`). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Gérer les cas d'événements manquants. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Stocker les métadonnées (grid position, shirt number, player name). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour le parsing complexe et le croisement de données.
    - `global-coding-standards.md` : Pour la maintenabilité du code.
- **Skills :**
    - `machine-learning` : Compréhension de l'importance des variables de lineup pour le scoring futur.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour valider le backfill des lineups.
    - **Analyse des Logs Docker** : Vérifier que tous les événements de substitution sont bien parsés.
    - **Validation 100%** : S'assurer qu'aucun fixture n'a de lineup vide si la source JSON existe.

## Critères d'Acceptation
- La table `V3_Fixture_Lineup_Players` est remplie pour tous les fixtures possédant des compositions.
- Les minutes de substitution sont cohérentes avec le déroulement du match.
- Le croisement Fixtures <-> Lineups <-> Events fonctionne sans perte de données.
