---
name: containerization-docker
description: "Conteneuriser l’application à l’aide de Docker pour assurer la portabilité et la cohérence."
risk: safe
---

## When to use
Utilisez cette compétence pour encapsuler l’application et ses dépendances dans une image reproductible, que ce soit pour le développement, les tests ou la production.

## Instructions
1. Créez un `Dockerfile` à la racine du projet définissant l’image de base (ex. node:18-alpine), la copie du code et les commandes d’installation.
2. Exposez les ports nécessaires et définissez le point d’entrée (`CMD` ou `ENTRYPOINT`) pour lancer l’application.
3. Créez un fichier `.dockerignore` pour exclure les fichiers inutiles (node_modules, logs, caches) de l’image.
4. Construisez l’image avec `docker build` et testez‑la localement (`docker run`) pour vérifier qu’elle fonctionne comme prévu.
5. Publiez l’image sur un registre (Docker Hub ou registre interne) si elle doit être utilisée pour le déploiement.

## Example
Pour un service Node.js : 
- Utilisez une image de base `node:18-alpine`.
- Copiez `package.json` et `package-lock.json`.
- Exécutez `npm ci`.
- Copiez le code source.
- Exposez le port 3000 et définissez `CMD ["npm","start"]`.

## Limitations
Cette compétence couvre la conteneurisation applicative. L’orchestration (Kubernetes, Docker Compose) et la gestion des volumes et réseaux sont abordées dans d’autres compétences DevOps.