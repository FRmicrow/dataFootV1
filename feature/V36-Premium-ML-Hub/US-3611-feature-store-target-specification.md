# US-3611 - Feature Store Target Specification

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Product Architecture / Feature Engineering`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux définir le feature store cible en blocs fonctionnels afin que train et inference consomment un schéma stable et explicite.

**Raison (Pourquoi) :**
Afin de remplacer le split trop grossier `BASELINE_V1 / PROCESS_V1` par une structure gouvernable par marché.

**Détails Techniques & Contraintes :**
- Définir:
  - `BASELINE_CORE`
  - `FORM_RECENT`
  - `STYLE_PROCESS`
  - `MATCH_CONTEXT`
  - `MARKET_SPECIFIC`
- Pour chaque bloc: finalité, contenu, horizon, consommateurs
- Geler la méthode de stabilisation du contrat:
  - version de schéma
  - ordre des colonnes
  - types
  - règles de défaut autorisées
  - validation train/inference
- Prioriser l'enrichissement équipe sur:
  - Premier League
  - La Liga
  - Bundesliga
  - Serie A
  - Ligue 1
  - Champions League
  - Europa League
  - puis Primeira Liga, Eredivisie, Belgian Pro League, Europa Conference League

**Skills à activer :**
- `project-context`
- `machine-learning`
- `data-analyzer`
- `docs`

**Dépendances :**
- `US-3610`

**Livrable :**
- Catalogue cible des blocs de features

**Scénarios de Test / Preuves de QA :**
- Cartographie de chaque feature existante vers un bloc cible ou une suppression
- Validation que tous les marchés cibles sont couverts par au moins un bloc dédié
- Validation que le contrat gèle explicitement les colonnes et leur ordre
