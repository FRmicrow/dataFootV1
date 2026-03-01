# US-1911 - Moteur de Gestion des Risques (Risk Engine)

**Rôle :** Backend Engineer / Machine Learning Engineer
**Objectif :** Implémenter la logique de décision de pari basée sur la confiance, la valeur et la bankroll.

## Contexte
Une bonne prédiction ne suffit pas ; il faut gérer la bankroll. Cette US implémente le `Confidence Score` et les règles de mise.

## Tâches
- [ ] Calculer le `Confidence Score` (0-100) basé sur la calibration, la complétude des données et le drift récent.
- [ ] Implémenter les algorithmes de staking : **Flat Staking** (1u) et **Fractional Kelly** (0.1 - 0.2).
- [ ] Définir les `Exposure Rules` (max mise par match, par équipe, par journée).
- [ ] Implémenter le `Circuit Breaker` (arrêt automatique si drawdown > 15% ou CLV négative).

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour l'implémentation robuste des règles de calcul financier.
    - `security-expert.md` : Pour la protection contre les anomalies de mise (Circuit Breaker).
- **Skills :**
    - `machine-learning` : Money management appliqué aux paris sportifs (Kelly criterion).

## Critères d'Acceptation
- Le moteur retourne une recommandation de mise (`stake`) pour chaque prédiction ayant de la valeur.
- Les limites d'exposition sont respectées.
- Le Circuit Breaker se déclenche correctement lors des tests de simulation.
