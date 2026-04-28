---
name: infographic-studio
description: "Studio d'infographies football pour le projet ninetyXI. Pipeline complet : scraping des trends X.com → suggestion d'infographies basées sur templates → génération via formulaire générique → rendu multi-styles (preview React live + export PNG Puppeteer) → brouillons de tweets prévisualisables et publiables manuellement. À déclencher dès que l'utilisateur parle d'infographie, de visuel pour Twitter/X, de comparatif joueurs/clubs, de recap de match, de top scorers, de classement, de trend football, de template visuel, de planification de tweet, ou demande à créer/réutiliser/exposer un visuel à partir des données BDD ninetyXI. Toute donnée affichée dans une infographie provient EXCLUSIVEMENT de la BDD v4.* — jamais de mock, jamais inventée. Si une donnée manque, l'afficher comme manquante dans l'UI."
---

# Infographic Studio — Pipeline visuel ninetyXI → X.com

Ce skill est un **guide pédagogique**. Il ne livre pas de code clé-en-main : il décrit l'architecture, les contrats, et la séquence d'implémentation pour que Claude code le module **étape par étape avec validation utilisateur**.

> **Posture** : avant chaque étape, lire la `references/` correspondante, présenter le diff prévu, attendre l'OK utilisateur. C'est un pipeline complexe — pas de "big bang".

---

## When to use

Déclencher ce skill quand l'utilisateur :
- Mentionne **infographie**, **visuel**, **post X/Twitter**, **comparatif joueurs**, **recap match**, **top scorers**, **classement visuel**
- Demande à **scraper les trends football** sur X.com
- Veut **créer un nouveau template** d'infographie ou **réutiliser un template existant**
- Demande à **planifier des tweets** ou à **générer des brouillons**
- Cite le mot **"studio"** dans un contexte visuel (la route prévue est `/studio/infographics`)

---

## Règle absolue — No Mock, No Hallucination

**Toute donnée affichée dans une infographie sort de la BDD `v4.*`.** Pas d'exception.

- ❌ Pas de chiffre inventé pour "remplir" un visuel pendant le dev
- ❌ Pas de fallback hardcodé (`stats.goals ?? 25`) dans un template — utiliser un composant `<MissingDataBadge />`
- ❌ Pas de `MOCK_PLAYER` ou de `seedData()` dans le code livré (acceptable seulement dans `*.test.js` mockés via `vi.mock()`)
- ✅ Si une donnée manque (joueur sans stats sur la saison demandée, par exemple), l'UI affiche **explicitement** "Donnée non disponible" + le contexte (`xG manquant pour Mbappé sur saison 2025-26`)
- ✅ L'export PNG n'est **bloqué** tant que des champs critiques du template sont manquants — l'utilisateur doit confirmer "publier malgré la donnée incomplète"

**Détails et patterns d'implémentation** : `references/data-contract.md`.

---

## Architecture — Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                                   │
│  /studio/infographics                                               │
│   ├── TrendsPanelV4         → trends X.com football (auto-refresh)  │
│   ├── TemplateGalleryV4     → templates JSON disponibles            │
│   ├── FormBuilderV4         → formulaire dynamique (selon template) │
│   ├── InfographicPreviewV4  → rendu live (DS tokens + Visual Manif.)│
│   ├── StyleVariantSwitcher  → 3 styles min. par template            │
│   └── TweetDraftPanelV4     → brouillon → save → planifier → publier│
│                                                                     │
│  ↕                                                                  │
│                                                                     │
│  BACKEND (V4 pattern)                                               │
│  /api/v4/studio/                                                    │
│   ├── /trends      GET  → lit v4.x_trends                           │
│   ├── /templates   GET  → liste les templates JSON du repo          │
│   ├── /infographic POST → résout les données BDD (ne crée RIEN)     │
│   ├── /export      POST → Puppeteer screenshot → PNG                │
│   └── /tweets      CRUD → v4.scheduled_tweets (brouillons)          │
│                                                                     │
│  ↕                                                                  │
│                                                                     │
│  SCRAPER (Python + Playwright)                                      │
│  scripts/run-trends-scraper.py                                      │
│   └── Playwright → x.com/explore/tabs/sports → JSON → DB            │
│                                                                     │
│  ↕                                                                  │
│                                                                     │
│  DB (PostgreSQL v4.*)                                               │
│   ├── v4.x_trends           (trends scrapées, TTL 24h)              │
│   ├── v4.scheduled_tweets   (brouillons + visuels associés)         │
│   └── (lecture seule)  v4.matches, v4.match_stats, v4.people, ...   │
│                                                                     │
│  TEMPLATES (versionnés dans le repo)                                │
│  frontend/src/infographic-templates/*.json                          │
│  + frontend/src/components/v4/infographic/templates/*.jsx           │
└─────────────────────────────────────────────────────────────────────┘
```

Détails techniques par couche : `references/architecture.md`.

---

## Workflow d'implémentation (parcours validé)

Quand l'utilisateur lance le skill, suivre **dans l'ordre** ce parcours. Chaque phase produit un artefact validé avant de passer à la suivante.

### Phase 0 — Cadrage (toujours en premier)

1. Si les skills suivants existent dans l'environnement, les charger en complément (sinon, appliquer les patterns décrits dans les `references/` de ce skill) :
   - `quality-gate` ← orchestrateur qualité
   - `frontend-design` ← pour les Phases 4+
   - `qa-automation` ← pour les tests à chaque phase
2. Lire les rules projet si présentes : `data-ingestion-standards.md`, `visual-manifesto.md`, `ai-cognition.md`
3. Si `quality-gate` est dispo, créer `tasks/todo.md` à son format. Sinon, un simple checklist Markdown suffit.
4. Confirmer avec l'utilisateur **quel sous-pipeline** on attaque (scraper / templates / rendu / tweets) — ne jamais tout faire d'un coup

### Phase 1 — Scraper trends X.com

Cible : remplir `v4.x_trends` à partir de `x.com/explore/tabs/sports`.

- Lire `references/trends-scraper.md` (architecture détaillée des 3 scripts, sélecteurs DOM, format JSON intermédiaire, marqueurs d'idempotence)
- Pattern à 3 scripts (séparation stricte des responsabilités) :
  - `scrape-x-trends.py` ← Playwright headless, dump JSON, **aucune** connexion DB
  - `update-x-trends.js` ← writer Node, valide via Zod, upsert avec dédup business key `(trend_label, captured_at::date)`
  - `run-trends-scraper.py` ← orchestrateur, échec atomique
  - `verify-trends-run.py` ← rapport d'état avant/après (optionnel mais recommandé)
- Migration DB pour `v4.x_trends` (naming `YYYYMMDD_NN_V4_X_Trends.js`)
- Tests : dry-run obligatoire avant écriture DB

### Phase 2 — Système de templates

Cible : permettre de définir un template d'infographie (form schema + composant React de rendu).

- Lire `references/template-spec.md`
- Créer le dossier `frontend/src/infographic-templates/` avec les fichiers JSON (un par template)
- Créer le dossier `frontend/src/components/v4/infographic/templates/` (un .jsx par template, props strictement typées Zod)
- Premier template livré : `player-comparison.json` (ex: Mbappé vs Haaland) — sert de référence
- Endpoint `GET /api/v4/studio/templates` qui scanne le dossier et renvoie la liste

### Phase 3 — Resolver de données (cœur anti-hallucination)

Cible : à partir d'un template + paramètres de formulaire, **résoudre** les données BDD nécessaires.

- Lire `references/data-contract.md` (section "Resolver Pattern")
- Service `InfographicResolverServiceV4` qui prend `(templateId, formValues)` et renvoie `{ resolved: {...}, missing: [...] }`
- Le resolver **lit uniquement** la DB (pas d'écriture). Il appelle `db.get`/`db.all` avec parameterized queries
- Chaque champ manquant remonte dans `missing[]` avec un libellé humain (pas une stack trace SQL)

### Phase 4 — Rendu (preview live + export PNG)

Cible : afficher l'infographie dans `/studio/infographics` et permettre l'export PNG.

- Lire `references/render-pipeline.md`
- Composant `InfographicPreviewV4` qui mappe `(template + resolvedData) → JSX` en utilisant les ds-tokens
- 3 variants de style minimum par template (ex: dark observatory / editorial sports / tactical board — voir Visual Manifesto)
- Chaque champ `missing[]` est rendu via `<MissingDataBadge />` du Design System (à créer s'il n'existe pas — vérifier d'abord dans `frontend/src/design-system/components/`)
- Endpoint `POST /api/v4/studio/export` qui lance Puppeteer headless, navigue vers `/studio/infographics/preview/:id?format=png`, fait `page.screenshot()` à 2x DPI (timeout strict 30s), renvoie le PNG en stream

### Phase 5 — Tweet drafts + planification

Cible : sauvegarder un brouillon de tweet (texte + visuel exporté + date prévue) et le publier manuellement depuis l'UI.

- Lire `references/tweet-publishing.md`
- Migration `v4.scheduled_tweets` (FK vers le PNG stocké, statut: `draft|scheduled|posted|cancelled`)
- UI `TweetDraftPanelV4` qui liste les brouillons par statut, permet d'éditer le texte, prévisualise le visuel, ouvre `web intent X.com` (`https://x.com/intent/post?text=...`) — la publication reste **100% manuelle** côté utilisateur
- Pas de cron, pas d'API X côté écriture — c'est l'utilisateur qui clique "Ouvrir dans X" au moment voulu

---

## Articulation avec d'autres skills (si présents dans le projet)

Ce skill est conçu pour fonctionner **seul** : tout ce dont il a besoin pour être implémenté correctement est dans `references/`. Mais il s'appuie naturellement sur des skills tiers s'ils sont disponibles dans l'environnement. Vérifier leur présence avant de les invoquer ; sinon appliquer les patterns décrits dans les références.

| Phase | Skill recommandé si disponible | Fallback si absent |
|-------|--------------------------------|--------------------|
| Toutes les phases | `quality-gate` | Checklist Markdown manuelle, QA-REPORT en fin de phase |
| Phase 1, 5 (migrations DB) | `database/migration-script` | Naming `YYYYMMDD_NN_V4_*.js`, registry à jour, voir `references/architecture.md` |
| Phase 1, 3, 5 (insert/upsert) | rule `data-ingestion-standards.md` | Zod first, business keys, transactions, parameterized queries |
| Phase 3 (validation Zod) | `backend/input-validation` | Schémas Zod inline dans le service V4 |
| Phase 4 (composants UI) | `frontend-design` + rule `visual-manifesto.md` | DS tokens uniquement, jamais de couleur en dur, 3 variants par template |
| Phase 4 (sécu render) | `security/xss-prevention` | Échappement de tout texte utilisateur avant injection dans un SVG |
| Toutes (tests) | `qa-automation` | Tests unitaires Vitest + un test d'intégration par endpoint, dry-run avant tout run réel |
| Avant gros template | `technical-specification` | Mini-TSD en Markdown avant de coder |

Ne **pas** dépendre de ces skills pour fonctionner. Si un skill nommé n'existe pas, le mentionner brièvement à l'utilisateur et appliquer le fallback.

---

## Hard rules de ce skill

1. **No Mock, No Hallucination** — toute donnée vient de `v4.*`. Test = `vi.mock()` uniquement, jamais de seed dans le code livré.
2. **Manque de donnée = visible** — `<MissingDataBadge />` rendu, jamais `null` silencieux ni fallback hardcodé.
3. **Templates immuables en runtime** — la définition d'un template (JSON + JSX) vit dans le repo, pas en DB. La DB ne stocke que les *instances* (brouillons de tweets pointant vers un templateId + formValues).
4. **Publication X = manuelle** — pas de poste auto. Web intent ou copier-coller, point final.
5. **Aucune écriture DB côté resolver** — le resolver de données est read-only. Toute écriture passe par les services dédiés (`TrendsServiceV4`, `TweetDraftServiceV4`).
6. **Suivre le V4 pattern** — controller V4 + service V4 + Zod + logger pino + response wrapper `{ success, data | error }`. Voir `.claude/CLAUDE.md` § V4 Route Pattern si présent.
7. **Design System d'abord** — avant de créer un composant, `ls frontend/src/design-system/components/` et grep des composants existants.

---

## NEVER LIST

- ❌ Hardcoder un score, un nom, une stat dans un template "pour faire propre" en attendant la vraie donnée
- ❌ Stocker la définition d'un template en DB (seules les *instances* y vont)
- ❌ Publier sur X automatiquement (pas d'API write — l'utilisateur clique)
- ❌ Faire confiance aux données scrapées de X sans timestamp + dédup par business key (`(trend_label, captured_at::date)`)
- ❌ Lancer Puppeteer sans timeout strict (max 30s) — sinon DoS du backend
- ❌ Tout livrer en un seul commit — chaque phase = sa propre US + son rapport de tests
- ❌ Sauter la validation utilisateur entre deux phases — ce skill suit explicitement un workflow incrémental

---

## Points d'entrée par fichier référence

- `references/architecture.md` — DB schema détaillé, endpoints V4, structure des dossiers, scripts du scraper
- `references/data-contract.md` — règle no-mock + resolver pattern + missing data UX
- `references/template-spec.md` — format JSON d'un template, lifecycle, premier exemple
- `references/trends-scraper.md` — Playwright X.com, dédup, marqueurs idempotence, format JSON intermédiaire
- `references/render-pipeline.md` — preview React + export Puppeteer + variants de style
- `references/tweet-publishing.md` — brouillons DB + UI manuelle + web intent X
