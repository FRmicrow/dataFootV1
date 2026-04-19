# Implementation Plan — US-452 (Frontend)

## Objectif
Refonte visuelle du header accordion pour mieux mettre en avant les pays et comptabiliser les ligues vs coupes.

## Approche

### 1. Modification `V4LeaguesList.jsx`

#### Logique de breakdown
Pour chaque pays, calculer :
```js
const leagueCount = country.leagues.filter(l => l.competition_type === 'league').length;
const cupCount = country.leagues.filter(l => l.competition_type === 'cup').length;
```

Puis afficher : "3 leagues · 1 cup" ou "1 league" ou "2 cups"

#### Nouveau layout du Accordion header
**Actuel :**
```
[FLAG 32px] Country Name
           [Badge seasons count]
```

**Nouveau :**
```
[FLAG 40px] Country Name
            "3 leagues · 1 cup"
           [Badge total_seasons]
```

**Détails :**
- Flag : 40px (au lieu de 32px) avec shadow
- Country name : `--font-size-lg` bold, alignement vertical centré
- Breakdown : "3 leagues · 1 cup" en texte gris (sous le nom)
- Spacing : utiliser `--spacing-md` ou `--spacing-lg`
- Header bg : implicite (Accordion gère ça), mais ajouter border-bottom

### 2. Modification `V4LeaguesList.css`

#### Mise à jour `.v4-flag-circle`
- Augmenter 32px → 40px
- Ajouter shadow : `var(--shadow-sm)` ou `var(--shadow-md)`

#### Nouvelles classes
- `.v4-accordion-header-wrapper` : container pour le header (flex column)
- `.v4-accordion-header-title` : country name (lg, bold)
- `.v4-accordion-header-meta` : breakdown text (xs, dim)

#### Mise à jour `.v4-country-body`
- Padding : `var(--spacing-lg)` (au lieu de `var(--spacing-md)`)
- Gap du Grid : `var(--spacing-md)`

### 3. Structure du Accordion header

Remplacer :
```jsx
<Stack direction="row" align="center" gap="var(--spacing-md)">
    {flag ou badge}
    <div>
        <h3>{country_name}</h3>
        <span>{count} Competitions</span>
    </div>
</Stack>
```

Par :
```jsx
<div className="v4-accordion-header-wrapper">
    <Stack direction="row" align="center" gap="var(--spacing-md)">
        {flag}
        <div>
            <h3 className="v4-accordion-header-title">{country_name}</h3>
        </div>
    </Stack>
    <div className="v4-accordion-header-meta">
        {leagueCount} {leagueCount > 1 ? 'leagues' : 'league'} · {cupCount} {cupCount > 1 ? 'cups' : 'cup'}
    </div>
</div>
```

### 4. Tests

**Fichier :** `frontend/src/components/v4/pages/league/V4LeaguesList.test.jsx`

Tests à ajouter :
1. Renders header with correct breakdown (3 leagues, 1 cup)
2. Correct plural handling (1 league vs 2 leagues)
3. Header styles applied correctly
4. Grid spacing is correct

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `frontend/src/components/v4/pages/league/V4LeaguesList.jsx` | Ajouter logique breakdown, refactoriser header |
| `frontend/src/components/v4/pages/league/V4LeaguesList.css` | Mise à jour styles flag, ajouter classes header |

---

## Tokens CSS à utiliser

- `--spacing-md`, `--spacing-lg`
- `--font-size-lg`, `--font-size-xs`
- `--font-weight-bold`, `--font-weight-medium`
- `--color-text-main`, `--color-text-dim`
- `--color-border`
- `--shadow-sm`, `--shadow-md`
- `--radius-sm`, `--radius-full`

---

## Validation

1. Flag 40px visible, centré, avec shadow
2. Country name en bold lg
3. Breakdown affiche "3 leagues · 1 cup"
4. Pluriel correct (1 league, 2 leagues, etc.)
5. Spacing cohérent
6. Pas de hardcoded colors/pixels

