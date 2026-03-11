# US-330 - Tracking xG par Joueur & Refonte Surveillance

**1. Contexte :**
- Feature parente : V33 - Player-xG-Tracking
- Couche technique ciblée : Backend (Import) & Frontend (Surveillance Rework)

**2. Intention (Qui & Quoi) :**
En tant qu'utilisateur, je veux suivre les statistiques xG détaillées par joueur (importées depuis les fichiers Understat) et disposer d'une page de surveillance claire, optimisée et en pleine largeur.

**3. Raison (Pourquoi) :**
Pour identifier les joueurs qui surperforment ou sous-performent par rapport à leurs Expected Goals et analyser l'efficacité individuelle dans un format visuel plus moderne et exploitable.

**4. Détails Techniques & Contraintes :**
- Création d'un script d'import pour les fichiers `*player*.json` situés dans `xG-PerYear-League-Player/`.
- Extension du schéma de base de données pour stocker les métriques xG joueurs par saison (G, xG, NPxG, xA, etc.).
- Renommage de l'onglet "Surveillance" en "Player Insights" ou nom similaire pertinent.
- Refonte du design de la page :
    - Passer le tableau en pleine largeur (100% width).
    - Intégrer les informations du "Golden Boot" directement dans le tableau principal ou sous un format plus compact.
- Assurer la cohérence des jointures avec la table `V3_Players`.

**5. Scénarios de Test / Preuves de QA (OBLIGATOIRE) :**
- Lancer le script d'import -> Vérifier en DB que les stats xG sont associées aux bons joueurs.
- Navigation vers l'onglet renommé -> Le tableau occupe toute la largeur de l'écran.
- Tri du tableau par n'importe quelle colonne (xG, Goals, xA) -> Le classement est correct.
- Vérifier que l'affichage est fluide sur différentes tailles d'écran (responsive).
