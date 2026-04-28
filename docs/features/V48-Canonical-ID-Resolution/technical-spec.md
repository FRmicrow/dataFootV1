# Technical Specification — V48: Canonical ID Resolution

## 1. Contexte & Objectif
Le projet accumule des données provenant de sources disparates (Transfermarkt, Flashscore, scrapers variés). Actuellement, la résolution des identifiants est gérée de manière ad-hoc, ce qui pose un risque de doublons et de désalignement des données.

L'objectif est de mettre en place un **Service de Résolution Canonique** et des **Tables de Mapping** pour assurer l'authenticité et la cohérence des données avant toute insertion métier.

## 2. Data Contract

### 2.1 Schéma SQL (PostgreSQL)

Quatre nouvelles tables de mapping seront créées dans le schéma `v4`.

```sql
-- Mapping des Clubs/Teams
CREATE TABLE v4.mapping_teams (
    id            BIGSERIAL PRIMARY KEY,
    source        TEXT NOT NULL,
    source_id     TEXT NOT NULL,
    team_id       BIGINT NOT NULL REFERENCES v4.teams(team_id) ON DELETE CASCADE,
    source_name   TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);

-- Mapping des Personnes (Joueurs/Coachs)
CREATE TABLE v4.mapping_people (
    id            BIGSERIAL PRIMARY KEY,
    source        TEXT NOT NULL,
    source_id     TEXT NOT NULL,
    person_id     BIGINT NOT NULL REFERENCES v4.people(person_id) ON DELETE CASCADE,
    source_name   TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);

-- Mapping des Compétitions
CREATE TABLE v4.mapping_competitions (
    id            BIGSERIAL PRIMARY KEY,
    source        TEXT NOT NULL,
    source_id     TEXT NOT NULL,
    competition_id BIGINT NOT NULL REFERENCES v4.competitions(competition_id) ON DELETE CASCADE,
    source_name   TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);

-- Mapping des Stades (Venues)
CREATE TABLE v4.mapping_venues (
    id            BIGSERIAL PRIMARY KEY,
    source        TEXT NOT NULL,
    source_id     TEXT NOT NULL,
    venue_id      BIGINT NOT NULL REFERENCES v4.venues(venue_id) ON DELETE CASCADE,
    source_name   TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);
```

### 2.2 Zod Schemas (Backend Validation)

```javascript
const ResolutionContextSchema = z.object({
  source: z.string(),
  sourceId: z.string(),
  name: z.string().optional(),
  // Spécifique People
  nationality: z.string().optional(),
  birthDate: z.string().optional(), // ISO or YYYY-MM-DD
  lastClubId: z.number().optional(),
});
```

## 3. Logic & Service Architecture

### 3.1 ResolutionServiceV4
Situé dans `backend/src/services/v4/ResolutionServiceV4.js`.

**Méthodes principales :**
- `resolveTeam(source, sourceId, context)`
- `resolvePerson(source, sourceId, context)`
- `resolveCompetition(source, sourceId, context)`
- `resolveVenue(source, sourceId, context)`

**Algorithme de résolution (Exemple pour People) :**
1. **Lookup Mapping** : Recherche dans `v4.mapping_people` par `(source, sourceId)`.
2. **Si trouvé** : Retourne `person_id`.
3. **Si non trouvé** :
   - Recherche par **Heuristique** :
     - Match exact sur `full_name` AND `birth_date` AND `nationality`.
     - Si match unique -> Créer entrée dans `v4.mapping_people` -> Retourne `person_id`.
   - **Si aucune correspondance** :
     - Créer une nouvelle entrée dans `v4.people` (Nouvelle entité canonique).
     - Créer l'entrée correspondante dans `v4.mapping_people`.
     - Retourner le nouveau `person_id`.

### 3.2 Ingestion Pipeline Middleware
Tous les scrapers et scripts d'importation devront utiliser ce service.
- **Interdiction** d'utiliser les IDs sources dans les tables `v4.matches`, `v4.match_lineups`, etc.
- **Obligation** d'utiliser l'ID canonique résolu.

## 4. Stratégie de Migration (Backfill)
Comme Transfermarkt est la source maître actuelle :
1. Migrer tous les `source_tm_id` existants des tables `v4.teams`, `v4.people`, etc. vers les nouvelles tables de mapping avec `source = 'transfermarkt'`.
2. (Optionnel) Supprimer à terme les colonnes `source_tm_id` des tables métier pour ne garder que la résolution via mapping.

## 5. Edge Cases
- **Homonymes** : Gestion via `birth_date` et `nationality`.
- **Changement de nom de club** : Le mapping doit pointer vers le même `team_id` même si le `source_name` change.
- **IDs sources multiples** : Un `team_id` canonique peut avoir plusieurs entrées dans `v4.mapping_teams` (une pour TM, une pour Flashscore).

## 6. UI Blueprint (Admin)
Pas d'UI prévue dans cette phase, mais le service doit logger les "Auto-resolutions" de faible confiance pour revue manuelle.
