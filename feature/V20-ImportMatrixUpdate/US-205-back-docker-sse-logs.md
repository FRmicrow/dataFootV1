# US-205: [Backend] Fix Live Progress Logs (SSE) in Docker

**En tant que** Utilisateur
**Je veux** voir l'avancement de l'import en direct dans le panneau de logs
**Afin de** suivre le processus sans avoir l'impression que le système est figé.

## Tâches
- [ ] Modifier les headers SSE dans `importMatrixController.js` et autres contrôleurs d'import.
- [ ] Ajouter un padding (2KB) au début du flux pour "réveiller" les proxys/Docker.
- [ ] S'assurer que `res.flush()` ou équivalent est appelé si un middleware de compression est présent.
- [ ] Vérifier la gestion de la déconnexion côté client dans `ImportContext.jsx`.

## Exigences
- Les logs doivent apparaître ligne par ligne.
- Compatible avec l'environnement Docker.

## Critères d'Acceptation
- Dès le lancement d'un import, les lignes "Syncing..." s'affichent instantanément.
