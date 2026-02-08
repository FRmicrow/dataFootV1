# User Story: Database Competition Taxonomy Refinement

**ID**: US-DB-001  
**Title**: Standardize Competition Categorization via Trophy Types  
**Role**: Database Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Database Administrator,  
**I want** to ensure every competition in the `V2_competitions` table is mapped to a correct `trophy_type_id`,  
**So that** the application logic can accurately group statistics into Leagues, Cups, International, and National Team buckets.

---

## 🎨 Context & Problem
An audit of the `V2_player_statistics` for high-profile players (e.g., Messi, ID: 15095) reveals that many records are defaulting to the "Leagues" tab. This is caused by `NULL` values in `V2_competitions.trophy_type_id`. 

For example: 
- "Copa America" and "World Cup Qualifiers" have no category.
- "Leagues Cup" and "CONCACAF Champions League" have no category.

Without this mapping, the Backend Agent cannot filter data correctly.

---

## ✅ Acceptance Criteria

### 1. Data Mapping & Cleanup
- [ ] **Identify Orphans**: Find all competitions in `V2_competitions` that have entries in `V2_player_statistics` but have a `NULL` `trophy_type_id`.
- [ ] **Apply Hierarchy Logic**: Use SQL updates to map competitions based on the following taxonomy:

| Category | Target `trophy_type_id` | Logic / Keyword |
| :--- | :--- | :--- |
| **Continental National Team** | **6** | `LIKE '%Copa America%'`, `LIKE '%Qualification%'`, `LIKE '%Euro%'`, `LIKE '%Gold Cup%'` |
| **FIFA National Team** | **4** | `LIKE '%World Cup%'`, `LIKE '%Friendlies%'` (where team is national), `LIKE '%Olympics%'` |
| **Continental Club** | **5** | `LIKE '%Champions League%'` (non-UEFA), `LIKE '%Leagues Cup%'`, `LIKE '%Copa Libertadores%'`, `LIKE '%Copa Sudamericana%'` |
| **Domestic League** | **7** | Standard domestic championships (e.g., MLS, Brazil's regional leagues like 'Carioca', 'Paulista'). |
| **Domestic Cup** | **8** | `LIKE '%Cup%'`, `LIKE '%Beker%'`, `LIKE '%Taça%'`, `LIKE '%Pokal%'` (where country_id is not NULL). |

### 2. Constraints & Integrity
- [ ] **Verify Reference Integrity**: Ensure all `trophy_type_id` values exist in the `V2_trophy_type` table.
- [ ] **Avoid Duplicates**: Ensure that your updates do not overwrite existing correct mappings (only target `NULL` or clearly wrong mappings).

### 3. Verification
- [ ] Provide a summary report of how many competitions were fixed.
- [ ] Confirm specifically that **Competition IDs 9, 10, 11, 23, 24, and 72** (referenced in the Messi audit) are correctly mapped.

---

## 🛠 Technical Notes
- **Working Table**: `V2_competitions`
- **Reference Table**: `V2_trophy_type`
- **Audit Tool**: You can JOIN with `V2_player_statistics` to prioritize fixing competitions that actually have data.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Database_Taxonomy_Refinement.md`
