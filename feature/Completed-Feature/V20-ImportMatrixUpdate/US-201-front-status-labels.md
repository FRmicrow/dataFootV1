# US-201: [UI] Logic for "Green + Padlock" per Pillar

**En tant que** Administrateur du système
**Je veux** que chaque indicateur de pilier (Core, Events, etc.) devienne vert avec un cadenas dès que ses données spécifiques sont complètes
**Afin de** ne pas avoir à attendre que TOUS les types de données soient importés pour voir un succès visuel par catégorie.

## Tâches
- [ ] Mettre à jour `ImportMatrixPage.jsx` pour gérer les codes de statut `COMPLETE` (2) et `LOCKED` (4) de manière plus précise.
- [ ] S'assurer que le calcul du statut dans `importMatrixController.js` renvoie bien `COMPLETE` dès que le pilier est fini.
- [ ] Modifier le CSS si nécessaire pour l'icône verte + cadenas.

## Exigences
- Si un pilier est `COMPLETE`, l'indicateur doit être vert.
- Si un pilier est `LOCKED`, l'icône cadenas doit être affichée.

## Critères d'Acceptation
- Un succès partiel (un pilier fini) est visible immédiatement.
- Cliquer sur un indicateur vert demande une confirmation de re-import (comportement existant à préserver).
