# US-200: [UI] Sorting by Country Importance (England First)

**En tant que** Administrateur du système
**Je veux** que le tableau de la matrice d'import soit trié par importance de pays (`importance_rank` ASC)
**Afin de** voir les compétitions majeures (comme l'Angleterre) en haut de la liste par défaut.

## Tâches
- [ ] Modifier la requête SQL dans `importMatrixController.js` pour trier par `c.importance_rank ASC`.
- [ ] Vérifier que le tri secondaire reste sur le rang d'importance de la league et le nom.
- [ ] Tester le rendu sur le frontend.

## Exigences
- L'Angleterre (Rank 1) doit apparaître en premier.
- Le tri doit être stable et cohérent.

## Critères d'Acceptation
- Au chargement de la page, les ligues anglaises sont en haut.
- Les pays avec un `importance_rank` plus élevé (ex: 999) sont en fin de tableau.
