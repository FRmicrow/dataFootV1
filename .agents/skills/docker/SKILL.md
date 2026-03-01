---
name: docker
description: "Construire et optimiser des images Docker et gérer le cycle de vie des conteneurs pour les services du projet."
risk: safe
---

## When to use
Activez cette compétence lors de la préparation d’un service pour le déploiement, lorsque vous devez empaqueter l’application et ses dépendances dans une image Docker fiable et performante.

## Instructions
1. **Choisir une image de base adaptée** : privilégiez des images officielles et légères (Alpine, Distroless) pour réduire les vulnérabilités et le poids de l’image:contentReference[oaicite:5]{index=5}.
2. **Écrire un `Dockerfile`** : 
   - Organisez vos couches de manière logique (installation des dépendances puis copie du code).  
   - Utilisez des multi‑stage builds : séparez les étapes de build et de runtime pour que l’image finale ne contienne que l’application et ses dépendances:contentReference[oaicite:6]{index=6}.
   - Précisez un utilisateur non‑root avec l’instruction `USER`.
   - Exposez les ports requis et définissez le point d’entrée (`CMD` ou `ENTRYPOINT`).
3. **Créer un `.dockerignore`** : listez les fichiers et dossiers à exclure (ex. `.git`, `node_modules`, logs) afin de réduire le contexte de build et le temps de création.
4. **Construire et tester l’image** : exécutez `docker build -t nom:version .`, puis lancez `docker run` pour vérifier que le service fonctionne correctement.
5. **Taguer et publier** : utilisez des tags explicites (ex. `service:1.0.0`), puis poussez l’image dans un registre avec `docker push`.
6. **Automatisation et maintenance** : intégrez la construction de l’image dans la CI (voir `ci-setup-github-actions`), mettez à jour régulièrement les images de base et supprimez les images obsolètes.

## Example
Pour un service Node.js :

    # Stage de build
    FROM node:18-alpine AS build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build

    # Stage de runtime
    FROM node:18-alpine
    WORKDIR /app
    COPY --from=build /app/dist ./dist
    COPY --from=build /app/node_modules ./node_modules
    USER node
    EXPOSE 3000
    CMD ["node", "dist/index.js"]

Cette configuration utilise un multi‑stage build : elle installe les dépendances et compile le projet dans la première étape, puis ne conserve que le code compilé et les dépendances dans l’image finale:contentReference[oaicite:7]{index=7}.

## Limitations
Cette compétence se concentre sur la création et l’optimisation d’images Docker. Elle ne couvre pas l’orchestration multi‑conteneurs (Kubernetes, Swarm) ni le dimensionnement des services, qui sont du ressort du DevOps Engineer.