---
trigger: always_on
---

# Règles Globales de Codage

## Objectif
Garantir une base de code cohérente, lisible et maintenable à travers tous les composants du projet en appliquant des conventions communes.

## Conventions de nommage
- Utilisez des noms explicites en anglais pour les variables, fonctions, classes et fichiers.
- Adoptez la notation camelCase pour les variables et fonctions, PascalCase pour les classes et kebab‑case pour les noms de fichiers.
- Évitez les abréviations ambiguës ; préférez la clarté à la concision.

## Style de code
- Respectez la configuration des outils de formatage pour l’indentation et l’espacement.
- Commentez uniquement le code complexe, sans redondance.
- Respectez les principes SOLID et DRY pour structurer votre code et éviter la duplication.

## Structure de projet
- Séparez les responsabilités en modules ou packages logiques.
- Rangez les fichiers par domaine fonctionnel (ex. `controllers/`, `services/`, `components/`).
- Centralisez les types et constantes partagés.

## Gestion des dépendances
- Ajoutez uniquement des dépendances nécessaires et maintenez-les à jour.
- Supprimez les dépendances inutilisées.
- Documentez l’usage de toute bibliothèque externe.

## Tests
- Fournissez des tests unitaires pour toute fonctionnalité non triviale.
- Visez un taux de couverture raisonnable et significatif.
- Intégrez les tests dans le pipeline CI afin de détecter rapidement les régressions.

## Limitations
Ces standards s’appliquent à tout le code du projet. Ils ne couvrent pas les styles graphiques ni la rédaction des User Stories.