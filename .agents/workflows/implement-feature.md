---
description: Implement a new feature from design to QA.
---

# Feature Implementation Workflow
## Notes
- Ce workflow est la responsabilité exclusive de l'agent assumant le rôle de **Product Owner**.
- La création de dossiers et de fichiers se fait uniquement après validation explicite de l’utilisateur à l'étape 6.
- L'analyse préliminaire du dossier `.agents/project-architecture/` est primordiale pour garantir la viabilité technique des User Stories.
- **IMPORTANT** : Une fois la feature terminée et validée, le dossier de documentation `feature/Vxx-[Nom]/` **doit** être déplacé vers `feature/Completed-Feature/` et **pushé** sur le dépôt.

This workflow ensures that every new feature is implemented, tested, and documented correctly.

1. **Research & Requirements**
   - Review existing documentation in `docs/` and `CLAUDE.md`.
   - Use `project-context` skill to confirm code standards and available components.

2. **Backend Development**
   - **Schema & Migrations**: Create/Update migrations in `backend/src/migrations/registry/`.
   - **IMPORTANT: ID Resolution**: For any new data ingestion, ensure usage of `ResolutionServiceV4` to map external IDs to canonical V4 IDs. No external IDs should be stored in business tables. Refer to **[.agents/rules/canonical-identity-resolution.md](file:///.agents/rules/canonical-identity-resolution.md)**.
   - **Services**: Create/Update services in `backend/src/services/v4/` (query DB directly via `db.all()`).
   - **Controllers**: Create/Update controllers in `backend/src/controllers/v4/` using Zod for validation.
   - **Routes**: Register routes in `backend/src/routes/v4/v4_routes.js`.

3. **Frontend Development**
   - Identify or create components in `frontend/src/design-system/components/`.
   - Update `frontend/src/services/api.js` for new endpoints.
   - Implement pages/features using CSS tokens and V4 components in `frontend/src/components/v4/`.

4. **Testing & QA**
   - Run `cd backend && npm test`.
   - Run `cd frontend && npm test`.
   - Create a `QA-REPORT.md` in the feature documentation folder.

5. **Final Review**
   - Run a full build using `docker-compose up` to verify integration.
   - Perform a final visual audit for premium UI standards.
   - **Move documentation folder** from `feature/Vxx-[Name]/` to `feature/Completed-Feature/`.
   - **Push** the documentation folder and its contents to the repository.
