# US-174 : Intégration des couleurs sur la page Club

**En tant que** Frontend Engineer
**Je veux** passer les couleurs spécifiques du club au `ProfileHeader`
**Afin de** personnaliser l'identité visuelle de chaque page club.

## Tâches
- [x] Modifier `ClubProfilePageV3.jsx` pour extraire `secondary_color` et `tertiary_color` de l'objet `club`.
- [x] Passer ces couleurs au composant `ProfileHeader`.

## Exigences
- Pas de régression si les couleurs sont absentes (utilisation du thème par défaut).

## Critères d'acceptation
- La page club affiche l'identité visuelle propre au club via son dégradé de couleurs.
