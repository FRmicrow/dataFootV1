# US-243 : Refactoring du Code des Pages Existantes

**En tant que** Frontend Engineer,
**je veux** réécrire le code des pages principales en utilisant le nouveau `PageLayout` et le Design System,
**afin de** supprimer la "dégénérescence" du code et les styles hardcodés.

## Tâches
- [ ] Refactorer `V3Dashboard.jsx` pour utiliser `PageLayout`.
- [ ] Refactorer `ClubProfilePageV3.jsx` et `PlayerProfilePageV3.jsx`.
- [ ] Supprimer les fichiers `.css` locaux qui font doublon avec les tokens du Design System.
- [ ] Remplacer les éléments HTML natifs (`div`, `button` non stylés) par les composants DS (`Stack`, `Button`).

## Exigences
- **Strictement aucune modification visuelle finale pour l'utilisateur** (pixel-perfect par rapport à l'existant).
- Diminuer le ratio de CSS personnalisé par page de 50%.

## Critères d'Acceptation
- Les pages ciblées utilisent `PageLayout`.
- Le code source est plus court et plus lisible.
- Les tests manuels confirment que l'UI est identique.
