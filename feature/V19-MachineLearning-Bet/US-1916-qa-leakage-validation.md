# US-1916 - Validation de l'Intégrité et Anti-Leakage (QA)

**Rôle :** QA Engineer / Security Expert
**Objectif :** Garantir l'absence de fuite de données (leakage) et la robustesse du pipeline ML.

## Contexte
Une erreur de leakage (utiliser le futur pour prédire le passé) rendrait les modèles inutilisables en conditions réelles.

## Tâches
- [ ] Développer une suite de tests auto-validant que `as_of <= kickoff_date` pour toutes les features.
- [ ] Vérifier la cohérence des probabilités (somme = 1, pas de valeurs négatives).
- [ ] Simuler des pannes de données (nulls, stats manquantes) et vérifier la résilience du pipeline.
- [ ] Auditer le Circuit Breaker en simulant un drawdown massif.

## Expertise Requise
- **Agents & Rules :**
    - `qa-engineer.md` : Pour la conception de la suite de tests anti-leakage.
    - `security-expert.md` : Pour l'audit de robustesse du moteur de risque.
- **Skills :**
    - `machine-learning` : Protocoles de validation rigoureux en séries temporelles.

## Critères d'Acceptation
- 100% des tests anti-leakage passent.
- Le rapport de QA certifie la validité des datasets d'entraînement.
- Le Circuit Breaker coupe les recommandations dès que les seuils critiques sont franchis.
