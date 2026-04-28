# Canonical Identity Resolution Standards

## Rule: Single Source of Truth for Identities

Il est **STRICTEMENT INTERDIT** d'insérer des données provenant de sources externes (Transfermarkt, Flashscore, scrapers) directement dans les tables métier (`v4.matches`, `v4.people`, `v4.teams`, `v4.venues`, `v4.competitions`) en utilisant leurs IDs sources.

Toute ingestion de données doit suivre le processus de résolution canonique pour éviter les doublons et garantir l'intégrité référentielle.

---

## 1. Tables de Mapping
Toute source externe doit être mappée vers un identifiant V4 interne unique via les tables dédiées :
- `v4.mapping_teams` (Clubs/Équipes)
- `v4.mapping_people` (Joueurs, Coachs, Arbitres)
- `v4.mapping_competitions` (Ligues, Coupes)
- `v4.mapping_venues` (Stades)

Chaque table de mapping contient au minimum :
- `source`: Le nom du fournisseur (ex: 'transfermarkt', 'flashscore')
- `source_id`: L'identifiant chez ce fournisseur
- `canonical_id`: La clé étrangère vers la table métier V4 correspondante (ex: `team_id`, `person_id`)

---

## 2. Procédure d'Ingestion (Algorithm)

Pour chaque entité reçue d'une source externe :

1. **Vérification du Mapping** :
   - Chercher dans la table de mapping correspondante par `(source, source_id)`.
   - Si trouvé -> Utiliser le `canonical_id`.

2. **Heuristique de Résolution (si non mappé)** :
   - Effectuer une recherche dans la table métier sur des critères discriminants (Business Keys) :
     - **Teams** : `name` + `country`
     - **People** : `full_name` + `birth_date` + `nationality`
     - **Competitions** : `name` + `country`
     - **Venues** : `name` + `city`
   - Si un match UNIQUE est trouvé :
     - Créer une nouvelle entrée dans la table de mapping pour lier cet ID source à l'entité existante.
     - Retourner l'ID trouvé.

3. **Création Canonique (si aucune correspondance)** :
   - Créer une nouvelle ligne dans la table métier V4 avec les informations disponibles (nouvelle identité canonique).
   - Créer l'entrée associée dans la table de mapping.
   - Retourner le nouvel ID généré.

---

## 3. Utilisation du Service
Toute cette logique est centralisée dans `backend/src/services/v4/ResolutionServiceV4.js`.

```javascript
import ResolutionServiceV4 from './ResolutionServiceV4.js';

// Exemple d'ingestion
const teamId = await ResolutionServiceV4.resolveTeam('flashscore', '12345', { name: 'Bayern Munich' });
```

---

## 4. Enforcement
- **Code Audit** : Tout PR ajoutant un service d'ingestion ou un scraper sans passer par `ResolutionServiceV4` sera rejeté.
- **TSD (Technical Spec)** : La section "Data Contract" d'une nouvelle feature doit explicitement mentionner la stratégie de mapping et de résolution d'ID.
