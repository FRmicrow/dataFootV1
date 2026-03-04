# US-242 : Réorganisation de l'Architecture des Dossiers

**En tant que** Frontend Engineer,
**je veux** structurer le dossier `components/v3/` en sous-dossiers logiques,
**afin de** faciliter la maintenance et clarifier les responsabilités (pages vs composants vs features).

## Tâches
- [ ] Créer les dossiers `pages/` et `modules/` (ou `features/`) dans `src/components/v3/`.
- [ ] Déplacer les vues principales (ex: `V3Dashboard.jsx`, `ClubProfilePageV3.jsx`) vers `pages/`.
- [ ] Déplacer les composants métier complexes (ex: `ForgeLaboratory`, `TelemetryConsole`) vers `modules/`.
- [ ] Mettre à jour tous les imports dans le projet.
- [ ] Mettre à jour les routes dans `App.jsx`.

## Exigences
- L'application doit continuer de fonctionner sans erreur 404 ni crash React.
- Garder une hiérarchie plate au sein de `pages/` pour éviter la confusion.

## Critères d'Acceptation
- Le dossier `src/components/v3/` ne contient plus une liste plate de 50+ fichiers.
- L'arborescence est claire et documentée dans `frontend-pages.md`.
