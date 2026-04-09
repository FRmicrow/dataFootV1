# US-1914 - Dashboard de Simulation et Backtesting

**Rôle :** Frontend Engineer
**Objectif :** Créer une interface de visualisation des performances historiques des modèles.

## Contexte
Le Product Owner doit pouvoir valider la rentabilité et la stabilité d'un modèle sur les saisons passées avant mise en prod.

## Tâches
- [ ] Afficher la courbe de P&L (Bankroll over time) et le Max Drawdown.
- [ ] Visualiser la distribution de la CLV (Closing Line Value).
- [ ] Créer un Scatter Plot "Edge vs ROI" et un "Calibration Plot".
- [ ] Lister les paris simulés avec drill-down sur les justifications du modèle.

## Expertise Requise
- **Agents & Rules :**
    - `frontend-engineer.md` : Pour l'implémentation des graphiques (D3.js ou Recharts).
    - `machine-learning-engineer.md` : Pour l'exactitude des calculs de ROI et CLV affichés.
- **Skills :**
    - `machine-learning` : Analyse de performance de modèles prédictifs.

## Critères d'Acceptation
- Le dashboard permet de filtrer par saison, ligue, marché et stratégie de mise.
- Les graphiques sont interactifs et permettent d'identifier les zones de sous-performance.
- Les KPIs (ROI, Yield, Hit Rate) sont calculés de manière fiable à partir des tables Forge.
