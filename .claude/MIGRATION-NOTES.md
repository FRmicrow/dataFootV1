# Migration Notes — Refonte qualité du dossier `.claude/`

> Date : 2026-04-26
> Objectif : repartir d'une base propre, instaurer un **point d'entrée qualité unique** (`quality-gate`), maintenir la cohérence avec `CLAUDE.md` et les `rules/` existantes.

## Ce qui a changé

### 🆕 Skill créé : `skills/quality-gate/`

C'est le **point d'entrée qualité** demandé. Il orchestre 4 gates :
- **Gate 1 — Pre-flight** : avant de coder (lecture des rules, chargement des skills, plan validé)
- **Gate 2 — In-flight** : pendant l'écriture (anti-hallucination, scope, markers, hard rules)
- **Gate 3 — Pre-merge** : avant commit/merge (tests verts, QA-REPORT, format commit)
- **Gate 4 — Post-correction** : après correction utilisateur (mise à jour `tasks/lessons.md`)

Structure :
```
skills/quality-gate/
├── SKILL.md                              # router + checklist maître
└── references/
    ├── pre-flight-checklist.md           # Gate 1 détaillée
    ├── in-flight-checklist.md            # Gate 2 détaillée
    ├── pre-merge-checklist.md            # Gate 3 détaillée
    └── feedback-loop.md                  # Gate 4 détaillée
```

### 🗑️ Skills supprimés (27)

Étaient des stubs génériques de 20 lignes, parfois contradictoires avec les rules (ex: `state-management` mentionnait Redux/Zustand alors que `frontend-engineer.md` interdit Zustand). Ils polluaient la liste sans apporter de valeur projet-spécifique.

- `skills/docker/` (doublon avec `devops/containerization-docker/`, lui-même un stub)
- `skills/planning/` (2 stubs)
- `skills/documentation/` (2 stubs)
- `skills/design/` (3 stubs)
- `skills/fullstack/` (2 stubs)
- `skills/frontend/` (5 stubs — note : `skills/frontend-design/` reste, c'est le vrai)
- `skills/performance/` (2 stubs)
- `skills/devops/` (3 stubs — entièrement vidé)
- `skills/backend/caching-and-performance/`
- `skills/backend/error-handling/`
- `skills/backend/authentication-authorization/`
- `skills/security/authentication-best-practices/`
- `skills/testing/e2e-testing-playwright/`
- `skills/testing/frontend-testing-react/`
- `skills/testing/integration-testing/`

### ⚠️ Skills marqués STUB (8) — à enrichir en Phase 2 (Claude Code)

Ces skills sont **référencés par le système de tags** dans `commands/create-new-feature.md` et `commands/implement-feature.md`. Ils sont conservés mais marqués clairement comme stubs. Ils doivent être réécrits **avec accès au code source** pour devenir vraiment projet-spécifiques (V4 patterns, schémas Zod réels, db.all, Vitest+Supertest…).

- `skills/backend/rest-endpoint-design/` (tag `[BACKEND]`)
- `skills/backend/input-validation/` (tag `[BACKEND]`)
- `skills/database/migration-script/` (tag `[DATABASE]`)
- `skills/database/normalization/` (tag `[DATABASE]`)
- `skills/database/indexing-strategy/` (tag `[SQL]`)
- `skills/security/sql-injection-mitigation/` (tags `[SQL]`, `[SECURITY]`)
- `skills/security/xss-prevention/` (tag `[SECURITY]`)
- `skills/testing/unit-testing-node/` (à utiliser pour `[QA]` à terme)

Roadmap détaillée dans `skills/quality-gate/SKILL.md` section "Roadmap d'amélioration".

### ✅ Skills inchangés (skills riches déjà projet-spécifiques)

- `skills/quality-gate/` — 🆕 nouveau
- `skills/qa-automation/` — triple-check (TU/API/TNR) + QA-REPORT
- `skills/code-audit/` — audit technique global
- `skills/frontend-design/` — Design System V3 + Visual Manifesto
- `skills/technical-specification/` — rédaction de TSD
- `skills/machine-learning/` — interface avec ml-service
- `skills/flashscore-scraper/` — scraper de résultats (skill projet-spécifique)

### 🔧 Fichiers modifiés (intégration `quality-gate` + corrections)

- `CLAUDE.md` : `quality-gate` ajouté en tête de la section "Agent System" comme point d'entrée prioritaire
- `commands/create-new-feature.md` : étape `quality-gate` ajoutée avant la Phase 0
- `commands/implement-feature.md` : étape 0.0 (quality-gate) + références aux checklists in-flight et pre-merge ; correction `services/v3/` → `services/v4/` (cohérence avec V4 pattern de `CLAUDE.md`)
- `commands/gitflow.md` : étape 0 quality-gate pre-merge ajoutée comme bloquante
- `commands/run-tests.md` : pointer vers `pre-merge-checklist.md`
- `rules/development-best-practices.md` : 2 corrections de liens morts (`qa-automation-v2` → `qa-automation`, `frontend-design-v2` → `frontend-design`)
- `skills/frontend-design/SKILL.md` : 1 correction de lien mort (`qa-automation-v2` → `qa-automation`)

## Bilan chiffré

|  | Avant | Après |
|---|---|---|
| Skills SKILL.md | 41 (dont ~30 stubs vides) | 15 (7 riches + 1 nouveau + 7 stubs marqués pour Phase 2 — note: 8 fichiers nouveaux dans quality-gate/ comptés à part) |
| Liens morts | 3 | 0 |
| Doublons | 2 (docker, security/auth) | 0 |
| Entrée qualité unique | ❌ aucune | ✅ `quality-gate` |
| Boucle de feedback formalisée | ❌ mention dans CLAUDE.md non actionnable | ✅ `feedback-loop.md` |

## Ce qu'il reste à faire (Phase 2 — Claude Code)

Quand tu seras dans Claude Code avec accès au repo :

1. **Promouvoir les 8 skills STUB** en les ancrant sur le code réel (V4 pattern, schémas Zod, db.all, etc.)
2. **Ajouter des scripts d'audit** dans `skills/quality-gate/scripts/` (console-usage check, hardcoded-colors check, swagger-coverage check…)
3. **Intégrer en CI** ces vérifications via GitHub Actions
4. **Initialiser** `tasks/lessons.md` (vide ou avec quelques leçons existantes)
5. **Auditer** s'il y a contradiction entre `rules/*-engineer.md` (rôles génériques) et les skills riches existants — éventuellement consolider.

## Points de vigilance

- Le système de **tags `[FRONTEND]/[BACKEND]/...` dans les US** est conservé tel quel — c'était la bonne approche.
- `tasks/todo.md` et `tasks/lessons.md` sont des fichiers que **toi** (ou Claude) créez à la racine du repo, pas dans `.claude/`. Ils sont attendus par `quality-gate` et par `CLAUDE.md`.
- Les **subagents** (`agents/`) sont conservés tels quels. Ils sont complémentaires aux skills (les skills = savoir-faire, les agents = délégation parallèle).
