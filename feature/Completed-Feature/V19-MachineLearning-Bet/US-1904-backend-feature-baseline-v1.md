# US-1904 - Feature Engineering : BASELINE_V1

**Rôle :** Backend Engineer / Machine Learning Engineer
**Objectif :** Calculer et stocker les features structurelles (Elo, Classement, Puissance Lineup) pour chaque équipe et chaque match.

## Contexte
Les features `BASELINE_V1` représentent le niveau intrinsèque des équipes avant toute considération sur la dynamique de jeu récente. Elles sont fondamentales pour la capacité prédictive du modèle.

> [!IMPORTANT]
> **Indépendance Totale** : Les calculs de features sont isolés dans `V3_Team_Features_PreMatch`. Aucune logique métier existante n'est modifiée.

## Tâches
- [ ] Récupérer le dernier score Elo disponible (< kickoff). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Extraire le snapshot du classement juste avant le match. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Calculer le `lineup_strength_v1`. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Enregistrer les résultats dans `V3_Team_Features_PreMatch`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Gérer les 3 horizons temporels (FULL, 5Y, 3Y). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la sélection des features et la gestion du leakage.
    - `backend-engineer.md` : Pour l'implémentation des calculs batch.
- **Skills :**
    - `machine-learning` : Concepts d'Elo et de feature normalization.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour vérifier les calculs BASELINE.
    - **Analyse des Logs Docker** : Vérifier que le leakage est évité (pas de matches futurs).
    - **Validation 100%** : Vérifier la distribution des scores Elo avant de passer à US-1905.

## Critères d'Acceptation
- Les calculs respectent strictement le point de coupe temporel (`as_of`).
- Les features sont stockées au format JSON valide dans la table dédiée.
- Les cas de données manquantes (ex: début de saison pour le classement) sont gérés (valeurs `null` ou moyennes de ligue).
