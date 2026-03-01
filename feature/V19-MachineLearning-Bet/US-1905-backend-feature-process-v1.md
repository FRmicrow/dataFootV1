# US-1905 - Feature Engineering : PROCESS_V1

**Rôle :** Backend Engineer / Machine Learning Engineer
**Objectif :** Calculer et stocker les features de dynamique de jeu (Rolling Stats) sur les 5 et 10 derniers matchs.

## Contexte
Les features `PROCESS_V1` capturent la forme récente et le style de jeu (possession, efficacité au tir, discipline). Elles complètent la baseline pour affiner les probabilités.

## Tâches
- [ ] Calculer les moyennes glissantes (Rolling Averages) pour les tirs, tirs cadrés, corners, fautes et cartons (Last 5 et Last 10).
- [ ] Calculer les ratios d'efficacité (`sot_rate`, `pass_acc_rate`).
- [ ] Calculer le `control_index` (moyenne pondérée possession + précision passes + tirs accordés).
- [ ] Calculer les stats spécifiques à la 1ère mi-temps (1H proxies).
- [ ] Enregistrer les résultats dans `V3_Team_Features_PreMatch` avec le tag `PROCESS_V1`.

## Expertise Requise
- **Agents & Rules :**
    - `machine-learning-engineer.md` : Pour la définition des rolling windows et indices composites.
    - `backend-engineer.md` : Pour l'optimisation des requêtes de calcul massif.
- **Skills :**
    - `machine-learning` : Traitement de séries temporelles et détection de drift.

## Critères d'Acceptation
- Le calcul exclut systématiquement le match en cours (strictement < kickoff).
- Les features capturent à la fois la performance produite ("For") et subie ("Against").
- Les 3 horizons (FULL, 5Y, 3Y) sont correctement calculés.
