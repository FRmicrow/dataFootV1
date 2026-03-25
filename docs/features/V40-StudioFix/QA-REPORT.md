# QA Report — V40-StudioFix

**Date** : 2026-03-25
**Branche** : `feature/V40-StudioFix`
**Auteur QA** : Claude (automated)

---

## 1. Résumé

V40 corrige des bugs critiques du Studio Wizard et fusionne les 4 étapes en 2 étapes simplifiées :
- **Step 1** — Data & Config (sélection données + type de chart + vitesse)
- **Step 2** — Preview & Export (lecture + export multi-format)

## 2. Tests automatisés

| Suite | Fichiers | Tests | Résultat |
|-------|----------|-------|----------|
| Backend (Vitest) | 14 | 110 | **PASS** |
| Frontend (Vitest) | 3 | 20 | **PASS** |
| **Total** | **17** | **130** | **PASS** |

Aucun test en échec, aucune régression détectée.

## 3. Bugs corrigés

| Bug | Cause racine | Fix |
|-----|-------------|-----|
| Recherche joueurs ("messi" → K.Damessi) | `LIKE` case-sensitive au lieu de `ILIKE` | Reprise du pattern SearchRepository (ILIKE, word boundaries, scout_rank) |
| NaN dans les charts | `getTime()` ne gérait pas `frame.year` | Ajout `frame.year ??` dans BarChartRace et LineChartRace |
| Données ne s'affichent pas | `rank` manquant dans les records timeline | Ajout `.map((r, idx) => ({ ...r, rank: idx + 1 }))` dans queryStudioData |
| Bump chart cassé après merge steps | `handleLeagueRankings` écrasait `visual.type` vers `league_race` | Suppression du `setVisual` override — le type sélectionné par l'utilisateur est respecté |
| Stepper boutons qui se chevauchent | `margin: 0 -40px` sur `.step-line` + `width: 140px` fixe | Réécriture CSS avec `gap`, padding-based layout |
| Vitesse d'export ignorée | `speed={1.0}` hardcodé | Utilisation de `speed={visual.speed}` |

## 4. Améliorations UX

| Changement | Détail |
|-----------|--------|
| Wizard 4→2 étapes | Fusion Step1+Step2 (Data & Config) et Step3+Step4 (Preview & Export) |
| Sélection type données | Tabs scroller → boutons simples (Players, League, Country, Club, Standings) |
| Cumulative toujours actif | Checkbox supprimé, `options: { cumulative: true }` hardcodé |
| Export multi-format | Sélection 9:16, 1:1, 16:9 avec export séquentiel |
| Preview indépendante | Play/Pause/Restart sans forcer l'export |
| Bouton "New" | Visible à step 2 pour reset du wizard |

## 5. Code Review

| Sévérité | Issue | Fix |
|----------|-------|-----|
| Critique | `style={{...}}` inline dans Step3_PreviewExport.jsx | Remplacé par classes CSS `.canvas-wrapper-preview`, `.back-btn-narrow` |
| Important | `isBump` manquant dans dependency array (LineChartRace) | Ajouté à `[data, barCount, leagueLogo, isBump]` |
| Important | `chartExtraProps` recalculé à chaque render | Wrappé avec `useMemo` |
| Mineur | `aria-label` manquants sur boutons playback | Ajouté `aria-label="Restart"`, `aria-label={isPlaying ? 'Pause' : 'Play'}` |

## 6. Audit Sécurité

| Sévérité | Issue | Statut |
|----------|-------|--------|
| Faux positif | SQL injection sur `stat` interpolation | Whitelist `allowedStats.includes(stat)` validée AVANT construction SQL |
| Pré-existant | Pas de Zod sur endpoints GET studio | Hors scope V40 — noté pour future remediation |
| Pré-existant | `error.message` exposé sur 4 endpoints GET | Hors scope V40 — noté pour future remediation |
| Faible | URLs objet non libérées après export | Risque mémoire mineur, post-merge |

**Aucune vulnérabilité bloquante introduite par V40.**

## 7. Fichiers modifiés

### Modifiés
- `backend/src/controllers/v3/studioController.js` — search ILIKE, rank, COALESCE
- `frontend/src/components/v3/modules/studio/StudioContext.jsx` — 2 steps
- `frontend/src/components/v3/modules/studio/StudioWizard.jsx` — 2 steps stepper
- `frontend/src/components/v3/modules/studio/StudioWizard.css` — stepper fix
- `frontend/src/components/v3/modules/studio/Step1_Data.jsx` — merged data+config
- `frontend/src/components/v3/modules/studio/Step1_Data.css` — chart type + slider styles
- `frontend/src/components/v3/modules/studio/charts/BarChartRace.jsx` — getTime fix
- `frontend/src/components/v3/modules/studio/charts/LineChartRace.jsx` — getTime fix + isBump dep

### Créés
- `frontend/src/components/v3/modules/studio/Step3_PreviewExport.jsx` — merged preview+export
- `frontend/src/components/v3/modules/studio/Step3_PreviewExport.css`

### Supprimés
- `Step2_Config.jsx`, `Step2_Config.css`
- `Step3_Preview.jsx`, `Step3_Preview.css`
- `Step4_Export.jsx`, `Step4_Export.css`
- `Step4Export.jsx` (orphelin)
- `ChartCanvas.jsx` (orphelin)

## 8. Verdict

**PASS** — Prêt pour merge vers `dev`.
