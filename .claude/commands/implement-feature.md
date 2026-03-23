---
description: Implémenter une feature de bout en bout — de l'US au QA Report
argument-hint: [US-number ou nom de feature]
---

## Contexte

Branche courante : `!git branch --show-current`

Feature / US cible : $ARGUMENTS

---

Suit le workflow `implement-feature` en intégralité :

**Phase 0 — Contexte & Planning**

**Étape 0.1 — Chargement des skills (OBLIGATOIRE)**
Lis le fichier US cible et identifie la section `## Skills requis`. Pour chaque tag présent, lis le SKILL.md correspondant **avant toute implémentation** :

| Tag détecté | Action |
|---|---|
| `[FRONTEND]` | Lis `.claude/skills/frontend-design/SKILL.md` |
| `[BACKEND]` | Lis `.claude/skills/backend/rest-endpoint-design/SKILL.md` + `input-validation/SKILL.md` |
| `[DATABASE]` | Lis `.claude/skills/database/migration-script/SKILL.md` + `normalization/SKILL.md` |
| `[SQL]` | Lis `.claude/skills/database/indexing-strategy/SKILL.md` + `security/sql-injection-mitigation/SKILL.md` |
| `[ML]` | Lis `.claude/skills/machine-learning/SKILL.md` |
| `[SECURITY]` | Lis `.claude/skills/security/sql-injection-mitigation/SKILL.md` + `xss-prevention/SKILL.md` |
| `[QA]` | Lis `.claude/skills/qa-automation/SKILL.md` — **toujours, sans exception** |

Si aucune section `## Skills requis` n'existe dans l'US → **STOP** : demande à l'utilisateur d'ajouter les tags avant de continuer.

**Étape 0.2 — Règles de base**
- Lis `.claude/rules/ai-cognition.md`, `development-best-practices.md`, `visual-manifesto.md`
- Analyse `.claude/project-architecture/` : fichiers à créer, modifier, dépendants à vérifier
- Génère `docs/features/Vxx-[Nom]/implementation_plan.md` → soumets à l'utilisateur avant de coder

**Phase 1 — Design & Contrat**
- API First : schémas Zod + mise à jour `backend-swagger.yaml` → validation utilisateur
- Si UI : design philosophy + composants DS → validation utilisateur
- Si DB : script de migration dans `backend/src/migrations/`

**Phase 2 — Implémentation**
- Backend : services dans `backend/src/services/v3/`, Zod controllers, réponses standard
- Frontend : design system exclusivement, tokens CSS, 3 états (Skeleton/error/data), useMemo/useCallback
- Clean pass : no unused imports, no hardcoded values, no style{{}} >2 props

**Phase 3 — Validation par US**
- `docker compose build` → lis les logs en entier
- `cd backend && npm test` + `cd frontend && npm test` → zéro échec
- Présente le bilan à l'utilisateur → attends validation avant l'US suivante

**Phase 4 — Livraison**
- Génère `docs/features/Vxx-[Nom]/QA-REPORT.md` (obligatoire pour le merge)
- Déclenche `/project:gitflow` une fois le QA Report approuvé
