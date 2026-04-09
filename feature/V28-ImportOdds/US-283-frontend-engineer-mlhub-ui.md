# US-283: Refonte de la page ML Hub et intégration des Cotes (FrontEnd)

## 1. Rôle ciblé
@[.agents/rules/frontend-engineer.md]

## 2. Objectif
Remplacer les anciens écrans ("Forge", "Live Bet") par une vue unique et moderne "ML Hub" en utilisant les composants du Design System V3, et y intégrer l'affichage des cotes récupérées depuis le backend.

## 3. Contexte (Pourquoi)
L'affichage actuel ne correspond plus au standard V3 du projet. De plus, avec l'arrivée de l'historique et des prévisions de cotes (V28-ImportOdds), nous avons besoin d'une interface claire pour visualiser ces données analytiques de manière ergonomique.

## 4. Tâches attendues
- Examiner `frontend-pages.md` pour revoir la navigation.
- Supprimer les liens de menu "Forge" et "Live Bet" dans la navigation globale (Top et Left).
- Créer/Mettre à jour la route principale `/machine-learning/hub` (vérifier l'existant).
- Développer la vue "ML Hub" **exclusivement** avec les composants de `src/design-system/` (Cards, Tables, Grids, Typography...).
  - Une section pour visualiser les cotes de la semaine en cours.
  - S'il y a lieu, une section pour visualiser l'historique global ou un état d'importation des cotes.
- Intégrer les appels aux nouvelles API backend (US-282) via Axios ou RTK Query.
- Gérer les états de chargement (loaders) et d'erreur (Toasts) via le Design System.

## 5. Exigences spécifiques & Contraintes
- **Zéro CSS personnalisé** : Utilisez les utilitaires Tailwind fournis par le projet et les composants React du `src/design-system/index.js`.
- **Responsive** : La page "ML Hub" doit parfaitement s'afficher sur mobile et desktop.
- Le menu principal doit refléter proprement le changement ("ML Hub" à la place des anciens items).

## 6. Critères d'acceptation (Definition of Done)
- [ ] Les menus "Forge" et "Live Bet" ont disparu de l'interface principale.
- [ ] Le lien "ML Hub" est bien présent et mène à la nouvelle page.
- [ ] La page ML Hub affiche les données de l'API (cotes).
- [ ] Le code utilise strictement les composants du `src/design-system/`.
- [ ] Le design est "wahoo" (dynamique, clair, moderne).
