# US-271 : Améliorations de la Page League (SeasonOverviewPage)

**1. Contexte :**
- Feature parente : V27 - FixFrontIssue
- Couche technique ciblée : Frontend

**2. Intention (Qui & Quoi) :**
En tant qu'utilisateur naviguant sur une compétition (League), je veux une Control Bar plus esthétique, avoir l'onglet "Standings" sélectionné par défaut, et pouvoir utiliser le filtre de rang (filter-rank) sans bug d'affichage.

**3. Raison (Pourquoi) :**
Pour faciliter mon accès aux classements d'emblée, corriger les défauts d'UI et de composants non standards, et améliorer l'esthétique générale de la page de ligue.

**4. Détails / Scénarios (Critères d'Acceptation) :**
- [ ] Dans la "Control bar", ajouter des `border-radius` cohérents et réduire l'espacement avec le header.
- [ ] Lors du chargement de la page, l'onglet actif par défaut doit être "Standings".
- [ ] Dans la fonctionnalité de filtre (`filter-rank`), corriger le bug empêchant l'affichage des chiffres.
- [ ] L'input du `filter-rank` doit être remplacé par un composant standard du Design System (ou un nouveau doit être créé dans `src/design-system/` si inexistant).
