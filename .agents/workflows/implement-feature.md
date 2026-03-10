---
description: Implement a new feature from design to QA.
---

# Feature Implementation Workflow

This workflow ensures that every new feature is implemented, tested, and documented correctly.

1. **Research & Requirements**
   - Review existing documentation in `docs/` and `CLAUDE.md`.
   - Use `project-context` skill to confirm code standards and available components.

2. **Backend Development**
   - Create/Update models in `backend/src/models/` (Prisma).
   - Create services in `backend/src/services/`.
   - Create controllers in `backend/src/controllers/` using Zod for validation.
   - Register routes in `backend/src/routes/v3_routes.js`.

3. **Frontend Development**
   - Identify or create components in `frontend/src/design-system/components/`.
   - Update `frontend/src/services/api.js` for new endpoints.
   - Implement pages/features using CSS modules/tokens.

4. **Testing & QA**
   - Run `cd backend && npm test`.
   - Run `cd frontend && npm test`.
   - Create a `QA-REPORT.md` at `docs/features/Vxx-Name/`.

5. **Final Review**
   - Run a full build using `docker-compose up` to verify integration.
   - Perform a final visual audit for premium UI standards.
