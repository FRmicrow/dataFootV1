# User Story: US-260 - Backend Search Results Structure

**En tant que** Backend Engineer,
**Je veux** que l'API de recherche retourne un objet structuré contenant des listes séparées pour les joueurs et les clubs,
**Afin d'** assurer la compatibilité avec le frontend et permettre un affichage en deux colonnes.

## Tâches
- [ ] Modifier `SearchRepository.globalSearch` pour séparer les résultats `players` et `clubs`.
- [ ] Mapper les champs SQL vers les noms attendus par le front (`player_id`, `team_id`, `photo_url`, `logo_url`).
- [ ] Ajouter une jointure avec `V3_Countries` pour récupérer les drapeaux des pays/nationalités.
- [ ] Implémenter un tri par pertinence (match exact > importance_rank du pays).

## Critères d'Acceptation
- L'appel à `/api/search?q=...` retourne un objet `{ players: [...], clubs: [...] }`.
- Chaque item contient les URLs d'images et de drapeaux valides.
- Pas d'erreur 500 lors de recherches vides ou avec des caractères spéciaux.
