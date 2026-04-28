# V9 — IdeasHub v2 : catalogue d'idées branché data (zero invention)

**Statut :** TSD à valider.

**Auteur :** Product Architect.

**Lié à :** `data-atlas.md`, `twitter-playbook.md`, `format-strategy.md`, `narrative-grid-v2.md`.

---

## 1. Pourquoi v2

> « Re-créer les 'idées'. Attention les données doivent provenir de la DB, je ne veux rien d'inventer. Si pour réaliser un graph il manque une donnée, indique-le. »

L'IdeasHub v1 propose un catalogue d'idées statiques sans vérifier la disponibilité des données. v2 :

1. **Chaque idée pointe vers une cellule du `data-atlas.md`** — donc une fonction de service vérifiable.
2. **Chaque idée fournit un hook texte** (un des 8 patterns du playbook) — pas seulement un visuel.
3. **Chaque idée affiche son statut data** : `ready` (toutes les sources OK), `partial` (un champ data_gap), `blocked` (data manquante critique).
4. **Le bouton "Tester" pré-remplit le template choisi avec une compétition/saison réellement couverte** (via `getCoverageV4`).

---

## 2. Modèle d'une idée

```ts
type Idea = {
  id: string;                    // 'top-scorers-race-2026'
  title: string;                 // 'Course au Soulier d'Or'
  hookPattern: HookPattern;      // 'superlative' | 'comparison' | 'streak' | …
  hookExample: string;           // 'X mène la course au Soulier d'Or avec N buts.'
  template: TemplateId;          // 'race-tracker'
  primeAspect: AspectRatio;      // '16:9'
  dataSources: DataSource[];     // ↓ liste des appels nécessaires
  dataStatus: 'ready' | 'partial' | 'blocked';
  dataGaps: string[];            // ['Photo joueur (data_gap)']
  defaultParams: {                // pré-rempli pour test rapide
    league?: string;
    season?: string;
    matchId?: number;
    clubName?: string;
  };
  caveat?: string;               // Avertissement à l'utilisateur
};

type DataSource = {
  service: string;               // 'LeagueServiceV4.getTopScorers'
  endpoint: string;              // 'GET /v4/league/:league/season/:season'
  required: boolean;
  fallback?: string;             // 'masquer la ligne xG si non présent'
};
```

---

## 3. Catalogue d'idées V9 (12 entrées initiales)

> Toutes pointent vers une ligne du `data-atlas.md`. Aucune n'est inventée.

### IDEA-01 — Course au Soulier d'Or
- **Hook pattern :** comparaison vs benchmark, franchissement de seuil.
- **Hook exemple :** « N matchs avant la fin, X mène avec N buts. Y le talonne à -2. »
- **Template :** `RaceTracker`.
- **Aspect prime :** 16:9.
- **Sources :** `LeagueServiceV4.getTopScorers` (atlas § 2.3).
- **dataStatus :** `ready`.
- **dataGaps :** `[]`.
- **Default params :** league = top 5 ligue couverte, season = courante.

### IDEA-02 — Sur-performance vs xG (saison)
- **Hook pattern :** inversion de tendance, occurrence rare.
- **Hook exemple :** « X marque N buts pour seulement Y xG. Plus grand sur-rendement de la ligue. »
- **Template :** scatter goals/xG (à créer en V9.2 — *blocked tant que template absent*).
- **Aspect prime :** 1:1.
- **Sources :** `XgV4Service.getXgByCompetitionSeason` + `getTopScorers` (atlas § 2.3, 2.4).
- **dataStatus :** `partial` — données OK, **template manquant**.
- **dataGaps :** `['Template scatter à implémenter (V9.2)']`.

### IDEA-03 — Match preview du week-end
- **Hook pattern :** comparaison équipes.
- **Hook exemple :** « X reçoit Y. ML penche à 58/22/20. Forme : XXX vs YYY. »
- **Template :** `MatchPreviewCard`.
- **Aspect prime :** 9:16.
- **Sources :** `MatchPreviewContentServiceV4.getMatchPreview` (atlas § 2.1).
- **dataStatus :** `ready` (sauf `prediction` partielle, voir caveat).
- **dataGaps :** `['Prediction parfois absente — afficher état neutre']`.
- **Caveat :** « Si le match n'a pas de prédiction ML, le bloc proba est masqué. »

### IDEA-04 — Forme récente (5 derniers)
- **Hook pattern :** régularité, séries.
- **Hook exemple :** « X enchaîne 5 victoires consécutives — un seul autre club a fait mieux cette saison. »
- **Template :** `NarrativeGrid v2` (vertical-strip).
- **Aspect prime :** 9:16.
- **Sources :** `MatchPreviewContentServiceV4.fetchRecentForm` (atlas § 2.5) + `getTeamSeasonXgV4` (xG par match si dispo).
- **dataStatus :** `ready`.
- **dataGaps :** `['xG par match peut être absent (voir narrative-grid-v2.md)']`.

### IDEA-05 — Heatmap saison complète
- **Hook pattern :** récit, narration de série.
- **Hook exemple :** « 10 derniers matchs de X — narrative xG saison. »
- **Template :** `NarrativeGrid v2` (vertical-strip ou square-grid).
- **Aspect prime :** 9:16.
- **Sources :** `getFixturesV4` + `MatchPreviewContentServiceV4.fetchSeasonXgAvg` (atlas § 2.4, 2.5).
- **dataStatus :** `ready`.
- **dataGaps :** `[]`.

### IDEA-06 — Head-to-Head des 5 derniers
- **Hook pattern :** rareté de rôle, occurrence rare.
- **Hook exemple :** « Bilan H2H : X mène 3-1 sur les 5 derniers face-à-face. »
- **Template :** `MatchPreviewCard` (variante H2H) ou `PowerGrid` (mini).
- **Aspect prime :** 1:1.
- **Sources :** `MatchPreviewContentServiceV4.fetchH2H` (atlas § 2.6).
- **dataStatus :** `ready`.
- **dataGaps :** `[]`.

### IDEA-07 — Classement live
- **Hook pattern :** big-stat (1er du classement).
- **Hook exemple :** « X consolide la 1ʳᵉ place avec N pts d'avance à J33. »
- **Template :** `PowerGrid`.
- **Aspect prime :** 1:1 (groupes WC) ou 16:9 (championnat 20 équipes).
- **Sources :** `StandingsV4Service.calculateStandings` (atlas § 2.2).
- **dataStatus :** `ready`.
- **dataGaps :** `[]`.

### IDEA-08 — Récap post-match (événements)
- **Hook pattern :** narration / fil chronologique.
- **Hook exemple :** « X 3 - 1 Y : tous les buts en 50 secondes. »
- **Template :** template "Match Recap" — à créer en V9.3 (timeline d'événements).
- **Aspect prime :** 1:1.
- **Sources :** `MatchDetailV4Service.getFixtureEvents` (atlas § 2.7).
- **dataStatus :** `partial` — données OK, **template à créer**.
- **dataGaps :** `['Template Match Recap à implémenter (V9.3)']`.

### IDEA-09 — Duo joueurs : impact saison
- **Hook pattern :** comparaison.
- **Hook exemple :** « X et Y, mêmes buts, mais X a Z xG en moins. »
- **Template :** `DuoComparison`.
- **Aspect prime :** 1:1.
- **Sources :** `LeagueServiceV4.getPlayerSeasonStats` (atlas § 2.10).
- **dataStatus :** `partial` — manque potentiellement minutes ou xG joueur (atlas § 2.11).
- **dataGaps :** `['xG joueur exposé via API (atlas § 2.11)']`.

### IDEA-10 — Big stat : record battu
- **Hook pattern :** superlatif + négation.
- **Hook exemple :** « X est le 1ᵉʳ joueur depuis A à atteindre N buts en N matchs. »
- **Template :** `StatSupremacy`.
- **Aspect prime :** 9:16 ou 1:1.
- **Sources :** `LeagueServiceV4.getTopScorers` + recherche historique (à dériver côté back).
- **dataStatus :** `partial` — la "première fois depuis X" demande un agrégat historique. Faisable via une requête sur `v4.player_season_xg` ou `v4.matches` + `v4.match_events` mais pas de fonction packagée aujourd'hui.
- **dataGaps :** `['Fonction backend findHistoricalRecord à câbler']`.

### IDEA-11 — Évolution xG saison (line chart)
- **Hook pattern :** inversion de tendance.
- **Hook exemple :** « Depuis l'arrivée du nouveau coach, xG/match passe de 1.1 à 1.9. »
- **Template :** line chart annoté — **à créer en V9.4**.
- **Aspect prime :** 16:9.
- **Sources :** `getFixturesV4` + xG par match (atlas § 2.5).
- **dataStatus :** `blocked` — manque template line chart + xG par match.
- **dataGaps :** `['Template line chart absent', 'xG par match dans v4.matches à confirmer']`.

### IDEA-12 — Couverture saison (méta)
- **Hook pattern :** infrastructure / méta.
- **Hook exemple :** Pas un tweet — outil interne pour savoir quelles idées sont publiables.
- **Template :** dashboard interne (pas un visuel Twitter).
- **Aspect prime :** N/A.
- **Sources :** `LeagueServiceV4.getCoverageByCompetition` (atlas § 2.14).
- **dataStatus :** `ready`.
- **dataGaps :** `[]`.

---

## 4. Vérifications data avant publication d'une idée

Pour chaque idée, le hub V9 doit faire :

```js
async function checkIdeaReadiness(idea, params) {
  const checks = await Promise.all(
    idea.dataSources.map(async (src) => {
      try {
        const sample = await callService(src, params);
        return { source: src.service, ok: !!sample };
      } catch (err) {
        return { source: src.service, ok: false, err: err.message };
      }
    })
  );
  const allOk = checks.every((c) => c.ok || !idea.dataSources.find((s) => s.service === c.source).required);
  return { allOk, checks, dataGaps: idea.dataGaps };
}
```

Affichage côté UI :
- ✅ "Prêt" → bouton "Tester" actif.
- ⚠️ "Partiel" → bouton actif + tooltip listant les `dataGaps`.
- ❌ "Bloqué" → bouton désactivé, lien vers le ticket V9.x correspondant.

---

## 5. Refonte UI IdeasHub

### Avant (v1)
- Catalogue plat, miniatures uniformes, pas d'info data.

### Après (v2)
```
┌─────────────────────────────────────────────────────────┐
│  IDÉES — CATALOGUE V9                  [filtre: ready ▾]│
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ ✅ READY │ │ ⚠️ PART. │ │ ❌ BLOCK │ │ ✅ READY │   │
│  │          │ │          │ │          │ │          │   │
│  │ 🏆 Top   │ │ 📊 Sur-  │ │ 📈 xG    │ │ 📰 Match │   │
│  │ scorers  │ │ perf xG  │ │ saison   │ │ preview  │   │
│  │          │ │          │ │          │ │          │   │
│  │ Race-    │ │ Scatter  │ │ Line     │ │ Match-   │   │
│  │ Tracker  │ │ (V9.2)   │ │ chart    │ │ Preview- │   │
│  │ 16:9     │ │ 1:1      │ │ (V9.4)   │ │ Card 9:16│   │
│  │          │ │          │ │          │ │          │   │
│  │ [Tester] │ │ [Voir]   │ │ Bloqué   │ │ [Tester] │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Filtres
- Statut : `ready` / `partial` / `blocked`.
- Aspect prime : `9:16` / `1:1` / `16:9`.
- Hook pattern : 8 catégories du playbook.
- Template : 6 templates V8 + nouveaux V9.

---

## 6. Effort

| Étape | Effort |
|---|---|
| Modèle `Idea` + 12 entrées dans `frontend/src/components/v3/modules/studio/IdeasHub/catalog.js` | 1 j |
| Service `checkIdeaReadiness` (frontend) | 0.5 j |
| Refonte UI : cards avec status, filtres | 2 j |
| Pré-remplir paramètres de test depuis `getCoverageV4` | 0.5 j |
| Tests vitest | 0.5 j |

**Total :** ~4.5 j.

---

## 7. Hors scope V9.0

- IDEA-02 (scatter) — V9.2.
- IDEA-08 (Match Recap timeline) — V9.3.
- IDEA-11 (line chart) — V9.4.
- Génération automatique du tweet text via LLM — V10+.

---

## 8. Tests d'acceptation

1. ✅ Le hub affiche 12 idées avec statut clair (ready/partial/blocked).
2. ✅ Aucune idée ne propose de stat sans source service identifiable.
3. ✅ Le bouton "Tester" sur IDEA-01 ouvre `RaceTracker` pré-rempli avec une ligue couverte (PL 2025-2026 par exemple).
4. ✅ Le bouton "Tester" sur IDEA-11 (blocked) est désactivé avec message d'attente V9.4.
5. ✅ Les `dataGaps` listés s'affichent en tooltip.
6. ✅ Le filtre "ready only" cache les 4 idées partial/blocked.
