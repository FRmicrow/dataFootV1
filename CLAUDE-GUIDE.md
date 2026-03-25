# Guide Claude Code — statFootV3

Comment utiliser Claude à son plein potentiel sur ce projet.

---

## Stratégie de branches

```
main      ← production stable        (manuel uniquement)
preprod   ← validation pré-prod      (manuel uniquement)
dev       ← intégration features     ← Claude merge ici
  └── feature/Vxx-[Nom]              ← Claude travaille ici
```

**Claude gère uniquement** : `feature/*` → `dev`
**Manuel uniquement** : `dev` → `preprod` → `main`

---

## Architecture de la config

```
.claude/
├── CLAUDE.md              # Instructions projet (chargées à chaque session)
├── settings.json          # Permissions équipe (commité)
├── settings.local.json    # Permissions machine-spécifiques (gitignored)
│
├── commands/              # Slash commands /project:*
│   ├── create-new-feature.md
│   ├── implement-feature.md
│   ├── gitflow.md
│   ├── run-tests.md
│   └── deploy.md
│
├── agents/                # Subagents spécialisés (auto ou explicite)
│   ├── code-reviewer.md
│   ├── security-auditor.md
│   ├── qa-runner.md
│   └── doc-writer.md
│
├── rules/                 # Rôles et standards (chargés en système prompt)
│   ├── ai-cognition.md
│   ├── development-best-practices.md
│   ├── visual-manifesto.md
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── machine-learning-engineer.md
│   ├── product-architect.md
│   ├── product-owner.md
│   ├── qa-engineer.md
│   ├── security-expert.md
│   ├── git-engineer.md
│   ├── devops-engineer.md
│   └── docker-engineer.md
│
├── skills/                # Skills auto-invoqués par contexte
│   ├── frontend-design/
│   ├── qa-automation/
│   ├── machine-learning/
│   ├── technical-specification/
│   └── ...
│
└── project-architecture/  # Référence architecture (lue par Claude avant chaque feature)
    ├── architecture-globale.md
    ├── backend-apis.md
    ├── backend-swagger.yaml
    ├── frontend-pages.md
    ├── ml-services.md
    └── sonarGoodPractice.md
```

---

## Slash Commands

Tape `/project:` dans Claude Code pour voir la liste complète. Chaque commande injecte automatiquement du contexte shell (branche git, état Docker, etc.) avant que Claude reçoive le prompt.

### `/project:create-new-feature`

**Quand** : Tu veux démarrer une feature from scratch.

**Ce que ça fait (automatiquement, de A à Z) :**
1. Dialogue pour clarifier le besoin
2. Rédige le TSD (Technical Spec Document) → te demande validation
3. Crée la branche `feature/Vxx-[Nom]` et le dossier `docs/features/`
4. Découpe en User Stories numérotées → te demande validation du backlog
5. Implémente chaque US via `/project:implement-feature` (avec validation entre chaque)
6. Lance `/project:run-tests` — bloquant jusqu'à 100% vert
7. Génère toute la documentation (QA-REPORT, Swagger, technical-spec)
8. Te demande si tu veux merger → lance `/project:gitflow` si oui

**Usage :** tape la commande, réponds aux questions de raffinement, valide le TSD, valide le backlog — le reste est automatique.

---

### `/project:implement-feature [US-number]`

**Quand** : Tu veux implémenter une US spécifique (sans passer par le flow complet).

**Ce que ça fait :**
1. Analyse d'impact sur l'architecture existante
2. Plan d'implémentation → te demande validation
3. API contract (Zod + Swagger) → te demande validation si applicable
4. Design philosophy (UI) → te demande validation si applicable
5. Implémentation backend → frontend → ML si applicable
6. Clean pass (imports, tokens, complexité)
7. `docker compose build` + `npm test` des deux côtés
8. Bilan → te demande validation avant de clore l'US

**Usage :** `/project:implement-feature US-371` ou sans argument pour la feature en cours.

---

### `/project:run-tests`

**Quand** : Tu veux valider l'état du code à n'importe quel moment.

**Ce que ça fait :**
1. Vérifie l'état Docker (`docker compose ps`)
2. `docker compose build` si des changements backend/ML
3. `cd backend && npm test` (Vitest + Supertest)
4. `cd frontend && npm test` (Vitest + jsdom)
5. Rapport structuré avec résultats + bugs identifiés

**Règle absolue** : zéro échec toléré. Si un test échoue, Claude corrige la cause racine et relance — jamais de "ça devrait marcher".

---

### `/project:gitflow`

**Quand** : Tu veux commiter, pusher et merger une feature terminée vers `dev`.

**Ce que ça fait (avec 2 gates de validation obligatoires) :**
1. `git status` + `git diff --stat` pour vérifier l'état
2. **Gate 1** : plan de commit (fichiers, message, stratégie) → **attends ta validation**
3. `npm test` des deux côtés avant tout commit
4. `git add` + `git commit` + `git push`
5. Archive `docs/features/Vxx-[Nom]/` → `docs/features/Completed-Feature/`
6. **Gate 2** : "Prêt à merger vers dev ?" → **attends ta validation**
7. Merge vers `dev` + nettoyage de branche

**Important** : Claude ne mergera jamais sans ta confirmation explicite.

---

### `/project:deploy`

**Quand** : Tu veux déployer le full stack.

**Ce que ça fait :**
1. Vérifications pré-déploiement (Docker, `.env`)
2. `docker compose build --no-cache`
3. `docker compose up -d` dans le bon ordre
4. Lecture des logs + health check `curl localhost:3001/health`

**Attention** : Claude te demandera confirmation avant tout `docker compose down -v` (détruit les données PostgreSQL).

---

## Agents spécialisés

Les agents tournent dans leur propre context window isolé — ils n'encombrent pas ta session principale. Ils peuvent être déclenchés explicitement ou automatiquement quand Claude détecte que le contexte correspond.

### `code-reviewer` (model: haiku)

**Déclenchement auto** : quand tu parles de PR, review, validation avant merge.
**Déclenchement explicite** : "fais une review de ce fichier" / "vérifie ce code"

**Analyse :**
- 🔴 CRITIQUE : bugs, injections, failles de sécurité
- 🟡 IMPORTANT : violations des hard rules (Zod manquant, console.log, hardcoded values)
- 🟢 MINEUR : optimisations optionnelles

**Outils** : Read, Grep, Glob — lecture seule, ne modifie rien.

---

### `security-auditor` (model: haiku)

**Déclenchement auto** : quand tu mentionnes sécurité, vulnérabilité, audit, avant un merge critique.
**Déclenchement explicite** : "audite la sécurité de ce service"

**Vérifie :**
- Injection SQL (concaténation dans les requêtes)
- XSS (dangerouslySetInnerHTML, interpolations)
- Secrets exposés (credentials hardcodés, `.env` leaks)
- Auth/autorisation (middlewares manquants sur routes sensibles)
- Données sensibles dans les réponses API

**Outils** : Read, Grep, Glob — lecture seule.

---

### `qa-runner` (model: sonnet)

**Déclenchement auto** : quand tu parles de tests, QA, validation, build.
**Déclenchement explicite** : "lance les tests" / "génère le QA report"

**Fait :**
- Build Docker complet + lecture de logs
- `npm test` backend + frontend
- Rapport structuré avec preuves réelles (pas de placeholders)
- Génération du `QA-REPORT.md` si demandé

**Outils** : Read, Bash, Glob — peut exécuter des commandes.

---

### `doc-writer` (model: haiku)

**Déclenchement auto** : en Phase 6 de `create-new-feature` (après tests verts).
**Déclenchement explicite** : "mets à jour la doc" / "génère le QA report"

**Produit :**
- `docs/features/Vxx-[Nom]/QA-REPORT.md` (avec vrais résultats de tests)
- Mise à jour `.claude/project-architecture/backend-swagger.yaml`
- Section "Résultat de livraison" dans `technical-spec.md`

**Règle** : ne génère jamais un QA-REPORT avec des résultats fictifs.

---

## Pipeline complet d'une feature

```
/project:create-new-feature
         │
         ▼
    [Raffinement]
    Dialogue pour clarifier besoin
         │
         ▼
    [TSD] ──────────────────────► VALIDATION REQUISE
    technical-spec.md
         │
         ▼
    [Branche + Structure]
    feature/Vxx-[Nom]/
         │
         ▼
    [User Stories] ─────────────► VALIDATION REQUISE
    US-370, US-371...
         │
         ▼
    ┌────────────────────────────────┐
    │  BOUCLE par US                 │
    │  /project:implement-feature    │
    │  → Plan → Impl → Tests → ──────┼──► VALIDATION REQUISE (par US)
    │  Répète jusqu'à dernière US    │
    └────────────────────────────────┘
         │
         ▼
    /project:run-tests ─── ❌ Échec → Corriger → Relancer
         │ ✅ 100% vert
         ▼
    [doc-writer]
    QA-REPORT + Swagger + technical-spec
         │
         ▼
    "Veux-tu merger ?" ─────────────► VALIDATION REQUISE
         │ Oui
         ▼
    /project:gitflow ───────────────► VALIDATION REQUISE (merge)
```

---

## Bonnes pratiques

### Ce que Claude fait sans qu'on lui demande
- Lit `.claude/project-architecture/` avant toute implémentation (anti-duplication)
- Vérifie `frontend/src/design-system/components/` avant de créer un composant
- Grep les services existants avant d'en créer de nouveaux
- Ajoute `$schema` aux JSON pour la validation VS Code
- Note les bugs hors-scope avec `// AUDIT:` sans les corriger dans le même commit

### Ce qu'il ne fera jamais sans ta confirmation explicite
- Merger vers `main`
- `docker compose down -v` (destruction des données)
- `DROP`, `TRUNCATE` sur la base de données
- Force push
- Commiter des fichiers `.env` ou secrets

### Comment obtenir le meilleur de Claude

**Sois précis sur le scope :**
```
# Moins bien
"améliore la page des matchs"

# Mieux
"dans SeasonOverviewPage, le split view ne filtre pas correctement
les rounds quand rangeStart > 5. Voici l'erreur : [stack trace]"
```

**Utilise les commandes pour les workflows récurrents :**
```
# Au lieu de décrire le process à chaque fois :
/project:create-new-feature
/project:run-tests
/project:gitflow
```

**Laisse les agents faire le travail isolé :**
```
# Claude délèguera automatiquement à l'agent adapté.
# Tu peux aussi être explicite :
"fais une review de sécurité sur backend/src/routes/v3/betting_routes.js"
→ security-auditor se déclenche dans son propre contexte
```

**En cas de blocage :**
```
# Si Claude boucle sur une erreur :
"Stop. Explique-moi le bloquant et propose 3 approches alternatives."
```

---

## Structure des fichiers de documentation

Chaque feature livrée doit avoir :

```
docs/features/Vxx-[NomFeature]/
├── technical-spec.md      # TSD initial + section "Résultat de livraison"
├── US-370-backend-*.md    # User Stories
├── US-371-frontend-*.md
└── QA-REPORT.md           # Rapport de validation (obligatoire avant merge)

docs/features/Completed-Feature/
└── [features archivées après merge]
```

---

## Référence rapide

| Je veux... | Je tape... |
|---|---|
| Démarrer une nouvelle feature | `/project:create-new-feature` |
| Implémenter une US précise | `/project:implement-feature US-371` |
| Vérifier que tout est vert | `/project:run-tests` |
| Commiter et merger | `/project:gitflow` |
| Déployer le stack | `/project:deploy` |
| Review de code | "review ce fichier" (auto: code-reviewer) |
| Audit sécurité | "audite la sécurité" (auto: security-auditor) |
| Générer la doc | "génère le QA report" (auto: doc-writer) |
