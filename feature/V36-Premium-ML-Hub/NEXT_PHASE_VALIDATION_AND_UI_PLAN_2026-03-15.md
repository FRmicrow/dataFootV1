# Next Phase Plan

Date de référence: `2026-03-15`

Ce document fixe la suite après la stabilisation du socle ML:
- validation réelle des prédictions et des couches shadow
- simulation saison pilote
- cadrage produit du module `ML-Hub`

Il complète:
- [TRAINING_ENTRYPOINT_2026-03-14.md](/Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/feature/V36-Premium-ML-Hub/TRAINING_ENTRYPOINT_2026-03-14.md)

## 1. Situation de départ

À date, le système ML dispose déjà de:
- données historiques détaillées branchées depuis `2015/2016+`
- feature store `global_1x2_v3`
- modèles globaux actifs sur les 5 marchés
- policy `league-specific`
- runtime `shadow` pour `FT`, `GOALS`, `CARDS`
- couche `league adjustment` sur `GOALS`, `CARDS`, `CORNERS`

Le prochain enjeu n’est plus de “fabriquer des modèles”.
Le prochain enjeu est de:
- mesurer proprement leur valeur réelle
- rendre ces informations lisibles dans l’interface

## 2. Objectifs de la phase suivante

### Objectif A
Valider en environnement contrôlé si les couches additionnelles améliorent réellement les sorties:
- modèle global brut
- modèle global + ajustement ligue
- modèle `league-specific` en shadow

### Objectif B
Construire un `ML-Hub` qui ne soit pas seulement un écran de prédictions, mais un cockpit d’exploitation:
- lecture match
- lecture marché
- lecture modèle
- lecture validation

## 3. Validation: méthode retenue

La validation doit se faire en deux niveaux.

### Niveau 1. Simulation chronologique pilotée

But:
- rejouer une saison fermée, match par match, dans l’ordre temporel
- comparer les différentes couches aux résultats réels

### Niveau 2. Runtime shadow réel

But:
- enregistrer les sorties sur les prochains matchs à venir
- comparer ensuite à la réalité quand les matchs sont terminés

Les deux niveaux sont complémentaires:
- la simulation donne une preuve rapide et structurée
- le shadow réel donne la vérité produit/runtime

## 4. Simulation saison pilote

### Pourquoi une saison pilote

Oui, c’est utile, et fortement.

Une saison pilote permet de:
- vérifier si les conclusions offline tiennent sur un calendrier complet
- comparer ligues contrastées
- mesurer la stabilité match après match
- préparer le `ML-Hub` avec des données réellement interprétables

### Ligues pilotes recommandées

Phase 1:
- `Premier League`
- `La Liga`

Phase 2:
- `Eredivisie`
- `Ligue 1`

Pourquoi:
- `Premier League` et `La Liga` sont très contrastées
- elles ont du volume
- elles servent de stress test sur:
  - intensité
  - possession
  - discipline
  - corners
  - ouverture de match

### Saison recommandée

Base de départ:
- `2024/2025`

Pourquoi:
- saison fermée
- suffisamment récente pour refléter le football actuel
- suffisamment couverte dans les tables déjà reconstruites

### Sorties à comparer pour chaque match

#### `FT 1X2`
- global brut
- league-specific shadow si disponible

#### `HT 1X2`
- global brut

#### `GOALS_OU`
- global brut
- global ajusté
- league-specific shadow si disponible

#### `CORNERS_OU`
- global brut
- global ajusté

#### `CARDS_OU`
- global brut
- global ajusté
- league-specific shadow si disponible

### Métriques à calculer

#### `1X2_FT`
- accuracy
- log loss
- brier score

#### `1X2_HT`
- accuracy
- log loss

#### `GOALS_OU`
- RMSE sur `expected_goals.total`
- accuracy directionnelle `Over 2.5`

#### `CORNERS_OU`
- RMSE sur `expected_corners.total`
- accuracy directionnelle `Over 9.5`

#### `CARDS_OU`
- RMSE sur `expected_cards.total`
- accuracy directionnelle `Over 4.5`

### Comparaisons attendues

Pour chaque marché:
- `global_raw` vs `global_adjusted`
- `global_raw` vs `league_shadow`
- `global_adjusted` vs `league_shadow`

### Sortie attendue de la simulation

Un rapport par ligue et par marché, par exemple:
- `reports/pilot_season_premier_league_2024_2025.json`
- `reports/pilot_season_la_liga_2024_2025.json`

Et un résumé consolidé:
- `reports/pilot_season_summary_2024_2025.json`

## 5. Règles de décision après simulation

### Passage `adjustment` de shadow à recommandé

On peut considérer une couche d’ajustement valide si:
- elle améliore la métrique principale
- sans dégrader fortement la métrique secondaire
- et si le gain est stable sur toute la saison

Exemples:
- `GOALS`: meilleur RMSE sans perte excessive de hit rate
- `CARDS`: meilleure accuracy `Over 4.5` sans dérive RMSE forte
- `CORNERS`: meilleur compromis RMSE + accuracy directionnelle

### Passage `league-specific` de shadow à active

Conditions minimales:
- battre le global sur la ligue concernée
- battre aussi la version ajustée si elle existe
- tenir sur une saison pilote complète
- tenir ensuite sur du shadow réel

Tant que ces conditions ne sont pas réunies:
- `shadow` reste la bonne posture

## 6. Plan de mise en oeuvre de la validation

### Étape 1
Créer un runner de simulation chronologique par saison et par ligue.

Entrées:
- `league_id`
- `season_year` ou bornes date

Sorties:
- prédictions de chaque marché
- version modèle utilisée
- présence ou non:
  - `shadow_evaluation`
  - `adjustment_evaluation`
- résultat réel final

### Étape 2
Construire les agrégations:
- métriques par marché
- métriques par mode
- écarts brut vs ajusté vs shadow

### Étape 3
Construire un export lisible pour le futur `ML-Hub`

## 7. Blueprint du module `ML-Hub`

Le `ML-Hub` doit devenir un cockpit de lecture et de décision.

### 7.1. Page principale

Nom suggéré:
- `ML Intelligence Hub`

Sections:
- résumé système
- match explorer
- performance lab
- policy explorer
- training registry

## 8. Écran 1: Command Center

Objectif:
- voir immédiatement l’état du système

Blocs:
- modèles globaux actifs
- schémas actifs
- horizons actifs
- nombre de ligues en `shadow`
- nombre de ligues `rejected`
- couverture des ajustements ligue
- dernière génération des facteurs

KPI cards à afficher:
- `Active Markets`
- `Feature Schema`
- `League Shadow Coverage`
- `Adjustment Coverage`
- `Latest Retrain`
- `Registry Integrity`

## 9. Écran 2: Match Prediction Console

C’est l’écran central produit.

### Entrées
- recherche par `fixture_id`
- recherche par équipe
- filtre par ligue
- liste des matchs à venir déjà disponibles

### Contenu

#### Bloc A. Header match
- équipes
- compétition
- date
- statut
- modèle primary par marché

#### Bloc B. 5 cartes marchés
- `FT`
- `HT`
- `GOALS`
- `CORNERS`
- `CARDS`

Chaque carte doit afficher:
- prédiction primaire
- score/ligne attendue
- version modèle
- horizon
- scope

#### Bloc C. Modes de lecture

Pour les marchés qui le supportent:
- `Primary`
- `Without adjustment`
- `With league adjustment`
- `League shadow candidate`

Donc concrètement, pour `GOALS` et `CARDS`:
- brut
- ajusté
- shadow league-specific si dispo

Pour `CORNERS`:
- brut
- ajusté

Pour `FT`:
- brut
- shadow league-specific si dispo

#### Bloc D. Key factors

Afficher les facteurs les plus utiles pour expliquer le match:
- avantage Elo
- forme récente
- xG récents
- matchup_open_game_index
- profil corners/cards/tempo
- indices de ligue

#### Bloc E. Deltas

Afficher explicitement les écarts:
- `adjustment delta`
- `shadow delta`

Exemple:
- `Over 2.5 raw: 48.8%`
- `Over 2.5 adjusted: 50.9%`
- `delta: +2.1 pts`

## 10. Écran 3: League Policy Explorer

Objectif:
- comprendre la gouvernance des ligues

Table par marché:
- ligue
- mode (`global`, `shadow`, `rejected`)
- horizon recommandé
- métriques globales
- métriques league-specific
- verdict

Permet de répondre rapidement à:
- pourquoi cette ligue est en `shadow`
- pourquoi elle est rejetée

## 11. Écran 4: Performance Lab

Objectif:
- visualiser les résultats de simulation et de validation

Filtres:
- ligue
- saison
- marché
- mode (`global_raw`, `global_adjusted`, `league_shadow`)

Graphiques/tableaux:
- accuracy/log loss/brier par ligue
- RMSE/hit rate par marché
- évolution chronologique sur la saison
- comparaison brut vs ajusté

## 12. Écran 5: Model Registry & Training History

Objectif:
- voir l’état du registre et les choix actifs

Table:
- nom modèle
- version active
- horizon
- schéma
- dataset size
- métriques
- date d’activation

Vue utile pour:
- audit rapide
- rollback éclairé
- compréhension du runtime

## 13. Ce qu’il faut impérativement afficher

Le minimum utile, sans quoi l’écran restera partiel:

- version modèle utilisée
- horizon utilisé
- scope (`global`, `league_specific`, `league_adjusted_shadow`)
- brut vs ajusté
- shadow candidate si présent
- delta explicite
- facteurs clés du match

## 14. Ce qu’il ne faut pas faire

- ne pas afficher uniquement une proba finale sans contexte
- ne pas masquer la différence entre brut et ajusté
- ne pas mélanger `shadow model` et `league adjustment`
- ne pas activer visuellement un modèle league-specific comme s’il était primaire alors qu’il est juste en shadow

## 15. Ordre recommandé de livraison

### Phase A
Simulation pilote
- Premier League `2024/2025`
- La Liga `2024/2025`

### Phase B
Exports de validation
- rapports consolidés par marché
- écarts brut / ajusté / shadow

### Phase C
Implémentation `ML-Hub`
- Command Center
- Match Prediction Console
- Policy Explorer
- Performance Lab
- Registry View

## 16. Décision produit recommandée

Oui:
- on part maintenant sur la simulation pilote
- et on prépare l’écran `ML-Hub` autour de cette logique

Non:
- on ne doit pas faire un écran purement décoratif
- il doit devenir un outil de lecture, d’explication et de validation

## 17. Résumé exécutable

Les deux prochains chantiers sont:

1. `Pilot Season Validation`
2. `ML-Hub Product UI`

La simulation sert à vérifier:
- ce que valent réellement:
  - le global brut
  - l’ajustement ligue
  - le league-specific shadow

Le `ML-Hub` doit ensuite exposer ces trois niveaux de lecture clairement.
