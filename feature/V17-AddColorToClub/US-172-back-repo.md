# US-172 : Mise à jour des repositories pour inclure les couleurs

**En tant que** Backend Engineer
**Je veux** exposer les nouvelles colonnes de couleur via les repositories existants
**Afin que** le frontend puisse les consommer via les APIs de profil.

## Tâches
- [ ] Modifier `PlayerRepository.js` pour inclure `accent_color`, `secondary_color` et `tertiary_color` dans l'objet `team` de `getCurrentContext`.
- [ ] Vérifier que `ClubRepository.js` (qui utilise `SELECT t.*`) expose déjà les nouvelles colonnes via `getClubProfileWithVenue`.

## Exigences
- Les couleurs doivent être optionnelles dans les retours API (fallback si NULL).

## Critères d'acceptation
- L'endpoint `GET /api/player/:id` renvoie les couleurs de l'équipe actuelle du joueur.
- L'endpoint `GET /api/club/:id` renvoie les couleurs du club.
