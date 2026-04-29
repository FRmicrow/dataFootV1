# TSD — V50-Canonical-Mapping-Ingestion

## 1. Contexte & Objectifs
L'objectif est de consolider la base de données `v4` en injectant des milliers de mappings entre les identifiants **Transfermarkt (TM)** et **Flashscore (FS)**. Cela permettra aux scrapers Flashscore de reconnaître immédiatement les entités déjà présentes en base (souvent créées via TM) et d'éviter les doublons.

Dossier source : `Final-TM-FS-IDs/`
Fichiers : `equipes.csv`, `joueurs.csv`, `competitions.csv`, `venues.csv`

## 2. Analyse d'Impact
- **Base de données** : Insertion massive dans `v4.mapping_teams`, `v4.mapping_people`, `v4.mapping_competitions`, `v4.mapping_venues`.
- **Services** : Utilisation de `ResolutionServiceV4` pour garantir que chaque mapping pointe vers une entité canonique valide.
- **Performance** : Ingestion par batch (CSV parsing + transactions SQL) pour gérer les ~100k joueurs.

## 3. Data Contract

### Mapping Logic
Pour chaque ligne du CSV :
1. Extraire `tm_id` et `flashscore_id`.
2. **Si `tm_id` présent** :
   - Chercher le `canonical_id` associé au `tm_id` dans la table de mapping correspondante.
   - Si trouvé : Associer le `flashscore_id` au même `canonical_id`.
   - Si non trouvé : Chercher l'entité par nom/pays (Heuristique). Si trouvée, mapper les deux IDs. Sinon, créer une nouvelle entité canonique et mapper les deux.
3. **Si seul `flashscore_id` présent** : Résoudre normalement via `ResolutionServiceV4`.

### Tables concernées
- `v4.mapping_teams` (`team_id`)
- `v4.mapping_people` (`person_id`)
- `v4.mapping_competitions` (`competition_id`)
- `v4.mapping_venues` (`venue_id`)

## 4. Logic & Edge Cases
- **Doublons** : Utiliser `ON CONFLICT DO NOTHING` pour les mappings.
- **Confiance (Confidence)** : Les fichiers CSV ont un score de confiance. Nous n'importerons que les mappings avec `confidence >= 0.8` (ou selon validation utilisateur).
- **Types de Personnes** : Pour `joueurs.csv`, distinguer les rôles (player, coach, referee) lors de l'insertion dans `v4.people` et `v4.mapping_people` (source prefixée ex: `transfermarkt_player`).

## 5. Plan d'exécution (US)
- **US-500** : Script d'ingestion pour les Compétitions.
- **US-501** : Script d'ingestion pour les Équipes (Clubs).
- **US-502** : Script d'ingestion pour les Stades (Venues).
- **US-503** : Script d'ingestion pour les Personnes (Joueurs/Coachs/Refs) - Optimisé pour le volume.
