# Implementation Plan — US-451 (Frontend)

## Objectif
Enrichir LeagueCard avec une progress bar visuelle (J32/38) pour les ligues et un badge de round pour les coupes.

## Approche

### 1. Modification `LeagueCard.jsx`

#### Props à ajouter
- `competition_type` : 'league' | 'cup' | 'super_cup'
- `current_matchday` : number | null
- `total_matchdays` : number | null
- `latest_round_label` : string | null
- `leader` : { club_id, name, logo_url } | null

#### Layout actuel vs Nouveau
**Actuel :**
```
[LOGO] Name
       UEFA · France
```

**Nouveau pour league avec données :**
```
[LOGO] Name
       UEFA · France
[Progress bar] J32/38
Leader: [logo] PSG
```

**Nouveau pour cup :**
```
[LOGO] Name
       UEFA · France
Quarter-finals
```

**Nouveau pour league sans données :**
```
[LOGO] Name
       UEFA · France
(rien)
```

#### Changements à LeagueCard.jsx
1. Ajouter props pour `competition_type`, `current_matchday`, `total_matchdays`, `latest_round_label`, `leader`
2. Ajouter une section après le country meta qui affiche :
   - Si league + current_matchday: `<ProgressSection matchday={current_matchday} total={total_matchdays} />`
   - Si cup + latest_round_label: `<div className="ds-league-card-round">{latest_round_label}</div>`
   - Si league + leader: `<LeaderSection leader={leader} />`
3. Extraire ProgressSection et LeaderSection en composants internes ou inline

### 2. Modification `LeagueCard.css`

Ajouter styles pour :
- `.ds-league-card-progress` : container pour progress
- `.ds-league-card-progress-label` : "J32/38" texte
- `.ds-league-card-progress-bar` : barre visuelle (width: 85%, bg: --color-primary-400)
- `.ds-league-card-round` : texte du round pour cup
- `.ds-league-card-leader` : container pour leader
- `.ds-league-card-leader-logo` : logo 20px du leader
- `.ds-league-card-leader-name` : nom du leader

### 3. Modification `V4LeaguesList.jsx`

Passer les nouveaux props à LeagueCard :
```js
<LeagueCard
    key={league.league_id}
    id={league.league_id}
    name={league.name}
    logo={league.logo_url}
    countryName={country.country_name}
    countryFlag={country.country_flag}
    competition_type={league.competition_type}
    current_matchday={league.current_matchday}
    total_matchdays={league.total_matchdays}
    latest_round_label={league.latest_round_label}
    leader={league.leader}
    onClick={() => handleLeagueClick(league)}
/>
```

### 4. Tests

**Fichier :** `frontend/src/design-system/components/LeagueCard.test.jsx` (créer si absent)

Tests snapshots pour :
1. League avec progression et leader
2. League avec progression, sans leader
3. Cup avec round label
4. League sans données
5. Responsive : vérifier que tout tient dans 260px

---

## Considérations de design

- **Progress bar :** Largeur = (current_matchday / total_matchdays) × 100%
  - Fond : `--color-slate-800`
  - Barre remplie : `--color-primary-400` avec transition smooth
  - Texte : "J32/38" (sans 'Matchday', juste numéro/numéro)

- **Leader :** Logo 20px + nom aligné à gauche
  - Label "Leader:" optionnel avant
  - Si déborde, ellipsis sur le nom
  - Spacing : `--spacing-sm` (8px)

- **Cup round :** Texte simple "Quarter-finals"
  - Pas d'icône, pas d'accent spécial
  - Même color que meta (dim)

- **Hover :** Existing translate + shadow déjà appliquée, nouvelle section visible au hover

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `frontend/src/design-system/components/LeagueCard.jsx` | Ajouter props + sections progress/leader/round |
| `frontend/src/design-system/components/LeagueCard.css` | Ajouter styles pour progress bar, leader, round |
| `frontend/src/components/v4/pages/league/V4LeaguesList.jsx` | Passer nouveaux props |
| `frontend/src/design-system/components/LeagueCard.test.jsx` | Créer tests snapshots |

---

## Tokens CSS à utiliser

- Couleurs : `--color-primary-400`, `--color-slate-800`, `--color-text-dim`, `--color-text-main`
- Spacing : `--spacing-sm`, `--spacing-md`
- Radius : `--radius-sm`
- Transition : `--transition-base`
- Font-size : `--font-size-xs`, `--font-size-sm`
- Font-weight : `--font-weight-medium`, `--font-weight-black`

**Aucun pixel hardcodé, aucun hex color direct.**

---

## Validation

1. Visual check : progress bar + leader visibles pour Bundesliga
2. Cup check : "Quarter-finals" visible pour DFB-Pokal, pas de leader/progress
3. No data : card minimaliste pour compétitions sans données
4. Mobile : tout tient dans 260px, pas d'overflow

