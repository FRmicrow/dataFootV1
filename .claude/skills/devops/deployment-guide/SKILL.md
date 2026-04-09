---
name: deployment-guide
description: "Déployer l'application. Utiliser quand on déploie en staging ou production via Docker Compose."
risk: safe
---

## When to use
Activez cette compétence lors de la mise en production ou de la mise en place d’environnements de staging, en coordination avec les compétences CI et conteneurisation.

## Instructions
1. Préparez l’environnement cible en installant les outils nécessaires (Docker, base de données, variables d’environnement).
2. Récupérez la dernière image de l’application depuis le registre ou construisez‑la à partir du `Dockerfile`.
3. Appliquez les migrations de base de données via `database/migration-script` afin d’aligner le schéma.
4. Démarrez les conteneurs ou services (via `docker compose` ou un orchestrateur) et vérifiez qu’ils s’exécutent correctement.
5. Exécutez des tests post-déploiement (smoke tests, requêtes de santé) pour valider que l’application répond comme attendu.
6. Surveillez les logs et métriques après le déploiement et préparez un plan de rollback en cas d’anomalie.

## Example
Sur un serveur de staging, exécutez `docker pull myapp:latest`, appliquez les migrations avec `npm run migrate`, démarrez le service via `docker compose up -d` et vérifiez l’endpoint `/healthcheck`.

## Limitations
Ce guide est générique. Les étapes spécifiques peuvent varier selon l’infrastructure (cloud provider, orchestrateur, base de données) et doivent être adaptées en conséquence.