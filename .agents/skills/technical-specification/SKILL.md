# Skill : Technical Specification Drafting (TSD)

## Description
Ce skill permet de générer des Documents de Spécification Technique (TSD) structurés et exhaustifs pour garantir une implémentation sans bug et esthétiquement fidèle aux standards V3.

## Instructions pour l'Agent

Lors de la rédaction d'un TSD, suivez impérativement cette structure :

### 1. Vision Technique & Architecture
- **Objectif** : Résumé technique de la feature.
- **Service Layer** : Nouveaux services backend ou modifications de services existants.
- **Infrastructure** : Impacts Docker, variables d'environnement, dépendances API.

### 2. Data Contract (Le Cœur du Système)
- **SQL DDL** : Script SQL complet pour les nouvelles tables ou colonnes.
- **Zod Schemas** : Définition des schémas de validation pour les entrées/sorties API.
- **Seed Data** : Exemples de données pour les tests.

### 3. API Contract (Swagger Draft)
- **Endpoints** : Liste des URL, méthodes HTTP et codes d'erreur (400, 404, 500).
- **Structure JSON** : Exemple de réponse JSON détaillée.

### 4. UI/UX Blueprint (Design System V3)
- **Composants** : Liste exhaustive des composants `src/design-system/` à utiliser.
- **Layout** : Description précise du placement (Grid, Stack, Flex).
- **Interactions** : États de chargement, transitions et micro-animations.

### 5. Stratégie de QA (Critères d'Acceptation Techniques)
- **Unit Tests** : Logique métier critique à tester.
- **Integration Tests** : Flux API complet.
- **Visual Regression** : Vérification de la fidélité au Design System.

## Exemples

### Exemple de Section Data Contract
```sql
CREATE TABLE IF NOT EXISTS V3_Live_Scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL UNIQUE,
    current_minutes INTEGER,
    score_home INTEGER,
    score_away INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id)
);
```
