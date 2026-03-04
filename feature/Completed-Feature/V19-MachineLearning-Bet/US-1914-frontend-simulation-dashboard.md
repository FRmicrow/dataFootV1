# US-1914 - Dashboard de Simulation et Backtesting

**Rôle :** Frontend Engineer
**Objectif :** Créer une interface de visualisation des performances historiques des modèles.

## Contexte
Le Product Owner doit pouvoir valider la rentabilité et la stabilité d'un modèle sur les saisons passées avant mise en prod.

> [!IMPORTANT]
> **Indépendance Totale** : Le Dashboard de Simulation est une **page 100% nouvelle et indépendante**. Aucun impact sur les vues de statistiques ou de résultats actuelles.

## Tâches
- [ ] Afficher la courbe de P&L et le Max Drawdown. (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)
- [ ] Visualiser la distribution de la CLV. (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)
- [ ] Créer un Scatter Plot et un Calibration Plot. (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)
- [ ] Lister les paris simulés. (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)

## Expertise Requise
- **Agents & Rules :**
    - `frontend-engineer.md` : Pour l'implémentation des graphiques (D3.js ou Recharts).
    - `machine-learning-engineer.md` : Pour l'exactitude des calculs de ROI et CLV affichés.
- **Skills :**
    - `machine-learning` : Analyse de performance de modèles prédictifs.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour les composants UI complexes.
    - **Tests Interface** : Vérifier l'interactivité des graphiques et les filtres.
    - **Analyse des Logs Docker** : Vérifier la performance des requêtes SQL de backtest.
    - **Validation 100%** : Les données du dashboard doivent correspondre aux calculs backend.

## Critères d'Acceptation
- Le dashboard permet de filtrer par saison, ligue, marché et stratégie de mise.
- Les graphiques sont interactifs et permettent d'identifier les zones de sous-performance.
- Les KPIs (ROI, Yield, Hit Rate) sont calculés de manière fiable à partir des tables Forge.
