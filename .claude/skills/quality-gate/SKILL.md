---
name: quality-gate
description: "Point d'entrée qualité de statFootV3. Orchestre les vérifications avant, pendant et après chaque modification de code, et formalise les boucles de feedback. À utiliser SYSTÉMATIQUEMENT au démarrage d'une tâche de développement, avant chaque commit, et après chaque correction utilisateur — même pour un changement qui paraît trivial. Déclencheurs : début de tâche, avant commit/merge, après bug, après correction utilisateur, audit qualité, dérive du code, dette technique."
risk: safe
---

# Quality Gate — Le point d'entrée qualité de statFootV3

Ce skill est **le chef d'orchestre qualité** du projet. Il ne remplace pas les autres skills — il les **séquence** au bon moment et **vérifie** que rien n'est oublié.

> **Posture par défaut** : si tu n'as pas consulté `quality-gate` au démarrage de la tâche, tu es probablement en train de zapper une étape critique. Reviens-y.

## Principe directeur — "Clean as You Code"

Inspiré de la méthodologie SonarQube documentée dans `.claude/project-architecture/sonarGoodPractice.md` :

- **Zéro nouvelle dette** : chaque modification doit améliorer ou maintenir la santé du code, jamais la dégrader.
- **Boucle courte** : pre-flight → in-flight → pre-merge → post-correction. Aucune phase n'est sautable.
- **Preuve par l'exécution** : un test qui passe, un log lisible, un diff propre. Les affirmations sans preuve sont refusées.

---

## Quand consulter ce skill

| Phase | Trigger | Référence à ouvrir |
|---|---|---|
| **Pre-flight** | Démarrage d'une tâche, US assignée, bug à corriger, refacto demandé | `references/pre-flight-checklist.md` |
| **In-flight** | Pendant l'écriture du code (toutes les ~10 modifs ou avant chaque pause) | `references/in-flight-checklist.md` |
| **Pre-merge** | Avant un commit, avant un push, avant une PR | `references/pre-merge-checklist.md` |
| **Post-correction** | L'utilisateur a corrigé un de tes choix → MISE À JOUR OBLIGATOIRE de `tasks/lessons.md` | `references/feedback-loop.md` |

**Si tu ne sais pas dans quelle phase tu te trouves, tu es en pre-flight. Recommence par là.**

---

## Workflow maître (vue d'ensemble)

```
┌─────────────────────────────────────────────────────────────────────┐
│  DÉBUT DE TÂCHE                                                     │
│  ↓                                                                  │
│  PRE-FLIGHT  → Lire l'US, les rules pertinentes, charger les skills │
│              → Plan dans tasks/todo.md, validation utilisateur      │
│  ↓                                                                  │
│  IN-FLIGHT   → Code + markers @STUB/@AUDIT/@CRITICAL                │
│              → Anti-hallucination (grep avant d'utiliser)            │
│              → Scope discipline                                     │
│  ↓                                                                  │
│  PRE-MERGE   → Tests verts (run-tests), zéro régression             │
│              → QA-REPORT.md, Swagger à jour                         │
│              → Format de commit conforme                            │
│  ↓                                                                  │
│  GITFLOW     → /project:gitflow (commit + push + merge vers dev)    │
│  ↓                                                                  │
│  Si l'utilisateur corrige une décision pendant le cycle :           │
│  POST-CORRECTION → Mise à jour de tasks/lessons.md OBLIGATOIRE      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Articulation avec le reste du système `.claude/`

Ce skill s'appuie sur des fichiers existants — il ne les duplique pas, il y **renvoie** au bon moment.

### Sources de vérité (rules — conventions du projet)

- `.claude/CLAUDE.md` — Hard Rules, V4 pattern, markers inline
- `.claude/rules/ai-cognition.md` — comment raisonner et chercher dans le codebase
- `.claude/rules/engineering-standards.md` — naming, commits, protection BDD
- `.claude/rules/development-best-practices.md` — Design System, atomic functions, error states
- `.claude/rules/data-ingestion-standards.md` — règles critiques pour les inserts/imports
- `.claude/rules/visual-manifesto.md` — direction UI
- `.claude/project-architecture/sonarGoodPractice.md` — Quality Gate SonarQube

### Workflows (commands — orchestrent un parcours complet)

- `/project:create-new-feature` — feature de A à Z (TSD → US → impl → QA → merge)
- `/project:implement-feature [US]` — implémenter une US déjà cadrée
- `/project:run-tests` — batterie complète (Docker + backend + frontend)
- `/project:gitflow` — commit + push + merge
- `/project:deploy` — déploiement Docker Compose

### Skills métier (savoir-faire ciblés)

- `qa-automation` — triple-check (Unit / API Contract / Non-Regression) + QA-REPORT
- `code-audit` — audit technique global (architecture, qualité, sécurité, tests)
- `frontend-design` — composants Design System V3 + Visual Manifesto
- `technical-specification` — rédaction de TSD
- `machine-learning` — interaction avec le `ml-service`
- `flashscore-scraper` — scraper de résultats (skill projet-spécifique)
- Skills marqués **STUB** (à enrichir en Phase 2 Claude Code) : `backend/input-validation`, `backend/rest-endpoint-design`, `database/migration-script`, `database/indexing-strategy`, `database/normalization`, `security/sql-injection-mitigation`, `security/xss-prevention`, `testing/unit-testing-node`

### Subagents (délégation parallèle)

- `code-reviewer` — revue avant merge
- `security-auditor` — audit sécurité ciblé
- `qa-runner` — exécution tests
- `doc-writer` — QA-REPORT, Swagger, technical-spec

---

## Les 4 portes (gates) — résumé exécutif

### 🟢 Gate 1 — Pre-flight (avant de coder)

**Bloquant si non rempli.** Détails dans `references/pre-flight-checklist.md`.

1. L'US existe et porte des **tags `[FRONTEND]`/`[BACKEND]`/...** (sinon : créer/compléter avant tout code)
2. Les rules pertinentes ont été **lues dans cette session** (pas "déjà lues une fois")
3. Les skills tagués sont **chargés**
4. Le plan est dans `tasks/todo.md` et **validé par l'utilisateur**
5. L'analyse d'impact (fichiers touchés, dépendances) est **explicite**

### 🟡 Gate 2 — In-flight (pendant l'écriture)

**Auto-vérification continue.** Détails dans `references/in-flight-checklist.md`.

1. Anti-hallucination : `grep`/`ls` avant de référencer un fichier, une fonction, un composant
2. Scope discipline : si bug détecté hors scope → `// @AUDIT: ...` + ne pas corriger ici
3. Markers inline à jour (`@STUB`, `@AUDIT`, `@CRITICAL`, `@RACE-CONDITION`, `@NO-AUTH`, `@V3-COMPAT`)
4. Hard Rules respectées en temps réel (parameterized queries, response wrapper, design tokens, no console.*)
5. Atomicité : 1 commit ≈ 1 changement logique — si tu mélanges refacto + feature, tu re-découpes

### 🔴 Gate 3 — Pre-merge (avant commit/merge)

**Bloquant. Aucune exception.** Détails dans `references/pre-merge-checklist.md`.

1. `cd backend && npm test` → ✅ zéro échec
2. `cd frontend && npm test` → ✅ zéro échec
3. `docker compose build` (si changements backend/ML) → logs lus en entier
4. `QA-REPORT.md` généré dans `docs/features/Vxx-[Nom]/` (format imposé)
5. `backend-swagger.yaml` à jour si endpoints modifiés
6. Format de commit conforme : `type: description` à l'infinitif
7. Aucun secret, aucun fichier non suivi indésirable, aucun `console.*` dans nouveau code backend

### 🔁 Gate 4 — Post-correction (après une correction utilisateur)

**Déclenché automatiquement.** Détails dans `references/feedback-loop.md`.

Si l'utilisateur :
- a corrigé une de tes décisions techniques
- t'a dit "non, pas comme ça"
- t'a montré qu'une approche était mauvaise

→ **Avant de proposer la nouvelle approche**, mets à jour `tasks/lessons.md` avec :
- ❌ Ce que tu as fait de mal
- ✅ La règle pour ne pas le refaire
- 🔍 Le signal qui aurait dû te mettre en garde

---

## Format unique des artefacts

Pour rendre les sorties **comparables dans le temps** (et permettre les audits longitudinaux), tous les artefacts qualité suivent un format imposé.

### `tasks/todo.md` (plan de tâche)

```markdown
# [Titre tâche/US] — [Date YYYY-MM-DD]

## Goal
Une phrase. Le "pourquoi".

## Skills chargés
- [ ] .claude/rules/ai-cognition.md
- [ ] .claude/rules/development-best-practices.md
- [ ] .claude/skills/quality-gate/SKILL.md (toujours)
- [ ] [skills selon tags US]

## Files to touch
- `path/to/file1.js` — création/modif
- `path/to/file2.jsx` — modif

## Plan
- [ ] Étape 1
- [ ] Étape 2
- [ ] Tests : xxx
- [ ] QA-REPORT : oui/non

## Risks
- Régression sur X
- Performance sur Y

## Validation utilisateur
- [ ] Plan validé le YYYY-MM-DD
```

### `tasks/lessons.md` (mémoire des corrections)

```markdown
# Lessons — statFootV3

## YYYY-MM-DD — [Titre court de la leçon]

**Contexte** : tâche/US où l'erreur s'est produite.

**❌ Ce que j'ai fait** : description factuelle.

**✅ Ce que j'aurais dû faire** : la règle correcte.

**🔍 Signal d'alerte** : ce que j'aurais dû remarquer pour ne pas tomber dedans.

**Référence** : lien vers `rules/`/`skills/` pertinent.
```

### `docs/features/Vxx-[Nom]/QA-REPORT.md`

Voir `qa-automation/SKILL.md` pour le format complet (déjà standardisé).

---

## Hard rules de ce skill

1. **Si tu hésites, tu remontes en pre-flight.** Une heure de cadrage économise dix heures de refacto.
2. **Tu ne sautes jamais une gate.** Même si "c'est juste un petit changement". Surtout si.
3. **Les preuves remplacent les affirmations.** "Les tests passent" sans le log → refusé.
4. **`tasks/lessons.md` est tenu à jour.** C'est la mémoire institutionnelle. Pas d'oubli.
5. **Tu n'inventes jamais.** Si tu n'es pas sûr d'un endpoint, d'une colonne SQL, d'un composant DS → `grep` ou `ls` AVANT.
6. **Protection BDD** : `DROP`, `TRUNCATE`, `rollback` BDD = INTERDIT sans accord explicite utilisateur. Toujours.

---

## Roadmap d'amélioration (Phase 2 — Claude Code)

Quand tu seras dans Claude Code avec accès au repo, ce skill devra être étendu avec :

1. **Promotion des 8 skills marqués STUB** : ils doivent passer de génériques à projet-spécifiques :
   - `backend/rest-endpoint-design` → V4 pattern (controller V4 + service V4, response `{ success, data }`, Zod, logger)
   - `backend/input-validation` → schémas Zod réels du projet (`backend/src/schemas/`)
   - `database/migration-script` → format `backend/src/migrations/registry/YYYYMMDD_NN_V4_Description.js`
   - `database/normalization` → conventions schéma V4 (namespace `v4.*`, business keys)
   - `database/indexing-strategy` → patterns d'index PostgreSQL utilisés sur les tables V4
   - `security/sql-injection-mitigation` → utilisation de `db.all(sql, [params])` avec exemples du repo
   - `security/xss-prevention` → règles côté React + sanitisation backend
   - `testing/unit-testing-node` → patterns Vitest + Supertest réels (`backend/test/`)

2. **Ajout de scripts d'audit automatisés** dans `quality-gate/scripts/` :
   - `pre-flight-check.sh` — vérifie que les rules sont chargées
   - `console-usage-check.sh` — détecte les `console.*` dans `backend/src/`
   - `hardcoded-colors-check.sh` — détecte les hex/rgb dans `frontend/src/**/*.jsx`
   - `swagger-coverage-check.sh` — vérifie que chaque route V4 est dans Swagger

3. **Intégration CI** : faire passer ces vérifications dans GitHub Actions au lieu de les laisser manuelles.

4. **Métriques** : exposer un score de qualité dans le QA-REPORT (cognitive complexity moyenne, % couverture tests, nombre de markers `@AUDIT` ouverts).

---

## NEVER LIST

- Sauter une gate "parce que c'est urgent"
- Affirmer "les tests passent" sans coller le log
- Modifier `tasks/lessons.md` à la légère (c'est de la mémoire long-terme, pas du brouillon)
- Créer un nouveau skill avant d'avoir vérifié qu'aucun existant ne couvre déjà le besoin
- Faire un commit sans QA-REPORT pour une feature
- Toucher la BDD sans accord utilisateur explicite
