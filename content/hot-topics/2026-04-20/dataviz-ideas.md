# Data viz ideas — 20 April 2026

Concepts de visualisation pour chacun des 10 trends, **cadrés sur les capacités réelles du backend `statFootV3` V4** (services existants, schéma `v4.*`).

Chaque idée indique :
- **Donnée source** → table ou service V4 à exploiter
- **Format** → type de chart + taille (tweet image, story, blog embed)
- **Effort build** → 🟢 trivial / 🟡 moyen / 🔴 nécessite nouvelle route ou agrégation

> Backend V4 dispo aujourd'hui : `LeagueServiceV4`, `ClubServiceV4`, `StandingsV4Service`, `XgV4Service`, `OddsV4Service`, `MatchDetailV4Service`, `DataIngestionServiceV4`, `FlashscoreIngestionServiceV4`, `ml_routes_v4`.

---

## Viz #1 — PSG vs Bayern : les courbes xG saison

- **Concept** : graphique ligne, xG cumulé par journée pour PSG et Bayern sur toute la saison 2025-26 (toutes compétitions).
- **Source** : `XgV4Service.getCumulativeXG(teamId, seasonId)` → déjà dispo si la route expose le cumul ; sinon agrégation depuis `v4.match_events` + xG models.
- **Format** : ligne double (rouge PSG / rouge Bayern), fond sombre, axe X = journées, axe Y = xG cumulé. Image 1200×675 (X/Twitter post).
- **Effort** : 🟡 — `XgV4Service` existe mais il faut peut-être une route `/v4/xg/teams/:teamId/cumulative?season=2025-26`.
- **Insight attendu** : une équipe plus "efficace" (buts > xG) ou plus "malchanceuse" (xG > buts). Narratif honnête — pas d'anti-data.

## Viz #2 — Atlético vs Arsenal : radar défense/attaque

- **Concept** : radar 6 dimensions (xG créé, xG concédé, possession, PPDA, duels gagnés, passes progressives) — Atlético (bleu-blanc) vs Arsenal (rouge) sur les 10 derniers matchs UCL.
- **Source** : `MatchDetailV4Service.getTeamStats(teamId, last=10, competition='UCL')` → à construire si pas encore exposé.
- **Format** : radar, 2 polygones superposés semi-transparents. Parfait pour une carousel-card X/IG.
- **Effort** : 🔴 — il faut une route d'agrégation multi-matchs `/v4/stats/teams/:teamId/aggregate`.
- **Insight attendu** : Arsenal domine au milieu, Atlético écrase en défense profonde. Tactique lisible en 1 second.

## Viz #3 — PL title race : courbe du "points gap"

- **Concept** : line chart de l'écart de points Arsenal-City par journée depuis août 2025. Zone verte au-dessus = avantage Arsenal, rouge en-dessous = City.
- **Source** : `StandingsV4Service.getHistoricalStandings(leagueId, seasonId)` → si déjà présent, sinon reconstituer via `v4.matches` cumulés.
- **Format** : 1200×630, ligne épaisse, annotations sur les moments-clés (victoire 2-1 City du 19 avril, défaite League Cup, etc.).
- **Effort** : 🟢 si standings historiques existent (probable — c'est classique). Sinon 🟡.
- **Insight attendu** : effondrement d'un lead de 9 pts en 2 mois. Visuel parfaitement narratif.

## Viz #4 — Inter vs Napoli : la chute du tenant

- **Concept** : double-axe — points par journée Inter (montée) et Napoli (plafonnement / chute). Overlay : indicateur "probabilité titre" du modèle ML (sur `ml_routes_v4`).
- **Source** : `StandingsV4Service` + `ml_routes_v4` (probabilités titre si le modèle est actif pour Serie A).
- **Format** : chart area, deux trajectoires + courbe de proba titre sur axe secondaire.
- **Effort** : 🟡 — dépend du statut du modèle ML pour Serie A 2025-26.
- **Insight attendu** : décorrélation entre performance intrinsèque et résultats — Napoli garde un xG correct mais perd les points.

## Viz #5 — La Liga : le "guard of honour tracker"

- **Concept** : jauge — "probabilité que le Clásico se joue après le titre mathématiquement scellé". Calcul : issues combinées matchs restants Barça (win prob via `XgV4Service` + `OddsV4Service`) × Real.
- **Source** : `OddsV4Service.getUpcomingOdds(clubId, limit=5)` × simulation Monte Carlo (1000 runs).
- **Format** : jauge semi-circulaire (0→100%), mise à jour quotidienne. Embed widget pour un blog ou une page stats.
- **Effort** : 🔴 — il faut un script de simulation (nouveau service `TitleProbabilityServiceV4`).
- **Insight attendu** : sens narratif — on voit la probabilité monter chaque match gagné. Très viral si bien animé.

## Viz #6 — Haaland : xG vs buts réels (12 dernières saisons)

- **Concept** : scatter par saison, X = xG cumulé, Y = buts réels. Ligne y=x en pointillés. Points au-dessus = "efficace", en-dessous = "malchanceux".
- **Source** : `XgV4Service.getPlayerSeasonXG(personId)` — nouvelle route probablement.
- **Format** : scatter 1080×1080 (IG-ready). Annotations par saison.
- **Effort** : 🔴 — probablement pas de route player-xG historique aujourd'hui.
- **Insight attendu** : Haaland est ~10 buts au-dessus de xG cumulé sur 3 saisons. Le "creux" 2026 = variance, pas déclin.

## Viz #7 — Harry Kane : le "graphique fantôme"

- **Concept** : bar chart empilé — buts + passes D + xG created par saison (Tottenham → Bayern). Overlay : courbe de couverture médiatique (ratio articles Kane / articles top-3 joueurs).
- **Source** : `ClubServiceV4.getPlayerHistory(personId)` + web-scrape externe pour le ratio médiatique (hors V4 actuel).
- **Format** : bar chart 1200×675, deux axes.
- **Effort** : 🔴 — la partie médiatique n'est pas dans le projet aujourd'hui ; viable sans, mais moins percutant.
- **Insight attendu** : la saison où Kane domine le plus est aussi celle où on en parle le moins.

## Viz #8 — Lamine Yamal : value & price tracker

- **Concept** : valeur marchande Yamal (Transfermarkt) en ligne dans le temps + offres publiques connues (points annotés : €350M PSG, renouvellement 2031 Barça).
- **Source** : à confirmer — `v4.people` ne stocke probablement pas de valeur marchande temporelle. Pourrait être un champ à ajouter dans `DataIngestionServiceV4`.
- **Format** : line chart + scatter annotated, 1200×675.
- **Effort** : 🔴 — nécessite ingestion d'un fil Transfermarkt (scraping) ou d'une source payante.
- **Insight attendu** : courbe d'ascension verticale — Yamal est l'actif le plus apprécié du football européen.

## Viz #9 — Real Madrid : heatmap du chaos

- **Concept** : heatmap 38 matchs × 4 dimensions (résultat, perf xG, mood index via social, blessures). Rouge = bas, vert = haut. Lisibilité immédiate de la chute.
- **Source** : `MatchDetailV4Service` pour xG/résultat, `v4.matches.injuries` pour blessures si la table existe.
- **Format** : grille heatmap 4×38. Tableau couleur.
- **Effort** : 🟡 pour la partie V4 native, 🔴 si on ajoute le mood social (pas présent).
- **Insight attendu** : patterns visibles — les 3 mauvais matchs précèdent TOUS une blessure clé.

## Viz #10 — Mondial 2026 : le "groupes ranking"

- **Concept** : 12 mini-cartes (une par groupe), chacune avec 4 équipes triées par probabilité de qualification selon un modèle ML (Elo-based + forme récente).
- **Source** : `ml_routes_v4` — il faut un endpoint `/v4/ml/world-cup/groups` qui prend les 48 équipes et sort les probabilités.
- **Format** : long post / carousel 12 images. Ou une seule viz "power grid" à la BBC.
- **Effort** : 🔴 — il faut entraîner (ou brancher) un modèle pour les équipes nationales, pas les clubs. Gros chantier.
- **Insight attendu** : visuel-star pour le build-up Mondial, repostable toutes les semaines avec mises à jour.

---

## Priorités de build (si on veut en produire 1 ou 2 cette semaine)

| Priorité | Viz | Effort | ROI |
|---|---|---|---|
| 🥇 | **#3 PL title race — points gap** | 🟢 | Très élevé (sujet brûlant, data déjà là) |
| 🥈 | **#1 PSG-Bayern xG cumulé** | 🟡 | Élevé (UCL SF imminente, route à ajouter mais simple) |
| 🥉 | **#6 Haaland xG vs buts (si on accepte une route player-xG custom)** | 🔴 | Moyen (bel angle mais effort de build) |

## Stack technique suggéré côté frontend

Pour rendre ces viz embed-friendly (X, blog, widget) :
- **Librairie** : Recharts (déjà utilisé dans `frontend/src/` selon la structure V4) pour les line/bar. D3 pour les radars et heatmaps complexes.
- **Export** : `html-to-image` ou équivalent pour générer des PNG 1200×630 à partir des composants React → directement partageables.
- **Route miroir** : un endpoint backend `/v4/viz/export/:viz_id?format=png` qui render côté serveur via Puppeteer si on veut tout automatiser.

## Règles visuelles (cf. `visual-manifesto.md`)

- Couleurs : uniquement via tokens CSS de `tokens.css`
- Polices display : `Sora` ou `Space Grotesk` pour les titres viz, jamais `Inter` pur
- Fond : `--gradient-dark` par défaut pour le mode "dark observatory"
- Animation : entrée `staggered reveal` (50ms par série de données)
