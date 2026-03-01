# US-1902 - Nettoyage et Normalisation de la Possession

**Rôle :** Backend Engineer
**Objectif :** Convertir les données de possession textuelles ("55%") en entiers exploitables par les modèles ML.

## Contexte
La table `V3_Fixture_Stats` contient la possession sous forme de texte. Pour le ML, nous avons besoin d'une colonne `ball_possession_pct` de type INTEGER propre et sans valeurs manquantes (backfill si disponible via 100-x).

## Tâches
- [ ] Développer un script de backfill `backfill_possession_pct.py`.
- [ ] Parser le champ `ball_possession` (ex: "55%" -> 55).
- [ ] Gérer les cas où une seule équipe a l'info (déduire l'autre équipe : 100 - X).
- [ ] Valider l'intégrité (0 <= pct <= 100).
- [ ] Mettre à jour `V3_Fixture_Stats.ball_possession_pct`.

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour la logique de nettoyage et gestion des erreurs.
    - `global-coding-standards.md` : Pour la qualité du script Python.
- **Skills :**
    - Utilisation des bibliothèques standards de data processing (Pandas/JSON).

## Critères d'Acceptation
- 100% des lignes ayant `ball_possession` renseigné ont une valeur dans `ball_possession_pct`.
- AUCUNE valeur `ball_possession_pct` n'est en dehors de l'intervalle [0, 100].
- Un log indique le nombre de lignes traitées et les éventuelles erreurs de parsing.
