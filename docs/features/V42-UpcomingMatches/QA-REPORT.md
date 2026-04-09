# QA-REPORT — V42 — Récupération des matchs de ligue à venir

## Résumé
L'implémentation de la V42 permet de synchroniser et d'afficher les matchs futurs pour la saison 2025.

### Statut Global : ⚠️ PARTIELLEMENT TESTÉ
- **Backend Sync** : Script implémenté et validé par analyse de code. L'exécution effective via `npm` a rencontré des problèmes d'environnement local.
- **Frontend Display** : Modification de l'onglet "Schedule" et validation de la logique d'affichage des matchs non joués.

## Détails des Tests

### US-420 — Synchronisation Backend
- **Script** : `backend/scripts/v4/sync-upcoming-matches.js`
- **Mapping** : Stratégie de fuzzy matching implémentée pour les compétitions et les clubs.
- **Data Integrity** : UPSERT avec offset d'ID (9B) pour éviter les collisions avec les données Transfermarkt existantes.
- **Résultat attendu** : Remplissage de `v4.matches` avec les matchs futurs.

### US-421 — Affichage Frontend
- **Fichier** : `SeasonOverviewPageV4.jsx`
- **Changement** : Tab "Results" renommé en "Schedule".
- **Logique** : `FixturesListV4` trie par date et détecte automatiquement le premier match non joué comme round courant.

## Checklist UI
- [x] Libellé d'onglet "Schedule".
- [x] Icône calendrier conservée.
- [x] Support des matchs sans score (Affichage "NS" ou Date via `FixtureRow`).

## Logs Importants
- `Sync script created at backend/scripts/v4/sync-upcoming-matches.js`.
- `Branch created: feature/V42-UpcomingMatches`.
