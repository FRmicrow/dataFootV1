# US_061: Intelligent Entity Resoluion & Merging Engine

**Role: Backend / Data Engineer**

## User Story
**As a** Backend Engineer  
**I want** to implement a sophisticated deduplication engine  
**So that** fragmented data for the same player or club is consolidated into a single high-quality master record.

## Acceptance Criteria
- **Given** two entities of the same type (e.g., Players)  
- **When** the resolution engine compares them  
- **Then** it must calculate a "Confidence Score" using:
    - **API_ID** match (100% confidence).
    - **Full name similarity** (Levenshtein distance > 95%).
    - **Date of birth** exact match.
    - **Team history overlap** (Do both have stats for the same club in the same year?).
- **Given** a merge decision (Confidence > threshold)  
- **When** the process executes  
- **Then** it must perform a **Remap** of all related child records (stats, matches, trophies) to the "Master Profile" (user with the most data).
- **Given** records successfully remapped  
- **Then** the duplicate "Ghost" record must be deleted.
- **Given** a low-confidence match  
- **Then** the system must NOT merge automatically, but flag it for a "Health Prescription".

## Functional Notes
- The "Master Profile" is the one with the highest volume of verified statistics (`V3_Player_Stats`).
- Merging must be atomic to prevent orphaned child records if the process fails mid-way.

## Technical Notes
- Implement a `ResolutionService` in the backend.
- Use a fuzzy search library or raw SQL `SOUNDEX` (if available in SQLite) for initial candidate identification.
- Remapping must update FKs for `V3_Player_Stats` and `V3_Trophies`.
