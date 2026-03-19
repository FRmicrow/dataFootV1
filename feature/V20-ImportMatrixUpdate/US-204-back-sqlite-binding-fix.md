# US-204: [Backend] Fix SQL Binding Errors in Stats Imports

**En tant que** Développeur Backend
**Je veux** sécuriser les bindings SQL lors des imports de stats (FS/PS)
**Afin d'** éviter les crashs dus à des types de données non supportés (objets/arrays).

## Tâches
- [ ] Identifier les champs provoquant l'erreur de binding SQL sur types non supportés.
- [ ] Appliquer `cleanParams` systématiquement dans `ImportService.js` et `fixtureService.js`.
- [ ] Ajouter des gardes-fous dans les Mappers pour transformer les types complexes en strings ou null.

## Exigences
- Aucun objet ne doit être passé tel quel à `db.run` ou `db.get`.
- Utiliser `JSON.stringify` ou extraire la valeur primitive si nécessaire.

## Critères d'Acceptation
- L'import d'Athletic Club vs Barcelona (fixture 53200+) passe sans erreur de type.
