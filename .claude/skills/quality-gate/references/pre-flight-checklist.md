# Pre-flight Checklist — avant de coder

> **Quand utiliser** : démarrage de toute tâche de développement (feature, bugfix, refacto, chore).
> **Bloquant** : si une étape n'est pas remplie, NE PAS COMMENCER LE CODE.

Cette checklist correspond à la **Gate 1** de `quality-gate/SKILL.md`.

---

## Étape 1 — L'US existe et est tagguée

```
□ Une User Story formelle existe dans docs/features/Vxx-[Nom]/US-NNN-*.md
□ Elle suit le template (rôle, action, bénéfice, critères d'acceptation, scénarios)
□ Elle porte une section "## Skills requis" avec les tags applicables :
    [FRONTEND] [BACKEND] [DATABASE] [SQL] [ML] [SECURITY] [QA]
```

**Si non rempli** :
- Pas d'US → STOP, déclencher `/project:create-new-feature` au préalable
- US sans tags → demander à l'utilisateur de compléter avant tout code

---

## Étape 2 — Lecture des rules pertinentes (DANS CETTE SESSION)

> Ne te dis jamais "je les connais déjà". Le contexte conversationnel se perd, tes priors aussi.

Toujours lire :
```
□ .claude/CLAUDE.md
□ .claude/rules/ai-cognition.md
□ .claude/rules/development-best-practices.md
□ .claude/rules/engineering-standards.md
```

Selon le scope de la tâche :
```
□ [FRONTEND ou UI]   → .claude/rules/visual-manifesto.md
                     → .claude/rules/frontend-engineer.md
□ [BACKEND]          → .claude/rules/backend-engineer.md
□ [BDD ou import]    → .claude/rules/data-ingestion-standards.md (CRITIQUE)
□ [SECURITY]         → .claude/rules/security-expert.md
□ [QA]               → .claude/rules/qa-engineer.md
□ [ML]               → .claude/rules/machine-learning-engineer.md
□ [Docker/CI]        → .claude/rules/devops-engineer.md + docker-engineer.md
□ [Git ops]          → .claude/rules/git-engineer.md
```

---

## Étape 3 — Chargement des skills (selon les tags de l'US)

Mapping issu de `commands/create-new-feature.md` :

| Tag | Skills à lire |
|---|---|
| `[FRONTEND]` | `skills/frontend-design/SKILL.md` |
| `[BACKEND]` | `skills/backend/rest-endpoint-design/SKILL.md` + `backend/input-validation/SKILL.md` |
| `[DATABASE]` | `skills/database/migration-script/SKILL.md` + `database/normalization/SKILL.md` |
| `[SQL]` | `skills/database/indexing-strategy/SKILL.md` + `security/sql-injection-mitigation/SKILL.md` |
| `[ML]` | `skills/machine-learning/SKILL.md` |
| `[SECURITY]` | `skills/security/sql-injection-mitigation/SKILL.md` + `security/xss-prevention/SKILL.md` |
| `[QA]` | `skills/qa-automation/SKILL.md` — **toujours, sans exception** |

```
□ Tous les SKILL.md des tags présents ont été lus
□ skills/quality-gate/SKILL.md (celui-ci) est chargé
```

---

## Étape 4 — Analyse d'impact (anti-hallucination)

Avant de toucher quoi que ce soit, **prouve par le code** :

```bash
# Quels fichiers sont impactés ?
grep -rn "<entityName>" backend/src/  frontend/src/

# Le composant DS que je veux utiliser existe-t-il ?
ls frontend/src/design-system/components/

# La route existe déjà ?
grep -rn "router.get\|router.post" backend/src/routes/v4/

# La table V4 existe en migration ?
ls backend/src/migrations/registry/ | grep -i <table>
```

```
□ J'ai listé tous les fichiers à créer
□ J'ai listé tous les fichiers à modifier
□ J'ai listé les dépendances inverses (qui appelle ce service / ce composant ?)
□ Aucune référence n'est inventée — tout a été vérifié par grep/ls
```

---

## Étape 5 — Plan dans `tasks/todo.md`

Format imposé (voir `quality-gate/SKILL.md`).

```
□ Goal en une phrase
□ Skills chargés listés
□ Fichiers à toucher listés (création/modif explicites)
□ Plan en étapes cochables
□ Risques identifiés (régression, perf, sécurité)
□ Section "Validation utilisateur" avec case à cocher
```

---

## Étape 6 — Validation utilisateur du plan

```
□ Le plan a été présenté à l'utilisateur
□ L'utilisateur a explicitement validé (oui/go/ok)
□ Si l'utilisateur a demandé des changements, ils sont intégrés et re-validés
```

**Exception unique** : pour des changements vraiment triviaux (typo, un import oublié, un commentaire), tu peux sauter cette étape SI :
- < 5 lignes modifiées
- 1 seul fichier
- Pas de logique métier touchée
- Pas de schéma DB modifié

Dans tous les autres cas → **validation explicite obligatoire**.

---

## Étape 7 — Lecture de `tasks/lessons.md`

```
□ J'ai relu tasks/lessons.md
□ J'ai identifié les leçons applicables à la tâche en cours
□ Je m'engage à ne pas refaire les erreurs documentées
```

C'est ta mémoire long-terme. La sauter, c'est garantir de répéter les mêmes bourdes.

---

## ✅ Tu es bon pour passer en in-flight uniquement si toutes les cases sont cochées.

Sinon, retour en arrière sur l'étape manquante.
