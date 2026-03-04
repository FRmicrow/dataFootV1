# User Story: US-261 - Backend Country Metadata API

**En tant que** Backend Engineer,
**Je veux** que l'API des pays retourne des objets complets incluant les drapeaux et les rangs d'importance,
**Afin que** le sélecteur de pays du frontend puisse afficher les informations correctement et trier les nations.

## Tâches
- [ ] Modifier `SearchRepository.getSearchCountries` pour sélectionner tous les champs de `V3_Countries`.
- [ ] S'assurer que les pays sont triés par `importance_rank` puis par nom.

## Critères d'Acceptation
- L'appel à `/api/search/countries` retourne une liste d'objets `{ name, flag_url, importance_rank, ... }`.
- Le sélecteur de pays sur le frontend affiche de nouveau les drapeaux et les groupes "Top Nations".
