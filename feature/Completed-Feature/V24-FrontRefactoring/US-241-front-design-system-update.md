# US-241 : Mise à jour du Design System Explorer

**En tant que** Frontend Engineer,
**je veux** intégrer tous les composants restants du Design System dans la page de démonstration,
**afin de** disposer d'un catalogue complet et interactif pour le développement.

## Tâches
- [ ] Identifier tous les composants dans `src/design-system/components/` non présents dans `DesignSystemPage.jsx`.
- [ ] Ajouter une section ou des onglets pour : `ControlBar`, `Select`, `Skeleton`, `Table`, `TeamSelector`.
- [ ] Créer des exemples interactifs pour chaque composant (ex: changement d'état au clic).
- [ ] Vérifier que les composants `stories.jsx` (Storybook-like) sont bien représentés.

## Exigences
- Ne pas introduire de CSS ad-hoc dans `DesignSystemPage.jsx`.
- Tous les composants doivent être affichés avec leurs variantes (primary, secondary, etc.).

## Critères d'Acceptation
- La page `/design` affiche désormais 100% des composants de `src/design-system`.
- Chaque composant a au moins un exemple fonctionnel.
