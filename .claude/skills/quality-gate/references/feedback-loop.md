# Feedback Loop — après une correction utilisateur

> **Quand utiliser** : à chaque fois que l'utilisateur corrige une de tes décisions techniques, te dit "non, pas comme ça", refuse une approche, ou identifie une erreur dans ton travail.
> **Avant** de proposer la correction.

Cette boucle correspond à la **Gate 4** de `quality-gate/SKILL.md`. C'est ce qui transforme un projet bavard en projet qui apprend.

---

## Pourquoi c'est critique

Une correction perdue = une correction qui se répétera. La mémoire conversationnelle de Claude se vide à chaque session. **Seuls les fichiers persistent.** Donc les leçons doivent être dans `tasks/lessons.md`.

C'est aussi ce qui distingue un assistant qui frustre l'utilisateur ("on a déjà eu ce problème la semaine dernière !") d'un assistant qui s'améliore.

---

## Quand la boucle se déclenche

Signaux explicites :
- "Non, pas comme ça"
- "Tu as encore fait X"
- "Je t'ai déjà dit que…"
- "Ce n'est pas le pattern qu'on utilise"
- "Pourquoi tu as ajouté ça ?"
- L'utilisateur fait un `git revert` ou supprime ton code
- L'utilisateur réécrit lui-même une partie de ce que tu viens de produire

Signaux implicites (à détecter) :
- L'utilisateur reformule sa demande après avoir vu ta réponse
- Il pose une question qui sous-entend que ton output est inadapté
- Il valide en surface mais demande des modifs immédiates

**En cas de doute : on traite comme une correction.** Mieux vaut une leçon de trop qu'une leçon manquante.

---

## Procédure (avant de proposer la correction)

### 1. Pause avant de répondre

Tu ne te jettes pas sur la nouvelle proposition. Tu prends un instant pour analyser.

### 2. Documente l'écart

Avant tout autre code/modification, tu mets à jour `tasks/lessons.md` avec une nouvelle entrée.

**Format imposé** :

```markdown
## YYYY-MM-DD — [Titre court de la leçon]

**Contexte** : [Tâche/US où l'erreur s'est produite. 1-2 phrases.]

**❌ Ce que j'ai fait** :
[Description factuelle de l'erreur. Sans euphémismes. Sans excuses.]

**✅ Ce que j'aurais dû faire** :
[La règle correcte, formulée comme un guide pour la prochaine fois.]

**🔍 Signal d'alerte** :
[Ce que j'aurais dû remarquer avant de tomber dans l'erreur. Ce qui aurait dû me faire dire "attention, ici, je risque de me tromper".]

**Référence** : [chemin vers `rules/` ou `skills/` qui couvre déjà cette règle, ou note "à ajouter dans rules/X.md"]
```

### 3. Confirme à l'utilisateur que la leçon est prise

Réponse type :
> "Je note la correction dans `tasks/lessons.md` : [résumé en une phrase]. Voici la nouvelle approche : [...]"

Pas de blabla d'auto-flagellation. Pas de "désolé, désolé". On reconnaît, on documente, on corrige, on avance.

---

## Bonnes leçons vs mauvaises leçons

### ❌ Mauvaise leçon (trop vague)

```markdown
## 2026-04-12 — Mieux faire attention au backend

**Ce que j'ai fait** : du mauvais code backend.
**Ce que j'aurais dû faire** : du meilleur code.
```

Inutilisable. Aucun signal actionnable.

### ✅ Bonne leçon (spécifique, actionnable)

```markdown
## 2026-04-12 — Ne pas mettre de business logic dans les controllers V4

**Contexte** : US-374 — endpoint /api/v4/leagues/:id/clubs.

**❌ Ce que j'ai fait** : j'ai mis le filtrage et l'agrégation directement dans `leagueControllerV4.js`, en accédant à `db` depuis le controller.

**✅ Ce que j'aurais dû faire** : le controller ne doit faire QUE : (1) parser via Zod, (2) appeler `LeagueServiceV4.getClubs(id)`, (3) wrapper la réponse en `{ success, data }`. Toute la logique (filtres, joins, transforms) appartient au service.

**🔍 Signal d'alerte** : dès que j'écris `db.all(...)` ou un `.filter(...)` dans un fichier dont le nom contient "Controller", c'est un red flag.

**Référence** : `.claude/CLAUDE.md` section "V4 Route Pattern" + `.claude/rules/backend-engineer.md`.
```

Réutilisable. Si je relis ça la semaine prochaine avant d'écrire un nouveau controller V4, je me souviendrai de la règle.

---

## Maintenance de `tasks/lessons.md`

### Au démarrage de chaque session de dev

```
□ J'ai relu tasks/lessons.md (cf. pre-flight checklist étape 7)
□ J'ai identifié les leçons applicables à la tâche du jour
```

### Périodiquement (mensuel ou avant audit majeur)

L'utilisateur peut demander de :
- Consolider des leçons similaires (3 entrées sur "ne pas oublier le QA-REPORT" → fusionner en une seule)
- Promouvoir une leçon récurrente en règle officielle dans `.claude/rules/`
- Archiver les leçons obsolètes (ex : "ne pas oublier d'ajouter X" si X est devenu automatique via CI)

```
□ Si une leçon revient ≥ 3 fois → candidate à devenir une rule officielle
□ Si une leçon est rendue obsolète par l'outillage → archiver dans tasks/lessons-archive.md
```

---

## Cas particuliers

### L'utilisateur me corrige sur un point déjà documenté dans `lessons.md`

Cas grave. Cela signifie :
- soit la leçon n'a pas été lue avant la tâche (faute de méthode)
- soit la leçon est mal formulée (peu claire, peu visible)

Action :
1. Note dans la nouvelle entrée : "**Récidive** — leçon du YYYY-MM-DD non appliquée."
2. Reformule la leçon originelle pour la rendre plus actionnable.
3. Considère sérieusement de promouvoir la règle dans `.claude/rules/` pour la rendre incontournable.

### L'utilisateur conteste sans corriger

Si l'utilisateur exprime un désaccord sans être sûr lui-même de la solution, on ne précipite pas une leçon. On engage le dialogue : "Quelle est la bonne approche selon toi ?" → puis on documente la conclusion une fois alignés.

### L'utilisateur change d'avis en cours de tâche

Pas de leçon — c'est juste une évolution de specs. À noter dans `tasks/todo.md` ("decision change : YYYY-MM-DD : on passe finalement par X au lieu de Y") mais pas dans `lessons.md`.

`lessons.md` est réservé aux **erreurs techniques de l'agent**, pas aux évolutions de besoin.

---

## Hard rules de la boucle de feedback

1. **Pas de correction proposée avant que `lessons.md` soit mis à jour.** Si tu n'as pas écrit la leçon, tu n'as pas le droit d'aller plus loin.
2. **Pas d'auto-flagellation.** Une leçon factuelle vaut mieux qu'une excuse.
3. **Pas de leçon vague.** Si tu ne peux pas la formuler en termes opérationnels ("la prochaine fois je ferai X au lieu de Y"), elle est mal écrite.
4. **`lessons.md` est sacré.** Pas d'effacement de leçons sans accord utilisateur.
