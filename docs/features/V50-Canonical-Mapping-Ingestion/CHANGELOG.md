# Changelog — V50-Canonical-Mapping-Ingestion

## [1.0.0] - 2026-04-29

### Added
- Script d'ingestion massive `backend/scripts/v4/ingest_mappings.js` supportant les compétitions, équipes, stades et personnes.
- Documentation complète de la feature (TSD, US-500 à US-503, QA-REPORT).
- Mapping de 60 compétitions, 2 458 équipes, 1 793 stades et 6 276 personnes entre Transfermarkt et Flashscore.

### Fixed
- Résolution des compétitions par nom lorsque l'ID court Flashscore ne correspondait pas à l'ID long Transfermarkt en base.
- Optimisation des performances d'insertion pour les gros volumes de données via des transactions par batch.
