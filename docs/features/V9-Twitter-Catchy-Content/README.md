# V9 — Twitter Catchy Content

**Période :** mai-juin 2026 (4-6 semaines).

**Objectif :** transformer les templates V8 (jolis mais ignorés) en visuels Twitter qui *catch*, en branchant chaque idée sur la BDD V4 réelle (zéro invention) et en respectant les codes éprouvés de la data-foot sur X.

---

## Documents de ce dossier

Lire dans cet ordre :

1. [`V8-AUDIT.md`](./V8-AUDIT.md) — état des lieux : ce qui a été livré en V8.0→V8.3, ce qui marche, ce qui reste fragile.
2. [`twitter-playbook.md`](./twitter-playbook.md) — ce qui marche aujourd'hui sur Twitter foot data : comptes de référence, formats, hooks textuels, palettes, dimensions exactes.
3. [`data-atlas.md`](./data-atlas.md) — inventaire vérifié de ce que la BDD `v4.*` peut servir, par catégorie. Source de vérité pour toute idée.
4. [`narrative-grid-v2.md`](./narrative-grid-v2.md) — TSD de la refonte NarrativeGrid : Score réel + xG pour/contre + drop "Moral", 3 layouts format-aware.
5. [`format-strategy.md`](./format-strategy.md) — matrice template × aspect : quel format pour quel canal.
6. [`ideas-v9-tsd.md`](./ideas-v9-tsd.md) — refonte IdeasHub avec 12 idées branchées data, statut `ready`/`partial`/`blocked`.
7. [`workflow.md`](./workflow.md) — plan 4-6 semaines, sprints V9.0 → V9.3, DoD par story.

---

## Décisions clés

- **Zero invention :** chaque KPI affiché doit pointer vers une fonction de service V4. Sinon `data_gap` visible (pas masqué).
- **Format-aware :** chaque template = 1 aspect prime + 1-2 fallback. Plus de "tous les aspects pour tous les templates".
- **NarrativeGrid v1 → v2 :** retirer "Moral" et "Possession" stubs, splitter "xG diff" en xG pour / xG contre, afficher le score réel `2-1` au lieu de `100/0`.
- **IdeasHub :** chaque idée fournit un hook texte + un statut data + un bouton "Tester" pré-rempli sur une compétition réellement couverte.

---

## Statut V9 au 2026-04-25

- ✅ Documentation initiale écrite (ce dossier).
- ⏳ Implémentation : non commencée — démarrage prévu sem. 18.
