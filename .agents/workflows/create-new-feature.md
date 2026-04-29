---
description: Initier une nouvelle feature de A à Z — TSD, branche, US, implémentation, tests, doc, merge
---

## Contexte Git actuel

Branche : `!git branch --show-current`

Commits récents :
```
!git log --oneline -5
```

---

Endosse le rôle **Product Owner** et pilote la feature de bout en bout :

---

### Phase 0 — Raffinement
Dialogue avec l'utilisateur pour comprendre le "Pourquoi" et le "Quoi". Identifie la version (ex: V37) et le nom de la feature.

### Phase 1 — TSD (Product Architect)
Consulte `.agents/project-architecture/` pour l'analyse d'impact. Rédige `technical-spec.md` avec : Data Contract (SQL + Zod), UI Blueprint, Logic & Edge Cases. 
**RÈGLE D'OR (CANONICAL IDENTITY)** : 
- Il est **STRICTEMENT INTERDIT** d'insérer des données externes directement avec leurs IDs sources dans les tables métier (`matches`, `people`, `teams`, etc.).
- Chaque ingestion **doit** passer par une table de mapping dédiée : `v4.mapping_teams`, `v4.mapping_people`, `v4.mapping_competitions`, `v4.mapping_venues`.
- La résolution d'identité doit être déléguée au `ResolutionServiceV4` conformément à la règle **[.agents/rules/canonical-identity-resolution.md](file:///.agents/rules/canonical-identity-resolution.md)**.
- Le TSD **doit** détailler le schéma des tables de mapping nécessaires.
**Soumets à l'utilisateur avant de continuer.**

### Phase 2 — Branche Git (Git Engineer)
Crée la branche `feature/Vxx-[Nom]` et le dossier `docs/features/Vxx-[Nom]/`.

### Phase 3 — User Stories (Product Owner)
Découpe le TSD en US numérotées (V37 → US-370, US-371...). Génère les fichiers `US-<num>-<role>-<nom>.md` en respectant **strictement** ce template :

```markdown
# US-[num] — [Titre court]

**En tant que** [rôle], **je veux** [action] **afin de** [bénéfice].

## Skills requis
<!-- OBLIGATOIRE — ces tags déclenchent le chargement des skills dans implement-feature -->
`[FRONTEND]` `[BACKEND]` `[DATABASE]` `[SQL]` `[ML]` `[SECURITY]` `[QA]`
<!-- Ne garder que les tags applicables à cette US -->

## Critères d'acceptation
- [ ] ...

## Scénarios de test
1. **Nominal** : ...
2. **Edge case** : ...
3. **Erreur** : ...

## Notes techniques
(contraintes, dépendances sur d'autres US, points d'attention)
```

**Mapping des tags → skills :**
| Tag | Skills chargés avant l'implémentation |
|---|---|
| `[FRONTEND]` | `.agents/skills/design/SKILL.md` + `.agents/skills/web-dev/SKILL.md` |
| `[BACKEND]` | `.agents/skills/backend/SKILL.md` |
| `[DATABASE]` | `.agents/skills/database/SKILL.md` |
| `[SQL]` | `.agents/skills/database/SKILL.md` |
| `[ML]` | `.agents/skills/machine-learning/SKILL.md` |
| `[SECURITY]` | `.agents/skills/security/SKILL.md` |
| `[QA]` | `.agents/skills/testing/SKILL.md` — **toujours présent, sans exception** |

**Valide le backlog complet avec l'utilisateur avant de commencer l'implémentation.**

---

### Phase 4 — Implémentation US par US (BOUCLE)

Pour **chaque US** dans l'ordre du backlog :

1. Lance `/project:implement-feature [US-num]` et exécute-le en intégralité (phases 0→4 du workflow implement-feature)
2. Attends la validation utilisateur de l'US avant de passer à la suivante
3. Répète jusqu'à ce que **toutes les US soient implémentées et validées**

---

### Phase 5 — Tests globaux (BLOQUANT)

Une fois toutes les US terminées, lance `/project:run-tests` :

```bash
cd backend && npm test
cd frontend && npm test
```

- **Si tous les tests passent (✅)** → passe à la Phase 6
- **Si un test échoue (❌)** → identifie la cause racine, corrige, relance `/project:run-tests`. Ne passe **jamais** à la Phase 6 tant que la batterie n'est pas verte à 100%.

---

### Phase 6 — Mise à jour de la documentation

Une fois les tests verts, délègue à l'agent `doc-writer` :

1. **QA-REPORT.md** : Génère `docs/features/Vxx-[Nom]/QA-REPORT.md` avec résultats de tests, logs Docker, checklist UI
2. **Swagger** : Si des endpoints ont changé, vérifie que `.agents/project-architecture/backend-swagger.yaml` est à jour
3. **technical-spec.md** : Ajoute une section "Résultat de livraison" avec les écarts éventuels par rapport au TSD initial

---

### Phase 7 — Demande de merge

Présente le bilan complet à l'utilisateur :

```
✅ Feature : Vxx-[Nom]
✅ US implémentées : [liste]
✅ Tests : X/X backend, X/X frontend
✅ QA-REPORT.md généré
✅ Documentation mise à jour

Veux-tu merger cette feature vers main ?
```

- **Si oui** → lance `/project:gitflow` (merge vers `dev`)
- **Si non** → note les points à retravailler et attends les instructions
