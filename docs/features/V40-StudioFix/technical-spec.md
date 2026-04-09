# Technical Spec — V40-StudioFix

## Objectif

Corriger les bugs critiques du Studio Wizard et simplifier l'UX en fusionnant 4 étapes en 2.

## Architecture

### Wizard Flow (avant → après)

**Avant (4 steps)** :
1. Step1_Data — sélection données
2. Step2_Config — type chart, format, thème, vitesse
3. Step3_Preview — prévisualisation
4. Step4_Export — export vidéo

**Après (2 steps)** :
1. Step1_Data — sélection données + type chart + vitesse
2. Step3_PreviewExport — prévisualisation avec contrôles + export multi-format

### Backend — studioController.js

**searchStudioPlayers** : Réécriture complète du système de recherche.
- Pattern identique à `SearchRepository.globalSearch`
- `ILIKE` avec word boundaries pour la pertinence
- Tri par `relevance_priority ASC, scout_rank DESC, country_importance ASC`
- Champs internes exclus de la réponse

**queryStudioData** : Corrections de données.
- `COALESCE(SUM(s.${stat}), 0)` pour éviter les NULL
- `rank: idx + 1` ajouté à chaque frame pour le filtrage BarChartRace
- Whitelist `allowedStats` validée avant interpolation SQL

### Frontend — Charts

**getTime fix** (BarChartRace + LineChartRace) :
```js
// Avant : frame.season ?? frame.round (undefined pour player data)
// Après : frame.year ?? frame.season ?? frame.round
```

**isBump dependency** : Ajouté au useEffect de preload pour recalculer topPlayers quand le mode change.

### Frontend — Step3_PreviewExport (nouveau)

- Preview toujours en 16:9 avec play/pause/restart
- Export multi-format : sélection 9:16, 1:1, 16:9
- Export séquentiel via MediaRecorder + captureStream(60)
- Canvas offscreen pour chaque format

## Résultat de livraison

Implémentation conforme au plan initial. Écarts :
- `handleLeagueRankings` : suppression du `setVisual({ type: 'league_race' })` override (non prévu dans le plan, corrigé suite à bug bump chart)
- Fichiers orphelins supprimés comme prévu (Step4Export.jsx, ChartCanvas.jsx)
- CSS hardcodés dans Step1_Data.css (pré-existants) — hors scope, identifiés pour remediation future
