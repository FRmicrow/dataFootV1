# US-207: [UI/Backend] Batch System for New League Discovery

**En tant que** Administrateur du système
**Je veux** pouvoir ajouter plusieurs ligues découvertes à une file d'attente avant de lancer l'importation
**Afin d'** importer plusieurs compétitions en une seule opération groupée.

## Tâches
- [ ] Modifier `ImportMatrixPage.jsx` pour ajouter une "Discovery Staging Area".
- [ ] Ajouter un bouton "Add to Batch" dans le groupe Discovery.
- [ ] Afficher la liste des ligues prêtes à être importées avec possibilité de les supprimer.
- [ ] Créer un endpoint `POST /api/v3/import/discovery/batch` pour traiter la liste.
- [ ] Adapter le backend pour itérer sur les ligues demandées.

## Exigences
- La file d'attente doit être visible avant l'exécution.
- Chaque ligue de la file doit avoir sa saison "current" automatiquement résolue.

## Critères d'Acceptation
- Je peux sélectionner la Ligue A, cliquer sur "Add", sélectionner la Ligue B, cliquer sur "Add".
- La liste affiche "Ligue A (2025)", "Ligue B (2025)".
- Cliquer sur "Process Discovery Batch" lance l'import SSE pour toutes les ligues.
