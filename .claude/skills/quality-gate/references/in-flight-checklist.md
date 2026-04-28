# In-flight Checklist — pendant l'écriture du code

> **Quand utiliser** : à activer en continu pendant le développement. Auto-relecture toutes les ~10 modifications, ou avant chaque pause/changement de contexte.
> **Posture** : tu te relis comme si un staff engineer regardait par-dessus ton épaule.

Cette checklist correspond à la **Gate 2** de `quality-gate/SKILL.md`.

---

## Discipline 1 — Anti-hallucination en temps réel

À chaque fois que tu :
- importes une fonction
- utilises un composant
- référence une route API
- écris une requête SQL
- mentionnes une variable d'env

→ tu **vérifies** d'abord. Pas après. Pas "je vérifierai à la fin".

```bash
# Pour une fonction backend
grep -n "export.*methodName" backend/src/services/v4/<File>.js

# Pour un composant DS
ls frontend/src/design-system/components/ | grep -i <Name>

# Pour une colonne SQL
grep -rn "<column_name>" backend/src/migrations/registry/

# Pour une variable d'env
grep -n "<VAR_NAME>" .env.example
```

Si la chose n'existe pas → tu **ne la crées pas implicitement**. Tu reviens en pre-flight pour décider explicitement de la créer.

---

## Discipline 2 — Markers inline systématiques

Issus de `CLAUDE.md`. Chacun signale une intention différente :

| Marker | Quand l'utiliser |
|---|---|
| `// @STUB V5: ...` | Méthode pas encore implémentée, retourne du placeholder |
| `// @AUDIT: desc` | Tu remarques de la dette technique → marquer ici, fix plus tard |
| `// @CRITICAL: desc` | Invariant business — interdit de modifier sans nouveau TSD |
| `// @RACE-CONDITION` | Section non-atomique, requiert une transaction |
| `// @NO-AUTH` | Route publique intentionnellement (health check, etc.) |
| `// @V3-COMPAT` | Code temporaire de compat V3↔V4, à retirer en V5 |

```
□ J'ai marqué chaque dette ou choix non-trivial avec le bon marker
□ Je n'ai pas laissé de TODO sans marker explicite
□ Les @STUB ont une version cible (@STUB V5: ...)
```

---

## Discipline 3 — Scope discipline (rule from `ai-cognition.md`)

Si pendant le code tu remarques un bug ailleurs :

1. **Ne le corrige pas dans ce commit.**
2. Ajoute `// @AUDIT: [description courte]` à l'endroit problématique.
3. Continue ta tâche initiale.
4. À la fin, mentionne-le dans le QA-REPORT ou crée un ticket.

```
□ Aucune correction "opportuniste" hors du scope déclaré dans tasks/todo.md
□ Tout bug détecté hors scope → marqué @AUDIT, jamais corrigé en passant
```

---

## Discipline 4 — Hard Rules en temps réel

Issues de `CLAUDE.md`. À auto-vérifier en continu :

### Backend
```
□ Pas de credentials hardcodés → process.env.DATABASE_URL toujours
□ Toutes les requêtes utilisent db.all(sql, [params]) — JAMAIS de string interpolation
□ Toutes les réponses : { success: true, data } ou { success: false, error }
□ Pas de business logic dans les controllers — services uniquement
□ Pas de console.* dans nouveau code → import logger from 'utils/logger.js'
□ Logger structuré : logger.error({ err: error }, 'context')
```

### Frontend
```
□ Avant tout nouveau composant → ls frontend/src/design-system/components/
□ Aucun #hex, rgb(), rgba(), valeur en px hardcodée dans le JSX
□ Tout composant data-fetching a 3 états : <Skeleton> / error / data
□ style={{...}} max 2 propriétés — sinon className + CSS variables
□ useMemo pour les transforms coûteux, useCallback pour les callbacks de props
```

### SQL / DB
```
□ Migration additive uniquement — pas de DROP, TRUNCATE, schema-loss
□ Business key avec contrainte unique sur tout nouvel entity
□ Insert idempotent : 2 runs = 1 résultat (déduplication)
□ Bulk operations dans BEGIN...COMMIT
□ FK vérifiées avant d'insérer un enfant
```

### Tests
```
□ Chaque nouvelle fonction de logique a au moins 1 happy + 1 error path
□ Chaque endpoint nouveau/modifié a un test de contrat (Supertest)
□ Tests Vitest collés au fichier source (.test.js à côté)
```

---

## Discipline 5 — Atomicité du commit

Tu écris du code en pensant déjà à comment tu vas le commiter :

```
□ Cette modification = 1 changement logique cohérent
□ Pas de mélange refacto + feature dans le même commit
□ Pas de mélange feature A + feature B
□ Le message de commit type: description tient en une ligne claire à l'infinitif
```

Si tu te rends compte que tu as mélangé : **arrête, isole en plusieurs commits avant d'aller plus loin**. `git add -p` est ton ami.

---

## Discipline 6 — Performance en temps réel (frontend)

Issu de `sonarGoodPractice.md` :

```
□ Aucune fonction > 50 lignes sans raison documentée
□ Cognitive complexity < 15 par fonction (mentale ou ESLint plugin)
□ Nesting max 4 niveaux — sinon early return ou extraction
□ Composant > 250 lignes → candidat à la décomposition
```

---

## Discipline 7 — Lecture en boucle

Toutes les ~10 modifications (ou avant un commit, ou après une pause) :

```bash
# Re-vérifie ce que tu as touché
git status
git diff --stat
git diff

# Lis ton propre diff comme si c'était celui de quelqu'un d'autre
```

Questions à te poser :
- Est-ce que ce diff est lisible sans le contexte de ma conversation ?
- Est-ce qu'un staff engineer approuverait ?
- Est-ce qu'il y a du code mort, des `console.log` de debug oubliés, des imports inutilisés ?

---

## Si tu détectes une violation

1. **Tu corriges immédiatement** (pas plus tard, pas dans le prochain commit).
2. Si la violation vient d'une zone de code que tu ne contrôles pas → `// @AUDIT: ...` + remontée à l'utilisateur.
3. Si tu as fait l'erreur 2 fois dans la même session → pause, va lire `tasks/lessons.md`, et ajoute la leçon si elle n'y est pas.

---

## ✅ Tu peux passer en pre-merge uniquement quand :

- Toutes les disciplines sont vertes
- Le code compile / les tests locaux passent
- `git diff` est lisible et atomique
