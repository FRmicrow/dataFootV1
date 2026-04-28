# US-483 — Intégration dans le Pipeline d'Ingestion

**En tant que** développeur, **je veux** intégrer le service de résolution dans les processus d'importation de données **afin d'** automatiser l'alignement des sources.

## Skills requis
`[BACKEND]` `[QA]`

## Critères d'acceptation
- [ ] Les services d'ingestion (ex: `FlashscoreIngestionServiceV4`) utilisent `ResolutionServiceV4` au lieu de chercher les IDs manuellement.
- [ ] Les nouveaux scripts d'importation ne peuvent plus insérer d'ID source direct dans les colonnes de FK.

## Scénarios de test
1. **Import Flashscore** : Lancer un import de match. Vérifier que les clubs sont résolus et mappés correctement.
2. **Import TM** : Vérifier que l'import TM continue de fonctionner via le mapping existant.

## Notes techniques
- Focus sur `FlashscoreIngestionServiceV4` et les scrapers de matches.
