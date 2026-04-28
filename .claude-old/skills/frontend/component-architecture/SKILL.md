---
name: component-architecture
description: "Structurer les composants React. Utiliser quand on organise des composants dans frontend/src/components/v3/."
risk: safe
---

## When to use
Utilisez cette compétence à la création ou à la refonte de l’interface pour poser des bases solides et éviter la dette technique.

## Instructions
1. Déterminez les pages, sections et composants atomiques en vous basant sur les maquettes et les exigences.
2. Séparez les composants fonctionnels (logique, état) des composants de présentation (UI pure) afin de favoriser la réutilisation.
3. Organisez votre arborescence en dossiers logiques (ex. `pages/`, `layouts/`, `components/v3/modules/`, `components/v3/pages/`).
4. Passez les données via des propriétés (props) typées, et évitez les dépendances implicites pour faciliter le test et la maintenance.
5. Documentez les composants en précisant leurs props, leur comportement et éventuellement des exemples d’utilisation.

## Example
Créez une `NavBar` dans `components/v3/pages/NavBar.tsx` qui utilise des composants `NavItem` de `components/v3/modules/` et reçoit une liste de liens en prop.

## Limitations
Cette compétence se concentre sur la structure. La gestion de l’état global et la stylisation détaillée sont abordées dans d’autres compétences.