# US-203: [UI/UX] New League Discovery & Import Interface

**En tant que** Administrateur du système
**Je veux** pouvoir importer de nouvelles ligues non présentes dans la matrice via un menu de sélection Pays -> League
**Afin d'** étendre la couverture de données de l'application facilement.

## Tâches
- [ ] Ajouter deux menus déroulants (Pays, puis Leagues) dans `ImportMatrixPage.jsx` à côté du bouton "Discovery Scan".
- [ ] Interroger le backend pour obtenir la liste des pays et des ligues disponibles via l'API-Football.
- [ ] Filtrer les ligues déjà existantes en base pour ne proposer que des nouveautés.
- [ ] Ajouter un bouton "Import" qui déclenche l'import "Core".

## Exigences
- Le premier dropdown liste les pays.
- Le second dropdown liste les ligues du pays sélectionné.
- L'import doit être de type "Core" (Teams, Seasons, Standings, Fixtures).

## Critères d'Acceptation
- Impossible d'importer une ligue déjà présente.
- Les appels API sont limités au strict nécessaire.
