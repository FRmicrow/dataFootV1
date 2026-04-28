# QA Report — V48 Studio Infographics · Phase 2 — Système de templates

> **Status:** ✅ Phase 2 complete — prête pour Phase 3 (resolver)
> **Author:** QA Engineer (rôle assumé)
> **Date:** 2026-04-28
> **Reference:** `docs/features/V48-Studio-Infographics-Phase2-Templates/technical-spec.md`
> **Précédent:** V47 Phase 1 (`docs/features/V47-Studio-Infographics-Phase1-Trends/QA-REPORT.md`)

---

## 1. Sommaire exécutif

V48 livre **l'infrastructure de templates** : format JSON validé Zod, premier manifest et composant React (`player-comparison`), 3 variants de style, badge DS pour la donnée manquante, endpoints backend lecture seule. Le pattern est éprouvé et prêt à recevoir le resolver en Phase 3 — toute donnée affichée passera désormais par le contrat anti-hallucination `{ resolved, missing }` du composant.

Pas de code utilisateur encore : la page Studio (`/studio/infographics`) arrive en Phase 4. Pour l'instant on peut requêter `GET /api/v4/studio/templates` et obtenir la liste des manifests disponibles.

---

## 2. Périmètre livré

### Frontend

| US | Fichier(s) | Rôle |
|---|---|---|
| US1 | `frontend/src/infographic-templates/_schema.js` | Zod `TemplateManifestSchema` + `toManifestSummary` |
| US1 | `frontend/src/infographic-templates/_registry.js` | Auto-discover via `import.meta.glob`, validation au boot, exports `listManifests/listSummaries/getManifest/getRegistryErrors` |
| US1 | `frontend/src/infographic-templates/player-comparison.json` | Premier manifest référence |
| US2 | `frontend/src/design-system/components/MissingDataBadge.jsx` + `.css` + `.stories.jsx` | Composant DS, 2 severity (`critical`/`optional`) |
| US3 | `frontend/src/components/v4/infographic/templates/PlayerComparisonTemplate.jsx` + `.css` | Template 1200×675 + 3 variants thématiques |
| US3 | `frontend/index.html` | Préchargement Google Fonts DM Sans + Outfit (Space Grotesk déjà présent) |
| US1 | `frontend/package.json` | Ajout dep `zod@4.3.6` (déjà présente côté backend) |

### Backend

| US | Fichier(s) | Rôle |
|---|---|---|
| US4 | `backend/src/services/v4/InfographicTemplateServiceV4.js` | Lit `frontend/src/infographic-templates/*.json`, valide via Zod (schéma importé du frontend), cache en mémoire, expose `listSummaries/getManifest/getLoadErrors/_resetCache` |
| US4 | `backend/src/controllers/v4/infographicTemplateControllerV4.js` | `listTemplates` (200), `getTemplate` (200/400/404/500). Validation Zod du paramètre `id`. |
| US4 | `backend/src/routes/v4/studio_routes.js` | Routeur Express, monte `GET /templates` et `GET /templates/:id` |
| US4 | `backend/src/routes/v4/v4_routes.js` (modifié) | Mount `studioRoutesV4` sous `/v4/studio` |
| US5 | `.claude/project-architecture/backend-swagger.yaml` (modifié) | Tag `V4 Studio` + 2 endpoints documentés (paths +2 → 108 total) |

### Tests

| Fichier | Tests |
|---|---|
| `frontend/src/infographic-templates/_schema.test.js` | 16 |
| `frontend/src/infographic-templates/_registry.test.js` | 6 |
| `frontend/src/design-system/components/MissingDataBadge.test.jsx` | 7 |
| `frontend/src/components/v4/infographic/templates/PlayerComparisonTemplate.test.jsx` | 14 |
| `backend/src/services/v4/InfographicTemplateServiceV4.test.js` | 6 |
| `backend/src/controllers/v4/infographicTemplateControllerV4.test.js` | 7 |
| **Total V48** | **56** |

---

## 3. Couverture des scénarios (TSD §7)

### 3.1 Schéma manifest (US1)

| # | Scénario | Statut |
|---|---|---|
| F1 | Manifest player-comparison valide | ✅ |
| F2 | id non kebab-case (PascalCase / snake_case) → reject | ✅ |
| F3 | < 3 variants → reject | ✅ |
| F4 | Duplicate variant id → reject | ✅ |
| F5 | Duplicate field id → reject | ✅ |
| F6 | enum sans enumValues → reject | ✅ |
| F7 | Tous les manifests du dossier valident (registry boot OK) | ✅ |
| F-extra | Variant id non kebab → reject | ✅ |
| F-extra | Form fields vide → reject | ✅ |
| F-extra | Field type inconnu → reject | ✅ |
| F-extra | outputDimensions format ≠ png → reject | ✅ |
| F-extra | dpr > 3 → reject | ✅ |
| F-extra | Thumbnail sans `/static/` → reject | ✅ |
| F-extra | toManifestSummary strip les champs lourds | ✅ |
| F-extra | Manifests frozen (immutables) | ✅ |
| F-extra | Registry hit cache (référence stable) | ✅ |

### 3.2 MissingDataBadge (US2)

| # | Scénario | Statut |
|---|---|---|
| F8 | severity=critical → variant Badge danger + icône ⚠ + texte "Donnée requise" | ✅ |
| F9 | severity=optional → variant Badge neutral + icône ℹ + texte "Optionnel" | ✅ |
| F-extra | Default severity = optional | ✅ |
| F-extra | Severity invalide → fallback graceful sur optional | ✅ |
| F-extra | className custom préservée à côté de `ds-missing-badge` | ✅ |
| F-extra | size prop respectée sur le Badge inner | ✅ |
| F-extra | Icône et séparateur `aria-hidden` | ✅ |

### 3.3 PlayerComparisonTemplate (US3)

| # | Scénario | Statut |
|---|---|---|
| F10 | Rendu happy : 2 noms, 2 clubs, season header, 8 stat rows, 2 photos | ✅ |
| F10 | xG formaté à 2 décimales (28.42 / 26.11) | ✅ |
| F10 | Aucun MissingDataBadge si data complète | ✅ |
| F11 | xG dans missing[] critical → MissingDataBadge danger + label humain visible | ✅ |
| F11 | photo manquante → `pct-photo--missing` + badge | ✅ |
| F11 | null value SANS missing[] entry → badge rendu quand même (sécurité) | ✅ |
| F11 | season=null → MissingDataBadge "Saison" critical | ✅ |
| F11 | resolved entièrement absent → ≥8 badges rendus, pas de crash | ✅ |
| F12 | Les 3 variants appliquent leur classe theme (`template-theme--<id>`) | ✅ |
| F12 | data-style-variant attribut posé | ✅ |
| F12 | Variant invalide → fallback sur dark-observatory | ✅ |

### 3.4 Backend service (US4)

| # | Scénario | Statut |
|---|---|---|
| B1 | listSummaries retourne au moins le player-comparison | ✅ |
| B2 | getManifest('player-comparison') retourne le manifest complet frozen | ✅ |
| B3 | getManifest('inexistant') retourne null | ✅ |
| B-extra | Summaries sans form/resolverContract/outputDimensions | ✅ |
| B-extra | getLoadErrors vide quand tout valide | ✅ |
| B-extra | Cache hit (référence stable entre 2 calls) | ✅ |

### 3.5 Backend controller (US4)

| # | Scénario | Statut |
|---|---|---|
| B5 | GET /templates → 200 + `{ success: true, data: [...] }` | ✅ |
| B6 | GET /templates/:id existant → 200 + manifest | ✅ |
| B7 | GET /templates/:id inexistant → 404 + `{ error: "template_not_found" }` | ✅ |
| B8 | GET /templates/:id format invalide (uppercase) → 400 + `{ error: "bad_request" }` | ✅ |
| B-extra | id avec point → 400 (validation Zod stricte) | ✅ |
| B-extra | service.getManifest throw → 500 + `{ error: "internal_error" }` | ✅ |
| B-extra | service.listSummaries throw → 500 | ✅ |

---

## 4. Métriques de tests

| Suite | Total | Pass | Fail | Statut V48 |
|---|---|---|---|---|
| Frontend Vitest | 105 | 88 | 17 | 0 régression V48 |
| Backend Vitest  | 81  | 71 | 10 | 0 régression V48 |
| **Nouveaux V48 (front+back)** | **56** | **56** | **0** | ✅ |

### Détail des échecs pré-existants (rappel)

**Backend (10) — TOUS antérieurs à V48 :**
- 9 dans `tests/flashscore-scraper.test.js` (intégration DB-required, déjà documentés en V47)
- 1 dans `src/services/v4/ResolutionServiceV4.test.js` (fichier untracked, créé le 27/04 23:14, drift entre service et test ; V48 a démarré le 28/04 00:24)

**Frontend (17) — TOUS antérieurs à V48 :**
- 7 dans `src/components/v3/modules/studio/templates/NarrativeGrid/NarrativeGrid.test.jsx` (fichier untracked du 27/04 18:10)
- 10 dans `src/components/v3/modules/studio/templates/NarrativeGrid/useNarrativeBackend.test.js` (même origine)

---

## 5. Anti-hallucination — checklist

| Règle | Statut |
|---|---|
| Aucun `??` ou `\|\|` qui pose un fallback de valeur métier dans `PlayerComparisonTemplate.jsx` | ✅ vérifié à la lecture |
| Aucune valeur hex/rgb hardcodée dans `PlayerComparisonTemplate.css` (seul `#0a0a0a` pour le texte sur le badge accent vert tactique — pas une donnée métier) | ⚠ noter pour Phase 4 polish |
| `MissingDataBadge` rendu en lieu et place de toute donnée absente (jamais "0", "—" ou string vide) | ✅ |
| Aucun mock ou seed dans le code livré (uniquement dans `*.test.{js,jsx}` via `vi.mock()`) | ✅ |
| Resolver pas encore implémenté → aucun risque d'accès DB côté template | ✅ |
| Manifests immuables (frozen au boot) | ✅ |

---

## 6. API Contract

### 6.1 GET /api/v4/studio/templates (vérifié par tests B5)

```json
{
  "success": true,
  "data": [
    {
      "id": "player-comparison",
      "version": 1,
      "name": "Comparatif joueurs",
      "description": "Comparaison de deux joueurs sur une saison...",
      "category": "player",
      "thumbnail": "/static/templates/player-comparison-thumb.png",
      "styleVariantIds": ["dark-observatory", "editorial", "tactical"]
    }
  ]
}
```

### 6.2 GET /api/v4/studio/templates/:id (vérifié par tests B6/B7/B8)

- 200 → manifest complet (validé Zod, frozen)
- 400 → format id invalide
- 404 → template inconnu
- 500 → erreur de chargement / validation Zod

Tous les patterns sont documentés dans `backend-swagger.yaml`.

---

## 7. Décisions techniques figées

| Décision | Choix retenu |
|---|---|
| Localisation des manifests | `frontend/src/infographic-templates/` — single source of truth, backend lit via FS path relatif |
| Schéma Zod | Importé directement du frontend par le backend (`../../../../frontend/src/infographic-templates/_schema.js`). Pas de duplication, drift impossible. |
| Variants livrés | 3 d'un coup (`dark-observatory`, `editorial`, `tactical`) |
| Polices d'affichage | DM Sans + Outfit + Space Grotesk via Google Fonts préchargées dans `index.html` |
| Format /templates | Résumé (sans form/resolverContract/outputDimensions) ; détail via `/templates/:id` |
| MissingDataBadge | 2 severity (`critical`/`optional`), s'appuie sur `Badge` DS existant (variants `danger`/`neutral`) |
| Cache backend | In-memory, rebuild au reboot — templates = config statique, pas de runtime mutation |

---

## 8. Risques résiduels & follow-ups

| # | Risque | Plan |
|---|---|---|
| R1 | Polish visuel des 3 variants pas validé visuellement | Validation à l'œil = Phase 4 (page Studio + preview live). Tests F12 garantissent juste que les classes sont appliquées. |
| R2 | Template ne peut pas être rendu avec de la vraie donnée | Phase 3 = resolver. Le contrat de props `{ resolved, missing }` est figé et exercé par les tests. |
| R3 | Une seule couleur hardcodée subsiste : `#0a0a0a` sur le badge accent du variant tactical | Pas une donnée métier (texte sur un fond accent vert), à remplacer par un token DS si on veut être 100% propre en Phase 4. Noté. |
| R4 | Pas encore de `staticFiles` middleware pour servir `/static/templates/*-thumb.png` | Hors scope V48. À ajouter en Phase 4 quand la galerie sera réelle. |
| R5 | `import.meta.glob('./*.json', { eager: true })` requiert Vite | OK — frontend déjà sur Vite. À noter si on devait migrer le bundler. |

---

## 9. Sign-off

| Rôle | Item | Statut |
|---|---|---|
| Product Architect | TSD complet et 5 points de sign-off validés | ✅ |
| Frontend Engineer | US1, US2, US3 livrées | ✅ |
| Backend Engineer | US4 livrée + Swagger US5 | ✅ |
| QA Engineer | 56 nouveaux tests verts, zéro régression V48 | ✅ |
| Visual Manifesto | Tokens DS uniquement, 3 variants distincts, polices distinctives | ✅ (validation à l'œil = Phase 4) |
| Anti-hallucination | Resolver pas encore appelé mais contrat de props préparé pour Phase 3 | ✅ |

**Phase 2 prête au merge** dès que tu auras validé la procédure §10 sur ta machine.

---

## 10. Procédure de validation utilisateur

```bash
# 1. Frontend tests
cd "/Users/domp6/Projet Dev/NinetyXI/dataFootV1/frontend"
npm test -- --reporter=basic
# Doit montrer ≥88 passing, les 17 fails sont pré-existants (NarrativeGrid)

# 2. Backend tests
cd "/Users/domp6/Projet Dev/NinetyXI/dataFootV1/backend"
npm test -- --reporter=basic
# Doit montrer ≥71 passing, 10 fails pré-existants (flashscore + ResolutionServiceV4)

# 3. Smoke API (backend tournant)
cd "/Users/domp6/Projet Dev/NinetyXI/dataFootV1/backend"
npm run dev &  # ou ton flow habituel
curl -s http://localhost:3001/api/v4/studio/templates | jq .
# → { success: true, data: [{ id: "player-comparison", ... }] }

curl -s http://localhost:3001/api/v4/studio/templates/player-comparison | jq '.data.outputDimensions'
# → { "width": 1200, "height": 675, "format": "png", "dpr": 2 }

curl -s -w "%{http_code}\n" -o /dev/null http://localhost:3001/api/v4/studio/templates/INVALID
# → 400

curl -s -w "%{http_code}\n" -o /dev/null http://localhost:3001/api/v4/studio/templates/totally-fake
# → 404
```

Une fois validé, on peut attaquer **Phase 3 — Resolver de données** (cœur anti-hallucination, transforme `(templateId, formValues)` en `{ resolved, missing }` avec lectures `v4.*`).

---

## 11. Suite — vers Phase 3

Phase 3 = `InfographicResolverServiceV4` qui implémente le pattern `references/data-contract.md`. À livrer :
- `backend/src/services/v4/InfographicResolverServiceV4.js` avec `resolvePlayerComparison(formValues)`
- Endpoint `POST /api/v4/studio/resolve` avec body `{ templateId, formValues }`
- Schémas Zod pour les `formValues` de chaque template (form-picker types → BIGINT/string)
- Tests unitaires : data complète, photo manquante, stats manquantes, joueur inexistant (404)

Le contrat `{ resolved, missing }` que produit le resolver est déjà la shape attendue par `PlayerComparisonTemplate` (cf. tests F11). Phase 4 raccordera les deux dans la page UI.
