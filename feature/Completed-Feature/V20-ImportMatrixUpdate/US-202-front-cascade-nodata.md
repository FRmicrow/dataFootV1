# US-202: [UI] Cascade "No Data" Indicator for FS/PS

**En tant que** Administrateur du système
**Je veux** que l'indicateur "No Data" s'affiche en cascade pour les piliers FS et PS
**Afin de** identifier visuellement que les données historiques ne sont plus disponibles pour les saisons passées sans lancer d'import inutile.

## Tâches
- [ ] Modifier `deepSyncService.js` pour implémenter la logique de "Streak" (si 2 saisons n'ont pas de stats, marquer les précédentes comme `NO_DATA`).
- [ ] S'assurer que l'indicateur gris/noir est bien rendu sur le frontend pour ces cas.

## Exigences
- La cascade s'applique uniquement à FS (Fixture Stats) et PS (Player Stats).
- Le statut doit être persisté en base via `V3_Import_Status`.

## Critères d'Acceptation
- Sur une compétition comme la FA Cup, les indicateurs deviennent noirs pour les saisons où l'API ne fournit pas de stats détaillées.
