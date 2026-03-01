# US-173 : Evolution du ProfileHeader pour le support des dégradés

**En tant que** Frontend Engineer
**Je veux** améliorer le composant `ProfileHeader` pour supporter des architectures de couleurs multiples
**Afin de** créer une expérience visuelle immersive et premium.

## Tâches
- [x] Ajouter les props `secondaryColor` et `tertiaryColor` au composant `ProfileHeader.jsx`.
- [x] Injecter ces couleurs comme variables CSS (`--header-secondary`, `--header-tertiary`).
- [x] Mettre à jour `ProfileHeader.css` pour utiliser un `linear-gradient` ou des rayons lumineux combinant les 3 couleurs.
- [x] Ajouter des fallbacks pour conserver la compatibilité avec les pages n'ayant qu'une seule couleur.

## Exigences
- Le design doit rester lisible (contraste texte/fond).
- Utilisation de gradients subtils et modernes.

## Critères d'acceptation
- Le composant affiche un dégradé si plusieurs couleurs sont fournies.
- Le composant reste fonctionnel avec une seule couleur (comportement actuel).
