# US-1911 - Moteur de Gestion des Risques (Risk Engine)

**Rôle :** Backend Engineer / Machine Learning Engineer
**Objectif :** Implémenter la logique de décision de pari basée sur la confiance, la valeur et la bankroll.

## Contexte
Une bonne prédiction ne suffit pas ; il faut gérer la bankroll. Cette US implémente le `Confidence Score` et les règles de mise.

> [!IMPORTANT]
> **Indépendance Totale** : Le moteur de risque est spécifique au pipeline ML V3. Il ne modifie aucune règle de pari ou de sécurité financière globale déjà en place.

## Tâches
- [ ] Calculer le `Confidence Score` (0-100) basé sur la calibration. (Agent: `Machine Learning Engineer`, Skill: `machine-learning`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Implémenter les algorithmes de staking : **Flat Staking** et **Fractional Kelly**. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Définir les `Exposure Rules`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)
- [ ] Implémenter le `Circuit Breaker`. (Agent: `Backend Engineer`, Skill: `Python/Data Processing`, Workflow: `run-tests`, Analysis: `Docker Logs`)

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour l'implémentation robuste des règles de calcul financier.
    - `security-expert.md` : Pour la protection contre les anomalies de mise (Circuit Breaker).
- **Skills :**
    - `machine-learning` : Money management appliqué aux paris sportifs (Kelly criterion).
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour vérifier les calculs de risque.
    - **Analyse des Logs Docker** : Vérifier que le circuit breaker ne se déclenche pas à tort.
    - **Validation 100%** : Simulation sur 100 paris pour vérifier le respect de la bankroll.

## Critères d'Acceptation
- Le moteur retourne une recommandation de mise (`stake`) pour chaque prédiction ayant de la valeur.
- Les limites d'exposition sont respectées.
- Le Circuit Breaker se déclenche correctement lors des tests de simulation.
