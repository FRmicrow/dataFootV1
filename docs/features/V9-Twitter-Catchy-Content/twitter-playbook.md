# V9 — Twitter / X Football Playbook (avril 2026)

**Mission :** Cadrer ce qui *catch* sur X aujourd'hui dans le foot data, pour que chaque template statFootV3 corresponde à un format éprouvé. Plus de templates "jolis mais ignorés".

---

## 1. Ce qui marche (synthèse en 5 lignes)

1. **Le visuel doit dire la stat en < 2 secondes.** Si le lecteur doit comparer deux nombres mentalement, c'est mort.
2. **Un KPI dominant + un récit.** Un tweet = une stat-titre + 1 chiffre de soutien max. Pas 4 KPIs juxtaposés.
3. **Couleur bloc unique + accent saturé.** Squawka noir + jaune, FBref violet, FT gris + rouge. Pas de gradient pastel.
4. **Format 16:9 single-image (1200×675) > carrousel > 9:16.** Le 16:9 occupe l'écran horizontal en TL ; le 9:16 est sous-utilisé sur X (mieux sur TikTok/IG Reels).
5. **Le hook texte fait 50 % du job.** "Aucun joueur n'a fait X depuis Y" performe 3-5× mieux qu'un graphique froid.

---

## 2. Comptes de référence (à imiter, pas à copier)

| Compte | Style visuel | Force narrative |
|---|---|---|
| `@Squawka` | Fond noir, accent jaune doré, sobre | Stats post-match brutales, "first since 2014…" |
| `@OptaJoe` / régionaux Opta | Bandeaux pleine couleur club, picto épuré | Recherche du chiffre rare ("first time", "no player since") |
| `@FBref` (et son CDN d'images) | Violet `#6B4C9A`, tableaux dense | Pizza joueur, percentiles ligue |
| `@StatsBomb` | Sombre + accent vert/orange | Carte de tirs (xG map), heatmaps |
| `@FT` *Sport* / `@JB_Burnmurdoch` | Gris éditorial, rouge accent, sérif | Long-form, line charts annotés |
| `@johnspacemuller` | Minimal, blanc + accent | Données percentile joueur |
| `@7amkickoff` (Arsenal) | Identité club rouge / blanc | Récap club, tone éditorial |
| `@AnalystyDP` (et autres analystes) | Mix cartes + graphiques | Insight tactique, breakdown |

**À retenir :** chacun a *une* identité visuelle reconnaissable. statFootV3 doit en choisir une (ou en proposer 2-3 thèmes commutables) — pas en patcher une nouvelle pour chaque feature.

---

## 3. Formats visuels qui performent

| Format | Quand l'utiliser | Aspect optimal | Couvert V8 ? |
|---|---|---|---|
| **Big-stat / Hero number** | Une stat record / first-since | 16:9 ou 1:1 | partiellement (PowerGrid) |
| **Comparaison côte-à-côte** | "Joueur A vs Joueur B" même rôle | 16:9 ou 9:16 | ✅ DuoComparison |
| **Heatmap saisonnière** | Forme sur 10-15 matchs | 9:16 (vertical lit bien) | ✅ NarrativeGrid (à fixer en v2) |
| **Pizza / Radar percentile** | Profil joueur vs ligue | 1:1 | ❌ pas encore |
| **Scatter goals vs xG** | Sur/sous-perfs équipes | 1:1 ou 16:9 | ❌ pas encore |
| **Bar race / Course au titre** | Top scorers, course podium | 16:9 | ✅ RaceTracker |
| **Match preview card** | Avant-match avec hook | 1:1 ou 9:16 | ✅ MatchPreviewCard |
| **Score final + résumé événements** | Post-match récap, ligne du temps | 1:1 ou 16:9 | ⚠️ partiel — manque ligne d'événements claire |
| **Before/After** | "Avant manager X / depuis manager X" | 16:9 | ❌ pas encore |
| **Line chart annoté** | Évolution xG, points cumulés | 16:9 | ❌ pas encore |

---

## 4. Hooks textuels (les 8 patterns qui drivent)

Chaque tweet doit ouvrir avec un de ces patterns. Le visuel arrive en preuve.

1. **Superlatif + négation :** "Aucun joueur n'a marqué autant que X depuis Y."
2. **Comparaison vs benchmark :** "X a maintenant plus de buts que toute l'équipe Y cumulée."
3. **Régularité / cohérence :** "X a marqué dans Y matchs consécutifs."
4. **Occurrence rare :** "Pour la première fois depuis Y, l'équipe X…"
5. **Franchissement de seuil :** "X vient de franchir N buts en moins de M matchs."
6. **Inversion de tendance :** "Après Y, l'équipe X a doublé son xG par match."
7. **Rareté de rôle :** "Seul un défenseur depuis Y a réussi…"
8. **Âge / époque :** "Plus jeune joueur à avoir marqué dans 3 finales depuis Y."

**Implication V9 :** chaque idée d'IdeasHub doit fournir le *hook texte* en plus du visuel. Aujourd'hui IdeasHub ne propose que le canvas — c'est insuffisant.

---

## 5. Palettes & typographies

### Palette A — "Stadium black" (Squawka style)
- Fond : `#0B0B0E` (noir charbon)
- Accent : `#FFD23F` (jaune ambre)
- Texte : `#F5F5F5` blanc cassé
- Use case : big-stat, post-match brutal

### Palette B — "Editorial paper" (FT style)
- Fond : `#F5F2EB` ivoire
- Accent : `#C8102E` rouge
- Texte : `#1A1A1A` noir
- Use case : line chart annoté, long-form

### Palette C — "Tactical violet" (FBref style)
- Fond : `#1A1429` violet foncé
- Accent : `#6B4C9A` violet sat
- Use case : pizza, radar, percentile

### Palette D — "Pitch night" (StatsBomb style)
- Fond : `#0F1A14` vert foncé
- Accent : `#00D26A` vert vif (tirs réussis), `#E6394B` rouge (manqués)
- Use case : carte de tirs, xG map

**Règle :** chaque template doit déclarer *une* palette par défaut + 1-2 variantes. Le `themes` actuel doit être étendu pour les contenir explicitement (cf. `format-strategy.md`).

### Typographie

- **Display :** une font à fort caractère. Suggestions : `Sora`, `Outfit`, `Space Grotesk`, `DM Sans`, `Bricolage Grotesque`. **Varier par template, pas par produit.**
- **Body :** `Inter` ou `IBM Plex Sans`.
- **Chiffres XL :** `tabular-nums` activé pour aligner les stats.

---

## 6. Dimensions exactes Twitter / X (avril 2026)

| Aspect | Pixels natifs | Usage |
|---|---|---|
| 16:9 (single image) | 1200 × 675 | Image dans tweet — affichage intégral feed |
| 1:1 (carousel slot) | 1080 × 1080 | Carrousel jusqu'à 4 images |
| 9:16 (vertical) | 1080 × 1920 | Story / cross-post IG-TikTok |
| 4:5 (portrait safe) | 1080 × 1350 | Compromis IG, peu utilisé sur X |

**Note technique V9 :** nos templates sortent déjà en 1080×1920 / 1080×1080 / 1920×1080 (cf. `_shared/useFitScale.js`). Pour le 16:9 Twitter natif (1200×675), un export "downscale" depuis 1920×1080 fonctionne — pas besoin de recréer un canvas.

---

## 7. Erreurs à ne jamais reproduire

- ❌ **Score "100/0" pour un résultat** (cf. NarrativeGrid v1) — un score, c'est un nombre de buts, pas un pourcentage.
- ❌ **KPI sans source** ("Moral" sans donnée social).
- ❌ **Saturation de KPIs** — au-delà de 3 KPIs, le lecteur décroche.
- ❌ **Légende "0 → 100"** sans unité (% ? indice ? rang ?).
- ❌ **Logo manquant remplacé en silence** par silhouette grise → afficher un badge `data_gap`.
- ❌ **Police identique partout** — chaque template = une identité.
- ❌ **Accent multi-couleurs** sur le même graphique (vert+orange+violet) → choisir UN accent dominant + neutres.

---

## 8. Checklist "tweet-ready"

Avant qu'un visuel soit considéré exportable :

- [ ] Hook texte rédigé (un des 8 patterns § 4).
- [ ] Stat principale lisible à 2 mètres (taille ≥ 96 px sur 1080).
- [ ] 1 accent + 1-2 neutres max.
- [ ] Aucun `data_gap` masqué — soit data réelle, soit badge explicite.
- [ ] Source visible en bas (statFoot V4 / saison).
- [ ] Aspect adapté au canal cible (cf. `format-strategy.md`).
- [ ] Police cohérente avec la palette du template.

---

## 9. Sources & dernière mise à jour

- Observation directe des comptes cités, avril 2026.
- Doc interne `frontend-design-v2/references/design-tokens.md` pour la cohérence couleur.
- `_shared/useFitScale.js` pour les dimensions natives V8.

**Dernière mise à jour :** 2026-04-25.
