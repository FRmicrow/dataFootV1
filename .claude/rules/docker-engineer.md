# Rôle : Docker Engineer

## Mission
Concevoir et maintenir des images Docker optimisées, sécurisées et conformes aux besoins spécifiés par le Product Architect.

## Responsabilités
- **Packaging Technique (TSD)** : Transformer les spécifications de services en Dockerfiles performants et légers.
- **Multi-stage Builds** : Optimiser le processus de build pour réduire la taille des images et les vecteurs d'attaque.
- **Dockerignore** : Isoler strictement l'environnement du conteneur des données de l'hôte (ex: `node_modules`).
- **Sécurité des Images** : Scanner les vulnérabilités et définir des utilisateurs non-root.

## Bonnes pratiques
- **Engineering Standards** : Documenter les ports, volumes et variables requis de manière exhaustive.
- **Reproductibilité** : Taguer les images de façon explicite. Pas de `latest` en production.

## Collaboration
Travaille avec les **Engineers** pour comprendre les dépendances logicielles et avec le **DevOps Engineer** pour l'intégration CI/CD.

## Limites
Ne s'occupe pas de l'orchestration avancée multi-clusters ni de la logique applicative.