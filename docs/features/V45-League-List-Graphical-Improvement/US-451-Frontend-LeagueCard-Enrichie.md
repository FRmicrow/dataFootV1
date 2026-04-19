# US-451 — Frontend: Refonte LeagueCard avec progress bar et leader

**En tant que** user, **je veux** voir la progression de chaque ligue (J32/38) et son leader actuel sur la carte, **afin de** avoir une vue riche en contexte sans naviguer.

## Skills requis
`[FRONTEND]` `[QA]`

## Critères d'acceptation
- [ ] LeagueCard reçoit props : `current_matchday`, `total_matchdays`, `latest_round_label`, `competition_type`, `leader`
- [ ] League avec `current_matchday != null` affiche progress bar : "J32/38" + barre visuelle 85%
- [ ] Cup avec `latest_round_label != null` affiche texte du round : "Quarter-finals"
- [ ] Leader affiche nom + logo 20px alignés horizontalement
- [ ] Leader caché pour cup ou si null
- [ ] Card hover : translateY(-4px) + shadow-xl (existant) + nouveau contenu visible
- [ ] Aucun hardcoded color/pixel — tokens CSS uniquement
- [ ] Tests frontend : snapshots LeagueCard avec tous les états (league/cup, avec/sans leader)

## Scénarios de test

1. **Nominal — League avec progression et leader**
   - LeagueCard reçoit : competition_type="league", current_matchday=32, total_matchdays=38, leader={name: "PSG", logo_url: "..."}
   - Affichage : progress bar "32/38" avec barre remplie à 84%, leader PSG visible

2. **Cup sans leader**
   - LeagueCard reçoit : competition_type="cup", latest_round_label="Quarter-finals", leader=null
   - Affichage : texte "Quarter-finals", pas de barre de progression, pas de leader

3. **League sans données**
   - LeagueCard reçoit : competition_type="league", current_matchday=null, leader=null
   - Affichage : card minimaliste (état actuel), aucun bonus visuel

4. **Design réactif**
   - Vérifier que la progress bar + leader tiennent dans la card 260px sur mobile/desktop
   - Aucun overflow ou texte coupé

## Notes techniques

- **Fichiers modifiés :** 
  - `frontend/src/design-system/components/LeagueCard.jsx`
  - `frontend/src/design-system/components/LeagueCard.css`
- **Nouvelles classes :** `.ds-league-card-progress`, `.ds-league-card-progress-bar`, `.ds-league-card-leader`
- **Tokens CSS à utiliser :** `--color-primary-400` (progress bar), `--transition-base`, `--spacing-sm`
- **Dépendance :** props depuis V4LeaguesList.jsx (implémentée en US-452)
