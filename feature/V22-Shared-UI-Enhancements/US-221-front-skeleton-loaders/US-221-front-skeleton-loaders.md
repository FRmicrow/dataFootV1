# US-221 : Écrans de Chargement (Skeletons)

**Rôle :** En tant qu'utilisateur du Hub StatFoot
**Objectif :** Remplacer les spinners par des squelettes de chargement (skeleton screens)
**Bénéfice :** Réduire la perception du temps de chargement et éviter les sauts de contenu (CLS)

## Tâches
- [ ] Créer un composant `Skeleton` de base (forme, dimension, animation de pulse)
- [ ] Créer des composants de squelette spécifiques (`MetricCardSkeleton`, `TableSkeleton`, `ProfileHeaderSkeleton`)
- [ ] Intégrer les skeletons dans `V3Dashboard.jsx`
- [ ] Intégrer les skeletons dans `ClubProfilePageV3.jsx`
- [ ] Harmoniser l'animation de pulse avec les tokens existants

## Exigences
- L'animation de pulse doit être fluide et subtile
- Les skeletons doivent correspondre parfaitement aux dimensions des composants finaux
- Utilisation du glassmorphism `--glass-bg` pour le fond des skeletons

## Critères d'Acceptation
- En attendant le chargement des données, l'utilisateur voit une représentation grisée/pulsante de la page
- Le passage du skeleton au contenu réel est fluide (transition de fondu)
- Aucun "flash" ou saut brusque de layout lors du chargement
