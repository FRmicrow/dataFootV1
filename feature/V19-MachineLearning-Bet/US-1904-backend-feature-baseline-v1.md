# US-1904 - Feature Engineering : BASELINE_V1

**Rôle :** Backend Engineer / Machine Learning Engineer
**Objectif :** Calculer et stocker les features structurelles (Elo, Classement, Puissance Lineup) pour chaque équipe et chaque match.

## Contexte
Les features `BASELINE_V1` représentent le niveau intrinsèque des équipes avant toute considération sur la dynamique de jeu récente. Elles sont fondamentales pour la capacité prédictive du modèle.

## Tâches
- [ ] Récupérer le dernier score Elo disponible (< kickoff) via `V3_Team_Ratings`.
- [ ] Extraire le snapshot du classement (`rank`, `points`, `goals_diff`) juste avant le match via `V3_Standings`.
- [ ] Calculer le `lineup_strength_v1` (moyenne pondérée des performances passées des 11 titulaires).
- [ ] Enregistrer les résultats dans `V3_Team_Features_PreMatch` avec le tag `BASELINE_V1`.
- [ ] Gérer les 3 horizons temporels (FULL, 5Y, 3Y).

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la sélection des features et la gestion du leakage.
    - `backend-engineer.md` : Pour l'implémentation des calculs batch.
- **Skills :**
    - `machine-learning` : Concepts d'Elo et de feature normalization.

## Critères d'Acceptation
- Les calculs respectent strictement le point de coupe temporel (`as_of`).
- Les features sont stockées au format JSON valide dans la table dédiée.
- Les cas de données manquantes (ex: début de saison pour le classement) sont gérés (valeurs `null` ou moyennes de ligue).
