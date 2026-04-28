# V9 — NarrativeGrid v2 : redesign data-grounded & format-aware

**Statut :** TSD — à valider avant code.

**Auteur :** Product Architect.

**Lié à :** `data-atlas.md`, `twitter-playbook.md`, `format-strategy.md`.

---

## 1. Pourquoi v2 (rappel feedback utilisateur)

> « 'résultat 100 / 0' ne veut rien dire → Score final avec une infographie de couleur claire. xG diff devrait être xg 'pour' et 'xg contre'. Moral ne veut rien dire. Au global l'affichage selon le format sera fouilli. Il faut simplifier et penser tout ça pour correspondre au média choisi. »

Trois problèmes structurels sont identifiés :

1. **Sémantique brisée.** v1 normalise tout en `[0..1]` puis affiche `Math.round(intensity * 100)`. Un résultat W/N/D devient "100/50/0", lisible comme un score → confusion. ([`NarrativeGrid.jsx:86`](../../../frontend/src/components/v3/modules/studio/templates/NarrativeGrid/NarrativeGrid.jsx))
2. **KPIs inventés.** `xG diff`, `Possession`, `Moral (réseaux)` sont hard-codés à `0.5` dans [`useNarrativeBackend.js:64-68`](../../../frontend/src/components/v3/modules/studio/templates/NarrativeGrid/useNarrativeBackend.js). Aucune donnée réelle.
3. **Layout non format-aware.** Le label de ligne fait 200 px ; au-delà de 8 colonnes en 9:16 (largeur 1080 - 128 padding = 952 px), 200 px de label + 9 cellules = cellules trop fines. En 16:9, on a l'inverse : trop de blanc.

---

## 2. Les changements clés (résumé)

| Avant (v1) | Après (v2) |
|---|---|
| Cellule "Résultat" affiche `100`/`50`/`0` | Cellule "Score" affiche `2-1` ou pastille `W/N/D` selon mode |
| 1 KPI "xG diff" normalisé | 2 KPIs distincts : **xG pour** et **xG contre** (valeurs réelles, format `1.84`) |
| KPI "Possession" stub à 0.5 | **Retiré** tant qu'aucune source n'est câblée |
| KPI "Moral (réseaux)" stub à 0.5 | **Retiré définitivement** (data_gap, pas de source) |
| Layout fixe identique en 9:16 / 1:1 / 16:9 | **3 layouts dédiés** : vertical-strip, square-grid, horizontal-list |
| Échelle `0 → 100` sans unité | Échelles **par KPI** avec bornes min/max contextuelles ligue |
| Cellule = couleur saturation | Cellule = **bloc lisible** : valeur grosse + sparkline-like coloration discrète |

---

## 3. Data contract v2

```js
// contract.js — v2
export const contract = {
  eyebrow: { type: 'string', required: false },           // ex: "Real Madrid · 2025-2026"
  headline: { type: 'string', required: true },           // ex: "10 derniers matchs"
  subtitle: { type: 'string', required: false },
  source: { type: 'string', required: false },           // "statFoot V4"
  takeaway: { type: 'string', required: false },         // ex: "5V, 3N, 2D — xG diff +1.1/match"

  // Indicateurs SCALAIRES (pas par match) — affichage condensé en bas/header
  summary: {
    type: 'object', required: false,
    shape: {
      record: { type: 'string', required: false },        // "5V-3N-2D"
      goals_for_total: { type: 'number', required: false },
      goals_against_total: { type: 'number', required: false },
      xg_for_avg: { type: 'number', required: false },    // ex: 1.84
      xg_against_avg: { type: 'number', required: false },// ex: 0.92
    },
  },

  // Liste des matchs — 5 à 12 idéalement
  matches: {
    type: 'array<Match>', required: true,
    shape: {
      opponent: { type: 'string', required: true },
      opponent_logo: { type: 'string', required: false }, // versionné v4.club_logos
      isHome: { type: 'boolean', required: true },
      result: { type: 'enum:W|D|L', required: true },
      score: {                                            // <-- score réel, pas un %
        type: 'object', required: true,
        shape: {
          for: { type: 'integer', required: true },       // ex: 2
          against: { type: 'integer', required: true },   // ex: 1
        },
      },
      xg: {
        type: 'object', required: false,                  // null si match sans xG
        shape: {
          for: { type: 'number', required: false },       // ex: 1.84
          against: { type: 'number', required: false },
        },
      },
      meta: { type: 'string', required: false },          // ex: "PL · J32"
      match_date: { type: 'string', required: false },    // ISO
    },
  },
};
```

**Ce qui disparaît :** `kpiLabels`, `kpis: { Résultat, "xG diff", Possession, "Moral (réseaux)" }`. La grille n'est plus "labels libres × matchs", c'est "résumé scalaire + ligne de matchs structurée".

---

## 4. Logique backend (hook v2)

Remplace `useNarrativeBackend.js`.

**Sources V4 utilisées :**
- `api.getFixturesV4(league, season)` → liste des fixtures du club (déjà utilisé en v1).
- `api.getTeamSeasonXgV4(league, season)` → xG saison par équipe (existe — § 2.4 atlas).
- *Optionnel :* récupérer `xg` par match → **data_gap**, à ce stade `v4.match_xg` (ou colonnes `home_xg`/`away_xg` sur `v4.matches`) doit être confirmé. Si absent, `xg` par match = `null` et le rendu masque la ligne xG.

**Pseudo-code :**

```js
async function buildNarrativeData({ league, season, clubName, limit = 10 }) {
  const fxResp = await api.getFixturesV4(league, season);
  const fixtures = (fxResp?.data?.fixtures || fxResp?.fixtures || [])
    .filter((f) => f.home_club_name === clubName || f.away_club_name === clubName)
    .filter((f) => f.home_goals != null && f.away_goals != null)
    .sort((a, b) => (b.match_date || '').localeCompare(a.match_date || ''))
    .slice(0, limit)
    .reverse();

  if (fixtures.length < 4) return { error: 'not_enough_matches' };

  // xG saison équipe (moyennes) — pour le bloc summary
  const xgResp = await api.getTeamSeasonXgV4(league, season).catch(() => null);
  const teamXg = xgResp?.data?.find?.((t) => t.team_name === clubName) || null;

  const matches = fixtures.map((fx) => {
    const isHome = fx.home_club_name === clubName;
    const gf = isHome ? fx.home_goals : fx.away_goals;
    const ga = isHome ? fx.away_goals : fx.home_goals;
    const result = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    const xgFor = isHome ? fx.home_xg : fx.away_xg;          // null si data_gap
    const xgAgainst = isHome ? fx.away_xg : fx.home_xg;
    return {
      opponent: isHome ? fx.away_club_name : fx.home_club_name,
      opponent_logo: isHome ? fx.away_logo_url : fx.home_logo_url,
      isHome, result,
      score: { for: gf, against: ga },
      xg: xgFor != null ? { for: xgFor, against: xgAgainst } : null,
      meta: fx.competition_short || fx.round || '',
      match_date: fx.match_date,
    };
  });

  const summary = {
    record: countResults(matches),                           // "5V-3N-2D"
    goals_for_total: matches.reduce((s, m) => s + m.score.for, 0),
    goals_against_total: matches.reduce((s, m) => s + m.score.against, 0),
    xg_for_avg: teamXg?.xg_per_match_for ?? null,
    xg_against_avg: teamXg?.xg_per_match_against ?? null,
  };

  return {
    eyebrow: `${clubName} · ${season}`,
    headline: `${limit} derniers matchs`,
    subtitle: 'Résultats, buts marqués / encaissés, xG pour / contre.',
    summary,
    matches,
    source: 'statFoot V4',
    takeaway: buildTakeaway(matches, teamXg),                // util front
  };
}
```

**Règle anti-stub :** si `xg.for` n'arrive pas, on **n'affiche pas** la ligne xG, on ne met pas `0.5` ni `—` masqué. C'est strict.

---

## 5. UI Blueprint — 3 layouts format-aware

### 5.1 9:16 (1080 × 1920) — "Vertical Strip"

```
┌─────────────────────────────────┐
│ EYEBROW (Real Madrid · 2025-26) │  ← 56 px
│                                 │
│ HEADLINE (10 derniers matchs)   │  ← 96 px display
│                                 │
│ ─────────────────────────────── │
│  5V-3N-2D    GF 22  GA 11       │  ← summary band
│  xG/m  1.84 / 0.92              │
│ ─────────────────────────────── │
│                                 │
│  ┌──────────────────────┐       │
│  │ ▣ Atlético  · 2-1    │ W     │  ← bande par match
│  │   xG 1.6 / 0.9       │ Dom   │
│  └──────────────────────┘       │
│  ┌──────────────────────┐       │
│  │ ▣ Sevilla   · 0-1    │ L     │
│  │   xG 0.8 / 1.4       │ Ext   │
│  └──────────────────────┘       │
│  …                              │
│                                 │
│ TAKEAWAY (1 ligne narrative)    │
│ source · statFoot V4            │
└─────────────────────────────────┘
```

- **Pile verticale** de 8 à 10 cards-match, chacune ~150 px de haut.
- Contient : pastille couleur (W/N/D), nom adversaire + logo (24 px), score grand (`2-1` typographie display), xG inline si dispo, badge Dom/Ext.
- **Pas de grille KPI × match** : la lecture est top-down.

### 5.2 1:1 (1080 × 1080) — "Square Grid"

Un tableau compact 4-5 colonnes × 2 lignes (jusqu'à 10 matchs) :

```
┌────────┬────────┬────────┬────────┬────────┐
│ ATL 2-1│ SEV 0-1│ VAL 3-0│ BAR 1-1│ RAY 2-2│
│  W Dom │  L Ext │  W Dom │  D Ext │  D Dom │
│ xG 1.6 │ xG 0.8 │ xG 2.1 │ xG 1.2 │ xG 1.4 │
│   0.9  │   1.4  │   0.6  │   1.1  │   1.5  │
├────────┼────────┼────────┼────────┼────────┤
│ ESP 4-0│ GET 2-0│ ALA 1-0│ MAL 3-1│ CEL 0-0│
│  W Ext │  W Dom │  W Ext │  W Dom │  D Ext │
│ xG 2.8 │ xG 1.7 │ xG 1.3 │ xG 2.0 │ xG 1.0 │
│   0.4  │   0.5  │   0.7  │   0.6  │   0.9  │
└────────┴────────┴────────┴────────┴────────┘

5V-3N-2D  ·  GF 22 / GA 11  ·  xG/m 1.84 vs 0.92
```

- Header eyebrow + headline en haut, summary en bas.
- Chaque cellule = un match auto-suffisant.
- Couleur de fond par cellule selon résultat (vert sourd / jaune / rouge sourd).

### 5.3 16:9 (1920 × 1080) — "Horizontal List"

```
┌─────────────────────────┬──────────────────────────────────────┐
│                         │  ATL 2-1   xG 1.6/0.9   W  Dom       │
│  Real Madrid            │  SEV 0-1   xG 0.8/1.4   L  Ext       │
│  10 derniers matchs     │  VAL 3-0   xG 2.1/0.6   W  Dom       │
│                         │  BAR 1-1   xG 1.2/1.1   D  Ext       │
│  5V - 3N - 2D           │  RAY 2-2   xG 1.4/1.5   D  Dom       │
│  GF 22 / GA 11          │  ESP 4-0   xG 2.8/0.4   W  Ext       │
│  xG/m  1.84 / 0.92      │  GET 2-0   xG 1.7/0.5   W  Dom       │
│                         │  ALA 1-0   xG 1.3/0.7   W  Ext       │
│  source · statFoot V4   │  MAL 3-1   xG 2.0/0.6   W  Dom       │
│                         │  CEL 0-0   xG 1.0/0.9   D  Ext       │
└─────────────────────────┴──────────────────────────────────────┘
```

- Colonne gauche `~30 %` : eyebrow + headline + summary + source.
- Colonne droite : liste 1 match par ligne, taille fixe.

---

## 6. Couleurs & typographie

**Palette par défaut :** "Stadium black" (cf. `twitter-playbook.md` § 5).
- Fond : `#0B0B0E`.
- Accent W : `#34D399` (vert sourd).
- Accent D : `#FBBF24` (jaune ambre).
- Accent L : `#F87171` (rouge sourd).
- Texte : `#F5F5F5`.

**Variantes commutables :** "Editorial paper" et "Tactical violet" — sélectionnables via prop `theme`.

**Typographie :** display `Bricolage Grotesque` ou `Sora` (à figer en V9.1) ; body `Inter`. `tabular-nums` activé sur tous les chiffres (scores, xG).

---

## 7. États (loading / error / empty)

- **Loading :** `<Skeleton>` avec la même pile (vertical strip ou grid selon aspect) — 8 lignes pleines de gris.
- **Error :** message inline `"Impossible de charger les matchs"` + bouton "Réessayer".
- **Empty (< 4 matchs) :** afficher *quand même* le summary partiel + un badge `« Couverture incomplète — N/M matchs »`. **Ne pas retomber sur `demoData` silencieusement** comme v1.
- **xG indisponible :** ne pas afficher la ligne xG. Le hook ne renvoie pas la clé.

---

## 8. Plan d'implémentation (effort)

| Étape | Effort | Bloque-t-il ? |
|---|---|---|
| Réécrire `contract.js` v2 | 0.5 j | ⛔ oui — toute la suite en dépend |
| Réécrire `useNarrativeBackend.js` | 0.5 j | non |
| 3 sous-composants : `<NgVerticalStrip>`, `<NgSquareGrid>`, `<NgHorizontalList>` | 2 j | ⛔ oui |
| Switch d'aspect dans `NarrativeGrid.jsx` (case `aspectRatio`) | 0.5 j | non |
| Mettre à jour `demo.js` avec scores réels | 0.25 j | non |
| Tests Vitest (rendu des 3 layouts + cas xG absent) | 0.5 j | non |
| MAJ `IdeasHub` : retirer "Moral", reformuler les hooks | 0.25 j | non |
| Vérifier `v4.matches.home_xg/away_xg` ou table équivalente | 0.5 j | ⛔ oui — si data_gap, route à câbler ou ligne xG masquée |

**Total estimé :** ~5 j-développeur, hors câblage data_gap xG par match.

---

## 9. Tests d'acceptation

1. ✅ Rendu en 9:16 avec 10 matchs lisibles (score 24 px+, opponent 18 px+).
2. ✅ Rendu en 1:1 avec grid 5×2 propre.
3. ✅ Rendu en 16:9 avec colonne summary à gauche.
4. ✅ Quand `xg` est `null` pour tous les matchs, la ligne xG disparaît partout.
5. ✅ Avec 3 matchs seulement, badge "Couverture incomplète" visible.
6. ✅ Aucun KPI "Possession" ou "Moral" n'apparaît dans le DOM.
7. ✅ Aucune valeur `0.5` codée en dur dans les tests de snapshot.
8. ✅ Couleurs accent issues uniquement de `tokens.css`.

---

## 10. Risques & mitigations

| Risque | Mitigation |
|---|---|
| `home_xg/away_xg` absent de `v4.matches` | Confirmer en V9.0 ; si absent, ouvrir `V9.1 — xG match-level migration` (additive uniquement, cf. data-ingestion-standards) |
| Régression visuelle pour les utilisateurs habitués v1 | Garder NarrativeGrid v1 derrière un flag `?v=1` 2 sprints |
| Conflit avec d'autres formats (NarrativeGrid utilisé en thumbnail) | Le mode `scale` injecte déjà un facteur — testé avec `useFitScale` |

---

## 11. Hors scope (volontaire)

- Sparklines xG par match → V10.
- Animation entre matchs (carrousel auto) → V10.
- Comparaison vs autre équipe sur même grille → nouveau template `DuoNarrativeGrid` (V10).
