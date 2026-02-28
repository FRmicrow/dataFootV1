---
name: component-architecture
description: "Organiser et structurer les composants front-end de manière claire et réutilisable."
risk: safe
---

## When to use
Utilisez cette compétence à la création ou à la refonte de l’interface pour poser des bases solides et éviter la dette technique.

## Instructions
1. Déterminez les pages, sections et composants atomiques en vous basant sur les maquettes et les exigences.
2. Séparez les composants fonctionnels (logique, état) des composants de présentation (UI pure) afin de favoriser la réutilisation.
3. Organisez votre arborescence en dossiers logiques (ex. `pages/`, `layouts/`, `components/atoms/`, `components/molecules/`).
4. Passez les données via des propriétés (props) typées, et évitez les dépendances implicites pour faciliter le test et la maintenance.
5. Documentez les composants en précisant leurs props, leur comportement et éventuellement des exemples d’utilisation.

## Example
Créez une `NavBar` dans `components/molecules/NavBar.tsx` qui utilise des composants `NavItem` de `components/atoms/` et reçoit une liste de liens en prop.

## Limitations
Cette compétence se concentre sur la structure. La gestion de l’état global et la stylisation détaillée sont abordées dans d’autres compétences.