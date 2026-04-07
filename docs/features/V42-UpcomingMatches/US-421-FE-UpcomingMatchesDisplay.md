# US-421 — Affichage des matchs à venir (UI V4)

**En tant qu'** Utilisateur final, **je veux** voir les futurs matchs listés dans le détail de ma ligue **afin de** connaître le calendrier de la saison 2025.

## Skills requis
`[FRONTEND]` `[QA]`

## Critères d'acceptation
- [ ] L'onglet "Results" affiche les fixtures dont les scores sont NULL.
- [ ] Le tri chronologique (ascendant) est bien appliqué pour que les futurs matchs suivent les derniers résultats.
- [ ] Le design est cohérent avec le Design System V4 (police, espacement, badges).

## Scénarios de test
1. **Nominal** : Accéder à "/" puis naviguer vers une ligue synchronisée. Ouvrir "Results".
2. **Edge case** : Vérifier que les journées (rounds) sans aucun match fini s'affichent tout de même si des matchs sont planifiés.
3. **Erreur** : Si `fixturesData` est vide, afficher le message "No data recorded".

## Notes techniques
- Composant `FixturesListV4.jsx`.
- Utilisation de `date_label` pour l'heure si disponible.
