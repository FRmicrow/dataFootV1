# US-220 : Composants de Sélection Personnalisés

**Rôle :** En tant qu'utilisateur du Hub StatFoot
**Objectif :** Disposer de menus déroulants (dropdowns) stylisés et réactifs
**Bénéfice :** Améliorer l'esthétique premium de l'interface et la cohérence avec le design system

## Tâches
- [ ] Créer un composant `Select` générique dans le design system
- [ ] Implémenter la gestion du focus et de l'accessibilité
- [ ] Ajouter des animations d'ouverture/fermeture (micro-animations)
- [ ] Remplacer les `<select>` natifs dans `ClubProfilePageV3` et `V3Dashboard` par ce nouveau composant

## Exigences
- Le composant doit supporter le mode sombre et le glassmorphism
- Le composant doit être totalement contrôlé par React
- Le composant doit s'adapter à la largeur de son conteneur

## Critères d'Acceptation
- Cliquer sur le sélecteur affiche une liste d'options stylisée
- La sélection d'une option met à jour l'état du parent et ferme le menu
- Le design est cohérent avec les `MetricCard` et autres éléments du design system
- Navigation au clavier supportée (flèches + Enter)
