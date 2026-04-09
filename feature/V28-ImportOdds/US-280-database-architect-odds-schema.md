# US-280: Création du schéma de base de données pour les Cotes (Odds)

## 1. Rôle ciblé
@[.agents/rules/database-architect.md]

## 2. Objectif
Créer la structure de base de données nécessaire pour stocker les cotes (Odds Pre-Match) provenant de l'API-Football, tout en respectant le standard de données unifié (`V3_Baseline.sql`).

## 3. Contexte (Pourquoi)
Pour pouvoir alimenter notre ML Hub avec l'historique des cotes et les prédictions futures, nous avons besoin d'une table dédiée (ex: `V3_Odds`) liée aux matchs (`V3_Fixtures`), capable de stocker différentes valeurs selon les bookmakers (ex: Bet365, Bwin) et les types de paris (ex: Match Winner, Over/Under).

## 4. Tâches attendues
- Examiner `backend/sql/schema/V3_Baseline.sql` pour comprendre les conventions de nommage et les types de données actuels.
- Concevoir la table `V3_Odds` (nom à confirmer) incluant:
  - Clé primaire.
  - Clés étrangères vers `V3_Fixtures` (match).
  - Identifiant/Nom du bookmaker.
  - Type de pari (ex: "Match Winner").
  - Valeurs spécifiques (ex: Label Home/Draw/Away et la cote associée).
  - Horodatage de mise à jour.
- Ajouter un index sur `fixture_id` pour optimiser les performances des requêtes.
- Rédiger le script SQL de mise à jour et proposer une procédure d'application en base locale.

## 5. Exigences spécifiques & Contraintes
- **Cohérence V3** : La table doit suivre le préfixe `V3_` et définir `created_at` / `updated_at`.
- **Flexibilité** : Le schéma doit pouvoir ingérer le format spécifique de l'API-Football (id bookmaker, id bet, values). Voir la documentation de l'API-Football concernant le point d'entrée `/odds`.
- Attention à gérer les conflits (ex: mise à jour des cotes d'un match si elles changent avant le coup d'envoi).

## 6. Critères d'acceptation (Definition of Done)
- [ ] Le script SQL de création de la table est fourni et s'exécute sans erreur sur PostgreSQL.
- [ ] La table est correctement liée via clé étrangère à `V3_Fixtures`.
- [ ] Les index sont mis en place pour accélérer les requêtes par `fixture_id`.
- [ ] `V3_Baseline.sql` est mis à jour pour refléter l'ajout de la table.
