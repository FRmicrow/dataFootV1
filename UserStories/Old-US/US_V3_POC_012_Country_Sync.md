# User Story: V3 POC - Country Metadata Synchronization

**ID**: US-V3-POC-012  
**Title**: POC: Synchronize Country Metadata from V2 to V3 Schema  
**Role**: Database / Backend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Database Administrator,  
**I want** to sync and enrich the `V3_Countries` table using the data already present in `V2_countries`,  
**So that** the V3 system remains independent while preserving the importance rankings and geographical metadata already established.

---

## 🎨 Context & Problem
We are moving towards a pure V3 system, but we don't want to lose the metadata manually curated in V2 (like `importance_rank` and `continent`). The `V3_Countries` table currently lacks these columns and has incomplete information.

---

## ✅ Acceptance Criteria

### 1. Database Schema Upgrade (DB Agent)
- [ ] **Table**: `V3_Countries`
- [ ] **Action**: Add the following columns if they do not exist:
    - `importance_rank` (INTEGER, Default 5)
    - `continent` (TEXT)
    - `flag_small_url` (TEXT)

### 2. Data Migration & Sync Logic (DB/Backend Agent)
- [ ] **Identification**: Find all entries in `V2_countries`.
- [ ] **Upsert Operation**:
    - For each country in `V2_countries`:
        - **If it doesn't exist** in `V3_Countries` (match by name): Insert it with all fields (`name`, `code`, `importance_rank`, `flag_url`, `flag_small_url`, `continent`).
        - **If it already exists** in `V3_Countries` (match by name): Update the record with the `importance_rank`, `flag_url`, `flag_small_url`, and `continent` from V2.
- [ ] **Constraints**:
    - Match `V2_countries.country_name` with `V3_Countries.name` (Strictly).
    - Ensure that the `api_id` if present in V3 remains intact.

### 3. Verification
- [ ] **Validation**: Count the number of countries in `V3_Countries`. It should be >= the count in `V2_countries`.
- [ ] **Data Check**: Verify that "France" or "England" in V3 now has their correct `importance_rank` (e.g., 1) and continent.

---

## 🛠 Technical Notes
- **SQL Preview**:
    ```sql
    -- Add columns
    ALTER TABLE V3_Countries ADD COLUMN importance_rank INTEGER DEFAULT 5;
    ALTER TABLE V3_Countries ADD COLUMN continent TEXT;
    ALTER TABLE V3_Countries ADD COLUMN flag_small_url TEXT;

    -- Sync (Example logic for the agent to implement in a script or SQL)
    INSERT INTO V3_Countries (name, code, importance_rank, flag_url, flag_small_url, continent)
    SELECT country_name, country_code, importance_rank, flag_url, flag_small_url, continent 
    FROM V2_countries
    WHERE country_name NOT IN (SELECT name FROM V3_Countries);

    UPDATE V3_Countries 
    SET importance_rank = (SELECT importance_rank FROM V2_countries WHERE V2_countries.country_name = V3_Countries.name),
        continent = (SELECT continent FROM V2_countries WHERE V2_countries.country_name = V3_Countries.name),
        flag_url = (SELECT flag_url FROM V2_countries WHERE V2_countries.country_name = V3_Countries.name);
    ```

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_012_Country_Sync.md`
