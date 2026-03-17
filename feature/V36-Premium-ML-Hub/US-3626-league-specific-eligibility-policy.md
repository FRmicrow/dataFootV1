# US-3626 - League Specific Eligibility Policy

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Architecture produit / Model governance`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux définir une politique d'éligibilité des modèles de ligue afin de n'activer une spécialisation que si elle apporte un gain réel.

**Raison (Pourquoi) :**
Afin d'éviter une fragmentation excessive des modèles et un surapprentissage sur des volumes insuffisants.

**Détails Techniques & Contraintes :**
- Définir volume minimum
- Définir conditions de récence et de qualité
- Définir la politique d'activation/désactivation
- Partir du principe suivant:
  - `global` toujours disponible
  - `league_specific` seulement si volume, complétude, performance et calibration sont suffisants
- Évaluer en priorité:
  - Premier League
  - La Liga
  - Bundesliga
  - Serie A
  - Ligue 1
- Considérer comme incertain à ce stade:
  - Primeira Liga
  - Eredivisie
  - Belgian Pro League
  - Europa Conference League
- Exclure en V1:
  - `club_specific`
  - `club_by_league_specific`

**Skills à activer :**
- `project-context`
- `machine-learning`
- `docs`
- `data-analyzer`

**Dépendances :**
- `US-3620`
- `US-3625`

**Livrable :**
- Politique d'éligibilité `league_specific`

**Scénarios de Test / Preuves de QA :**
- Tableau des critères d'éligibilité
- Exemple d'application à une ligue éligible et une ligue non éligible
- Preuve qu'aucun modèle de ligue n'est activé sans battre la baseline globale hors échantillon
