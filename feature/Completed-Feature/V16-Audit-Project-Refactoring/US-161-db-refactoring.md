# US-161: Harmonisation du schéma et des migrations

**Rôle**: Database Architect

**Objectif**: En tant que Database Architect, je veux revoir la structure de la base de données et les migrations afin de garantir une intégrité parfaite et des performances optimales.

**Tâches**:
- [ ] Vérifier la normalisation des tables existantes.
- [ ] Valider l'utilisation correcte des clés primaires, étrangères et des index.
- [ ] Auditer le fichier `schema.prisma` (ou équivalent) par rapport aux standards de nommage et de structure.
- [ ] Identifier les données redondantes ou mal typées.
- [ ] Créer les scripts de migration nécessaires pour corriger la structure sans perte de données.

**Exigences**:
- Respecter les instructions de `database-architect.md`.
- Garantir la cohérence des relations entre les entités.
- Optimiser les requêtes via une indexation réfléchie.

**Critères d'acceptation**:
- [ ] Le schéma de base de données est validé et documenté.
- [ ] Les migrations s'exécutent sans erreur dans l'environnement de développement.
- [ ] Les contraintes d'intégrité sont correctement appliquées.
