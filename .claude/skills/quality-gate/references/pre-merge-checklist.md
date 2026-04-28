# Pre-merge Checklist — avant commit / push / merge

> **Quand utiliser** : impérativement avant `/project:gitflow`, avant tout `git push`, avant toute PR.
> **Bloquant absolu** : aucune exception. Si une étape échoue, on ne pousse pas.

Cette checklist correspond à la **Gate 3** de `quality-gate/SKILL.md`.

---

## Étape 1 — Tests automatisés (BLOQUANT)

Aucune tolérance pour un test rouge. On ne commente pas, on ne skip pas.

### Backend
```bash
cd backend && npm test
```
```
□ Tous les unit tests passent
□ Tous les API contract tests (Supertest) passent
□ Le log complet de la commande est lu — pas juste le statut final
□ Aucune régression sur les tests préexistants
```

### Frontend
```bash
cd frontend && npm test
```
```
□ Tous les tests Vitest passent (jsdom)
□ Aucune régression
```

### Docker (si changements backend/ML/Dockerfile)
```bash
docker compose build
```
```
□ Build réussit
□ Logs lus en intégralité (pas juste le "Successfully built")
□ Aucun warning de sécurité critique
```

> Si quoi que ce soit échoue : retour en in-flight, identifier la cause racine (pas le symptôme), corriger, re-lancer la batterie. **2 tentatives max** sur la même erreur — au-delà, stop et expliquer le blocage à l'utilisateur (cf. `ai-cognition.md` "Build Failure Protocol").

---

## Étape 2 — QA-REPORT.md (OBLIGATOIRE pour features)

Délégué au skill `qa-automation` ou à l'agent `doc-writer`. Format imposé documenté dans `qa-automation/SKILL.md`.

```
□ docs/features/Vxx-[Nom]/QA-REPORT.md existe
□ Sections présentes : Unit Tests / API Contract Tests / Non-Regression / UI Checks
□ Chaque résultat a une preuve (commande exécutée, comptage X passed / Y failed)
□ Section "Régressions introduites" remplie (None ou liste explicite)
□ UI Checks : Skeleton / error states / focus states / DS compliance — toutes ✅
```

**Pas de QA-REPORT = pas de merge.** Hard rule du `CLAUDE.md`.

---

## Étape 3 — Documentation à jour

```
□ Si endpoints modifiés → .claude/project-architecture/backend-swagger.yaml à jour
□ Si nouveau composant DS → frontend/src/design-system/<Comp>/ avec .stories.jsx
□ Si nouvelle variable d'env → README.md + .env.example mis à jour
□ Si décision archi → technical-spec.md du dossier feature à jour ("Résultat de livraison")
```

---

## Étape 4 — Audit du diff (relecture finale)

```bash
git status
git diff --stat
git diff
```

```
□ Aucun fichier non lié à la tâche dans le diff
□ Aucun fichier sensible (.env, secrets, dumps SQL, fichiers IDE)
□ Aucun console.log / print() oublié (debug)
□ Aucun import inutilisé
□ Aucun bloc commenté "au cas où"
□ Aucun TODO sans marker (@STUB / @AUDIT / @CRITICAL)
□ Aucun hardcoded path/URL sauf justifié
```

Recherches anti-régression rapides :
```bash
# Dans le code backend nouvellement modifié
grep -rn "console\." backend/src/<modif_zone>/  # doit retourner vide
grep -rn "process.env.DATABASE_URL" backend/src/<modif_zone>/  # vérifier la cohérence

# Dans le code frontend
grep -rn "style={{" frontend/src/<modif_zone>/  # max 2 props par occurrence
grep -rEn "#[0-9a-fA-F]{3,6}" frontend/src/<modif_zone>/*.jsx  # idéalement vide
```

---

## Étape 5 — Format du commit

Issu de `engineering-standards.md` :

```
□ Format : type: description concise
□ type ∈ { feat, fix, refactor, chore, docs, test, perf, style }
□ Verbe à l'infinitif (ajouter, corriger, refactoriser…)
□ Une ligne claire (< 72 chars idéalement)
□ Description en français OK, mais code/identifiants en anglais
□ Atomicité : ce commit = 1 changement logique
□ Pas de "wip", "fix typo", "asdf" — chaque commit a un message utile
```

Bons exemples :
- `feat: ajouter le calcul des probas de victoire pour US-371`
- `fix: corriger la race condition sur l'insert match V4`
- `refactor: extraire la logique de pagination dans paginationHelper`

Mauvais :
- `update`
- `fix bug`
- `wip frontend`

---

## Étape 6 — Vérifications de sécurité finales

```
□ Aucun secret dans le diff (clés API, tokens, mots de passe)
□ Aucun hardcoded credential
□ Aucune clé privée, fichier .pem, .key
□ Tous les nouveaux endpoints ont une auth ou un @NO-AUTH justifié
□ Toutes les nouvelles routes publiques ont validation Zod
□ Aucune nouvelle dépendance npm sans avoir vérifié sa fiabilité (npm audit)
```

Si présence d'opérations DB sensibles :
```
□ Aucun DROP, TRUNCATE, ALTER destructif
□ Migrations additives uniquement
□ Si insert/update bulk → BEGIN...COMMIT, FK vérifiées, audit logging présent
□ Cf. .claude/rules/data-ingestion-standards.md
```

---

## Étape 7 — Mise à jour de `tasks/lessons.md` (si applicable)

Si pendant cette tâche l'utilisateur t'a corrigé sur un point technique → la leçon doit être dans `tasks/lessons.md` AVANT le commit.

```
□ tasks/lessons.md a été mis à jour pour les corrections de cette session
□ Format respecté (cf. quality-gate/SKILL.md)
```

---

## Étape 8 — État du dépôt propre

```bash
git status
```

```
□ Pas de fichiers non suivis indésirables
□ Pas de fichiers staged que tu n'as pas voulu commiter
□ La branche courante est bien feature/Vxx-[Nom] (jamais main directement)
□ La branche est à jour vis-à-vis de dev (git fetch + merge si besoin)
```

---

## ✅ Si toutes les étapes sont vertes : déclencher `/project:gitflow`

`gitflow` reprendra ses propres vérifications (re-tests, plan de commit, demande de validation utilisateur, merge vers `dev` uniquement).

## ❌ Si une seule étape échoue :

1. Retour en in-flight pour corriger
2. Re-lancer la pre-merge checklist DEPUIS LE DÉBUT
3. **Ne pas push avec un test rouge en se disant "je corrigerai après"**
