# V9 — Workflow 4-6 semaines (Twitter Catchy Content)

**Mission :** Cadrer un plan de sprint réaliste pour basculer V8 → V9 (Twitter-first), en respectant les règles "spec-first" et "zero invention".

**Période visée :** sem. 18 → sem. 23 (mai-juin 2026).

**Capacité estimée :** 1 développeur full-stack (toi) × ~15 j ouvrés / sprint.

---

## 1. Vue d'ensemble

```
Sprint 1 (sem 18-19) — V9.0 Foundations          [10-12 j]
Sprint 2 (sem 20-21) — V9.1 NarrativeGrid v2     [8-10 j]
Sprint 3 (sem 22)    — V9.2 Scatter goals/xG     [5-7 j]
Sprint 4 (sem 23)    — V9.3 Match Recap timeline [5-7 j]
   (V9.4 line chart annoté → V10 si capacity dépassée)
```

**Livraison continue :** chaque sprint = 1 PR mergée + QA-Report + démo.

---

## 2. Sprint 1 — V9.0 Foundations (10-12 j)

**Objectif :** poser les rails sans introduire de nouveau template.

### Stories

#### V9.0-A — IdeasHub catalog v2 (4.5 j)
- Réécrire `frontend/src/components/v3/modules/studio/IdeasHub/catalog.js` selon `ideas-v9-tsd.md`.
- 12 idées, modèle `Idea`, statut `ready/partial/blocked`.
- Service `checkIdeaReadiness`.
- Pré-remplir params de test via `getCoverageV4`.

#### V9.0-B — Format strategy (2 j)
- Étendre `TemplateRegistry.js` avec `aspectsSupported` et `primeAspect` (cf. `format-strategy.md` § 4.2).
- UI Studio : badge "Format prime" + grisage des aspects "discouraged" + tooltip.
- MAJ tests `TemplatesPlayground.test.jsx`.

#### V9.0-C — Palettes officielles (1.5 j)
- 4 palettes nommées dans `_shared/themes.js` : `stadium-black`, `editorial-paper`, `tactical-violet`, `pitch-night` (cf. `twitter-playbook.md` § 5).
- Tokens CSS dédiés ou map `themes` enrichie.
- Mapper chaque template à une palette prime.

#### V9.0-D — Logos `data_gap` visible (1 j)
- Quand `MatchPreviewContentServiceV4` ne trouve pas de logo, l'UI doit afficher un badge discret "logo manquant" plutôt qu'un placeholder gris silencieux (cf. atlas § 2.13).

#### V9.0-E — Retirer NarrativeGrid v1 du hub par défaut (0.5 j)
- Garder accessible derrière un flag URL `?legacy=ng1` 2 sprints, pas par défaut dans le sélecteur.
- Affichage banner "NarrativeGrid v2 arrive — version legacy".

#### V9.0-F — QA, doc, merge (1 j)
- QA-Report dans `docs/features/V9-Twitter-Catchy-Content/QA-REPORT-V9.0.md`.
- Mettre à jour Swagger si nouvelles routes (a priori non).
- PR + merge vers main.

### DoD V9.0
- ✅ `IdeasHub` montre 12 idées avec statut data réel.
- ✅ Le sélecteur d'aspect propose un "prime" par template.
- ✅ Les 4 palettes nommées sont commutables dans Studio.
- ✅ Build + tests verts.
- ✅ Aucun KPI inventé n'apparaît dans le DOM (NarrativeGrid v1 isolé derrière flag).

---

## 3. Sprint 2 — V9.1 NarrativeGrid v2 (8-10 j)

**Objectif :** livrer NarrativeGrid v2 conforme au TSD, avec Score réel + xG pour/contre + drop Moral.

### Pré-requis bloquant
- **Vérifier `v4.matches.home_xg/away_xg`** (ou table équivalente) → 0.5 j.
- Si data_gap : ouvrir une migration additive pour exposer le xG par match (sans drop, sans truncate, cf. `data-ingestion-standards.md`). Possiblement V9.1.5 si scope trop large pour ce sprint.

### Stories

#### V9.1-A — Contract + hook backend (1 j)
- Réécrire `contract.js` selon `narrative-grid-v2.md` § 3.
- Réécrire `useNarrativeBackend.js` : appel `getFixturesV4` + `getTeamSeasonXgV4`. Pas de stub.

#### V9.1-B — 3 sous-composants layout (3 j)
- `<NgVerticalStrip>` (9:16) — pile de cards.
- `<NgSquareGrid>` (1:1) — grille 5×2.
- `<NgHorizontalList>` (16:9) — colonne summary + liste.
- CSS isolé par layout.

#### V9.1-C — Switch d'aspect (0.5 j)
- `NarrativeGrid.jsx` route vers le bon layout selon `aspectRatio`.

#### V9.1-D — Demo + tests (1 j)
- Mettre à jour `demo.js` avec scores réels (Real Madrid 10 derniers, par ex.).
- Tests vitest : rendu 3 layouts + xG absent + < 4 matchs.

#### V9.1-E — IdeasHub integration (0.5 j)
- Mettre à jour les idées 04, 05 pour pointer NarrativeGrid v2.
- Retirer le KPI "Moral".

#### V9.1-F — QA + doc + merge (1 j)
- QA-Report avec captures pour 9:16 / 1:1 / 16:9.
- Test export PNG manuel × 3 aspects.
- Merge.

### DoD V9.1
- ✅ Aucun "0.5" ou "100" affiché à la place d'un score.
- ✅ Les KPIs `Possession` et `Moral (réseaux)` n'apparaissent plus dans le DOM.
- ✅ La ligne xG est présente uniquement si `xg.for` est non null.
- ✅ Vitest vert (au moins 8 nouveaux tests sur le template).

---

## 4. Sprint 3 — V9.2 Scatter goals vs xG (5-7 j)

**Objectif :** premier nouveau template V9, format prime 1:1.

### Stories

#### V9.2-A — Backend (0 j)
- Aucun service nouveau : `XgV4Service.getXgByCompetitionSeason` + `LeagueServiceV4.getTopScorers` suffisent.

#### V9.2-B — Composant Scatter (3 j)
- `frontend/src/components/v3/modules/studio/templates/ScatterXg/`.
- Axe X : `xg_for` saison ; axe Y : `goals_for` saison ; bulle = équipe (logo).
- Diagonale `y=x` pour matérialiser sur/sous-perf.
- Annotations top 3 sur-performeurs + 3 sous-performeurs.

#### V9.2-C — Tests + IdeasHub (1 j)
- Tests vitest (rendu, annotations, bornes).
- Idée IDEA-02 passe `partial → ready`.

#### V9.2-D — QA + doc + merge (1 j)
- QA-Report.
- Captures multi-ligues (PL, La Liga, Bundesliga).

### DoD V9.2
- ✅ Le scatter rend pour ≥ 3 ligues couvertes.
- ✅ Annotations lisibles sur 1080×1080.
- ✅ IdeasHub propose IDEA-02 en `ready`.

---

## 5. Sprint 4 — V9.3 Match Recap timeline (5-7 j)

**Objectif :** template post-match (timeline d'événements) — déclenchable par IDEA-08.

### Stories

#### V9.3-A — Backend (0.5 j)
- `MatchDetailV4Service.getFixtureEvents` déjà existant.
- Ajouter route si nécessaire (probable : déjà câblée en `getFixtureEventsV4`).

#### V9.3-B — Composant Match Recap (3 j)
- `frontend/src/components/v3/modules/studio/templates/MatchRecap/`.
- Header : score final, logos, kickoff.
- Body : ligne du temps des événements (1 ligne par minute), pictos goal / yellow / red / sub.
- Footer : possession (si dispo via `getFixtureTacticalStats`), xG total.

#### V9.3-C — Tests + IdeasHub (1 j)
- Tests vitest.
- IDEA-08 passe `partial → ready`.

#### V9.3-D — QA + doc + merge (1 j)
- QA-Report avec match réel récent.

### DoD V9.3
- ✅ Match recap rend tous les événements disponibles.
- ✅ Si `getFixtureTacticalStats` flanche, possession masquée plutôt qu'affichée à `0`.

---

## 6. Backlog V9.4+ (au-delà de 4 semaines)

| Ticket | Description | Pré-requis |
|---|---|---|
| **V9.4** | Line chart xG saison annoté | xG par match exposé (V9.1.5 ou ultérieur) |
| **V9.5** | Pizza / Radar joueur percentile | xG joueur exposé (atlas § 2.11) + endpoint percentile à câbler |
| **V9.6** | Hook text generator (génération du tweet à partir des données) | LLM ou règles |
| **V9.7** | Auto-suggestion canal (X / IG / TikTok) selon aspect | V9.0-B livré |
| **V9.8** | Player profile enrichi (photo, nationalité, age) | Import V47 enrichi |

---

## 7. Dépendances & risques

| Risque | Impact | Mitigation |
|---|---|---|
| `v4.matches.home_xg` absent | Bloque la ligne xG match-level dans NarrativeGrid v2 et IDEA-11 | Vérifier en V9.1 jour 1, ajouter migration additive si besoin |
| Couverture ML predictions incomplète (V44) | IDEA-03 affiche bloc proba vide trop souvent | Bien gérer l'état vide via `Promise.allSettled` (déjà OK V8.3-04) |
| Capacity dev (1 personne) | Un sprint glisse → cascade | Garder V9.4 hors scope du plan 4-sem ; V9.0-B et V9.1 sont prioritaires |
| Régression visuelle utilisateurs habitués v1 | Confusion lors du switch | Flag `?legacy=ng1` pendant 2 sprints |
| Sourcing logo manquant | Visuels publiés incomplets | Badge "logo manquant" rendu visible (V9.0-D) |

---

## 8. Cadence quotidienne

- **Lundi :** plan du sprint, créer les tâches dans `tasks/todo.md`.
- **Mardi-jeudi :** dev + tests.
- **Vendredi (matin) :** QA cross-aspect, captures, mise à jour des docs.
- **Vendredi (après-midi) :** merge + démo + retro courte.

---

## 9. Critères de succès V9 (fin du parcours)

À la fin de V9.0 + V9.1 + V9.2 + V9.3 :

- ✅ 0 KPI inventé / stub dans le DOM des templates publiables.
- ✅ Chaque template a un `primeAspect` documenté.
- ✅ IdeasHub : ≥ 10 idées en statut `ready`.
- ✅ 4 palettes officielles utilisables.
- ✅ NarrativeGrid v2 et 2 nouveaux templates (Scatter, Match Recap) livrés.
- ✅ Documentation V9 complète : `data-atlas`, `twitter-playbook`, `narrative-grid-v2`, `format-strategy`, `V8-AUDIT`, `ideas-v9-tsd`, `workflow`.
- ✅ Captures Twitter réelles (mock-up dans tweet drafts) validées avec un œil externe avant publication "live".

---

## 10. Suivi

Tickets V9 dans le tracker projet :
- #35 V9.0 Foundations (regroupe A→F).
- #38 V9.1 NarrativeGrid v2.
- *À créer :* V9.2 Scatter, V9.3 Match Recap.

Chaque ticket pointe vers ses sections dans ce dossier.

---

**Dernière mise à jour :** 2026-04-25.
