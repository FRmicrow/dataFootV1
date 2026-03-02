# US-1902 - Nettoyage et Normalisation de la Possession

**Rôle :** Backend Engineer
**Objectif :** Convertir les données de possession textuelles ("55%") en entiers exploitables par les modèles ML.

## Contexte
La table `V3_Fixture_Stats` contient la possession sous forme de texte. Pour le ML, nous avons besoin d'une colonne `ball_possession_pct` de type INTEGER propre et sans valeurs manquantes (backfill si disponible via 100-x).

> [!IMPORTANT]
> **Indépendance Totale** : Le script de backfill doit être purement additif (nouvelle colonne) et ne pas altérer les données existantes utilisées par le reste de l'application.

## Tâches
- [ ] Développer un script de backfill `backfill_possession_pct.py`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Parser le champ `ball_possession` (ex: "55%" -> 55). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Gérer les cas où une seule équipe a l'info (déduire l'autre équipe : 100 - X). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Valider l'intégrité (0 <= pct <= 100). (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Mettre à jour `V3_Fixture_Stats.ball_possession_pct`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour la logique de nettoyage et gestion des erreurs.
    - `global-coding-standards.md` : Pour la qualité du script Python.
- **Skills :**
    - Utilisation des bibliothèques standards de data processing (Pandas/JSON).
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour valider la logique de transformation.
    - **Analyse des Logs Docker** : Surveiller les sorties du script de backfill.
    - **Validation 100%** : Vérification de la complétude des données avant de passer à US-1903.

## Critères d'Acceptation
- 100% des lignes ayant `ball_possession` renseigné ont une valeur dans `ball_possession_pct`.
- AUCUNE valeur `ball_possession_pct` n'est en dehors de l'intervalle [0, 100].
- Un log indique le nombre de lignes traitées et les éventuelles erreurs de parsing.
