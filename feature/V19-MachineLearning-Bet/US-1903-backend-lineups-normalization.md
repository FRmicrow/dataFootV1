# US-1903 - Normalisation des Lineups et Temps de Jeu

**Rôle :** Backend Engineer
**Objectif :** Normaliser les compositions d'équipes et enrichir les minutes de jeu via les événements de substitution.

## Contexte
Le calcul de `Lineup Strength` nécessite de savoir quels joueurs ont débuté et combien de temps ils ont joué. Les données brutes sont dans `V3_Fixture_Lineups`.

## Tâches
- [ ] Parser `starting_xi` et `substitutes` vers la table `V3_Fixture_Lineup_Players`.
- [ ] Identifier les minutes d'entrée (`sub_in_minute`) et de sortie (`sub_out_minute`) en croisant avec `V3_Fixture_Events` (type 'Subst').
- [ ] Gérer les cas d'événements manquants (présence dans `starting_xi` sans `sub_out` = 90 min).
- [ ] Stocker les métadonnées (grid position, shirt number, player name).

## Expertise Requise
- **Agents & Rules :**
    - `backend-engineer.md` : Pour le parsing complexe et le croisement de données.
    - `global-coding-standards.md` : Pour la maintenabilité du code.
- **Skills :**
    - `machine-learning` : Compréhension de l'importance des variables de lineup pour le scoring futur.

## Critères d'Acceptation
- La table `V3_Fixture_Lineup_Players` est remplie pour tous les fixtures possédant des compositions.
- Les minutes de substitution sont cohérentes avec le déroulement du match.
- Le croisement Fixtures <-> Lineups <-> Events fonctionne sans perte de données.
