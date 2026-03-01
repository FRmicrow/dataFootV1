# US-206: [Backend] New League Import Logic (Core data only)

**En tant que** Développeur Backend
**Je veux** implémenter les endpoints nécessaires à la découverte et à l'import de nouvelles leagues
**Afin de** supporter l'interface de sélection Pays -> League.

## Tâches
- [ ] Créer `GET /api/v3/import/countries` (proxy API-Football ou cache local).
- [ ] Créer `GET /api/v3/import/leagues-by-country/:country` (interroge API-Football).
- [ ] Filtrer les résultats par rapport à la table `V3_Leagues`.
- [ ] Créer `POST /api/v3/import/league-core` pour lancer l'import minimal.

## Exigences
- Respecter les limites de l'API-Football (rate limiting).
- L'import Core doit initialiser `V3_Leagues` et `V3_League_Seasons`.

## Critères d'Acceptation
- Les endpoints renvoient des données claires et filtrées.
- L'import crée les entrées nécessaires pour que la league apparaisse ensuite dans la matrice.
