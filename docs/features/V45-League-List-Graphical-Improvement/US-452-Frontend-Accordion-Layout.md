# US-452 — Frontend: Refonte layout accordion (header visuel)

**En tant que** user, **je veux** que le header d'un pays soit plus impactant et dense, **afin de** mieux différencier les groupes et lire les infos rapidement.

## Skills requis
`[FRONTEND]` `[QA]`

## Critères d'acceptation
- [ ] Accordion header (flag + country name) remis en page avec flag 40px + shadow
- [ ] Country name en `--font-size-lg` bold, alignement vertical centré
- [ ] Sous-ligne : badge breakdown "3 leagues · 2 cups" (ex: "4 leagues · 1 cup")
- [ ] Header bg : `--color-slate-800`, border-bottom `--color-border` 1px
- [ ] Accordion body padding : `var(--spacing-lg)`, gap augmenté
- [ ] Grid LeagueCard : `gap: var(--spacing-md)` (espacement plus dense)
- [ ] Pas de hardcoded colors/pixels — tokens CSS uniquement
- [ ] Tests frontend : snapshots Accordion avec différents pays (1-2-5+ ligues)

## Scénarios de test

1. **Nominal — Pays avec plusieurs ligues et coupes**
   - Country : "Allemagne", 4 competitions (3 leagues + 1 cup)
   - Vérifier header affiche :
     - Flag 40px ✓
     - "Allemagne" bold lg
     - "3 leagues · 1 cup" sous-badge
     - Bg slate-800 + border ✓

2. **Single league (pays avec une seule compétition)**
   - Country : "Portugal", 1 competition (league)
   - Vérifier badge : "1 league" (plural correct)

3. **Tous les pays visibles (dérouler accordions)**
   - Vérifier que les espacements et alignements sont cohérents across all countries

4. **Mobile (< 600px)**
   - Vérifier que flag + country name tiennent sur une ligne
   - Badge breakdown sur la ligne suivante ou intégré sans overflow

## Notes techniques

- **Fichiers modifiés :**
  - `frontend/src/components/v4/pages/league/V4LeaguesList.jsx`
  - `frontend/src/components/v4/pages/league/V4LeaguesList.css`
- **Nouvelles classes :** `.v4-accordion-header-wrapper`, `.v4-accordion-header-meta`
- **Logique :** Recalculer breakdown `{leagues: X, cups: Y}` par pays depuis `competitions` array (fait en JS)
- **Composants :** Utiliser Accordion existant de design system (pas modifier sa structure)
- **Dépendance :** Props enrichis de LeagueCard viennent de US-450/US-451
