# V9 — Audit complet V8 (Content Templates)

**Mission :** Documenter ce qui a été livré durant V8.0 → V8.3 et ce qui reste fragile, comme base de départ pour V9.

**Période couverte :** mi-mars 2026 → 25 avril 2026.

---

## 1. Sous-versions livrées

| Tag | Périmètre | Statut |
|---|---|---|
| **V8.0** | TSD initial + 5 templates + infra `_shared` (TemplateFrame, themes, registry, validators) | ✅ livré |
| **V8.1 (hub)** | TSD addendum : 3 onglets ContentStudio (Studio match preview, TemplatesPlayground, IdeasHub) | ✅ livré |
| **V8.2 (Match Preview)** | Backend `MatchPreviewContentServiceV4` + Zod + route `/v4/match/:id` ; Template `MatchPreviewCard` ; UI `MatchPreviewStudio` (formulaire + preview live + export) | ✅ livré |
| **V8.3-01** | Intégration des 3 onglets dans `ContentStudioV3` | ✅ livré |
| **V8.3-03** | Port de `useFitScale` (fit-to-container) de `MatchPreviewStudio` vers `TemplatesPlayground` + extraction en module partagé `_shared/useFitScale.js` | ✅ livré |
| **V8.3-04** | Backend fix 500 : Zod relax (champs optionnels logos/standings) + `Promise.allSettled` pour ne pas échouer si une sous-requête flanche | ✅ livré |
| **V8.3-05** | RaceTrackerD3 envisagé puis annulé | ❌ supprimé (orientation V9) |

---

## 2. Inventaire fichiers livrés

### 2.1 Templates (frontend/src/components/v3/modules/studio/templates/)

```
templates/
├── _shared/
│   ├── TemplateFrame.jsx        # Wrapper commun (theme, fontPair, aspectRatio, scale)
│   ├── themes.js                # Définitions de palettes (red-alert, etc.)
│   ├── fontPairs.js             # Couples display/body
│   ├── validators.js            # assertValid(data, contract, name)
│   └── useFitScale.js           # ⭐ V8.3-03 — hook + ASPECT_DIMS partagés
├── DuoComparison/                # Template 1 — joueur vs joueur
├── MatchPreviewCard/             # Template V8.2 — preview avant-match
├── NarrativeGrid/                # Template 4 — heatmap saison (à refondre en v2)
├── PowerGrid/                    # Template 5 — classements / groupes
├── RaceTracker/                  # Template 3 — course / bar race
├── StatSupremacy/                # Template 2 — big-stat
├── TemplateRegistry.js           # Inventaire central
├── README.md                     # Guide de contribution
└── index.js                      # Exports publics
```

### 2.2 Studio modules

```
frontend/src/components/v3/modules/studio/
├── MatchPreviewStudio/           # Onglet 1 — formulaire + preview live
├── TemplatesPlayground/          # Onglet 2 — sandbox de templates
└── IdeasHub/                     # Onglet 3 — catalogue d'idées (à brancher data en V9)
```

### 2.3 Backend V4

```
backend/src/services/v4/MatchPreviewContentServiceV4.js     # 12 méthodes (cf. data-atlas.md § 2.1)
backend/src/services/v4/MatchPreviewContentServiceV4.test.js
backend/src/controllers/v4/leagueControllerV4.js            # Wiring topScorers/topAssists
backend/src/routes/v4/...                                   # Routes V4 montées
```

### 2.4 Documentation

```
docs/features/V8-Content-Templates/
├── technical-spec.md
└── technical-spec-v8.1-hub.md

docs/features/V8.2-MatchPreviewCard/
├── technical-spec.md
└── QA-REPORT.md
```

---

## 3. Decisions techniques notables

### 3.1 Architecture template
- **Contrat séparé** (`contract.js`) + **données démo** (`demo.js`) + **JSX** (`*.jsx`) + **CSS** isolé.
- **Validation runtime** via `assertValid(data, contract, name)` — fail-fast à la première donnée mal formée.
- **TemplateFrame** absorbe theme / fontPair / aspectRatio / accent / scale → composant feuille = pure render.

### 3.2 Fit-to-container pattern (V8.3-03)
- `useFitScale(wrapperRef, nativeW, nativeH)` mesure le wrapper via `ResizeObserver`, calcule `Math.min(width/nativeW, height/nativeH)`, applique `transform: scale()` sur un canvas natif.
- `ASPECT_DIMS` constants : `9:16 = 1080×1920`, `1:1 = 1080×1080`, `16:9 = 1920×1080`.
- Source de vérité unique réutilisée par `MatchPreviewStudio` ET `TemplatesPlayground`.

### 3.3 Resilience backend (V8.3-04)
- `MatchPreviewContentServiceV4.getMatchPreview()` utilise `Promise.allSettled` sur les sous-requêtes (form, h2h, xg, prediction, standings) → si l'une échoue, le payload partiel est servi avec `data_gap` flags plutôt qu'un 500 global.
- Schémas Zod relaxés sur les champs périphériques (logos, classements) pour ne pas bloquer un preview valide à 90 %.

### 3.4 Export
- PNG via `html-to-image` (option par défaut pour Twitter).
- WebM via Canvas MediaRecorder (animations) — peu utilisé en pratique.

---

## 4. Ce qui marche (validé en QA)

- Les 5 templates rendent en 9:16 / 1:1 / 16:9 sans warning console.
- Le formulaire `MatchPreviewStudio` propose les ligues / saisons / matchs depuis V4 et préviewe en live.
- L'export PNG produit un fichier 1080×1920 (ou natif) propre.
- Le hub `ContentStudioV3` route correctement vers les 3 onglets.
- La suite `vitest` passe (47 tests verts au dernier point V8.3-03, build vite OK).

---

## 5. Ce qui ne marche pas (dette V9)

### 5.1 NarrativeGrid v1 — sémantique brisée
- `Math.round(intensity * 100)` affiche `100` pour une victoire — ressemble à un score.
- KPIs `xG diff`, `Possession`, `Moral (réseaux)` **hard-codés à 0.5** dans `useNarrativeBackend.js:64-68`.
- Voir `narrative-grid-v2.md` pour le fix.

### 5.2 IdeasHub — catalogue d'idées non branché data
- Les idées listées sont des concepts statiques.
- Aucune ne vérifie si la compétition / saison cible a effectivement les données nécessaires.
- Voir `ideas-v9-tsd.md` pour la refonte.

### 5.3 Format-blind UI
- Le sélecteur d'aspect propose les 3 aspects pour tous les templates uniformément.
- L'utilisateur peut exporter un `RaceTracker` en 9:16 → résultat illisible.
- Voir `format-strategy.md` pour le fix.

### 5.4 Couleurs / typographie convergentes
- Plusieurs templates utilisent des palettes proches.
- La règle `visual-manifesto.md` "varier la police par feature" n'est pas appliquée systématiquement.

### 5.5 Pas de "hook texte" dans IdeasHub
- Une idée Twitter = visuel + tweet text. On n'a fourni que le visuel.

### 5.6 Logos manquants traités en silence
- Quand un club n'a pas de logo en `v4.club_logos`, on tombe sur `DEFAULT_LOGO` (silhouette grise) sans avertir l'utilisateur. Risque de publication d'une image incomplète.

---

## 6. Métriques V8

- **Templates livrés :** 5 + 1 (MatchPreviewCard) = 6.
- **Aspects supportés :** 3 par template = 18 combinaisons.
- **Lignes de code (estimation) :** ~3 800 frontend + ~900 backend (services + tests).
- **Couverture tests :** 47 tests vitest verts (front), tests `MatchPreviewContentServiceV4.test.js` côté back.
- **Endpoints V4 utilisés :** 4 (`/v4/match/:id`, `/v4/league/:id/season/:y`, `/v4/league/:id/season/:y/fixtures`, `/v4/league/:id/season/:y/team-xg`).

---

## 7. Reco continuité V9

Voir le calendrier détaillé dans `workflow.md`. Vue rapide :

1. **Stop the bleed :** retirer NarrativeGrid v1 du hub par défaut, exposer derrière flag `?legacy=1`.
2. **Foundations :** écrire `narrative-grid-v2`, étendre `TemplateRegistry` avec `aspectsSupported`, refondre `IdeasHub` pour qu'il vérifie la couverture data avant de proposer.
3. **New formats :** ajouter pizza/percentile (joueur vs ligue), scatter goals/xG, line chart annoté.
4. **Design refresh :** déclarer 4 palettes officielles (cf. `twitter-playbook.md` § 5) et mapper chaque template à une palette prime.

---

## 8. Sources & validations

- Inspection directe des fichiers listés § 2.
- `git log --oneline -30` (commits récents).
- Tâches archivées (#1 → #32) dans le tracker — uniquement V8 marquées completed.
- TSD V8.0, V8.1, V8.2 lus.

**Dernière mise à jour :** 2026-04-25.
