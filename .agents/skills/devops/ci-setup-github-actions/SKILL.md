---
name: ci-setup-github-actions
description: "Configurer un pipeline d’intégration continue avec GitHub Actions."
risk: safe
---

## When to use
Utilisez cette compétence pour automatiser les tests et la vérification du code à chaque commit ou pull request.

## Instructions
1. Créez un fichier de workflow dans `.github/workflows/ci.yml`.
2. Définissez les déclencheurs (`on: push` et `on: pull_request`) et précisez les branches concernées.
3. Spécifiez l’environnement (par exemple `ubuntu-latest`) et la version de Node ou de votre runtime.
4. Ajoutez un job pour installer les dépendances (`npm ci`), exécuter les tests (`npm test`) et faire le linting (`npm run lint`).
5. Configurez un cache des dépendances pour accélérer les exécutions (`actions/cache`).
6. Protégez les branches principales en exigeant que tous les jobs passent avant la fusion.

## Example

    name: CI
    on:
      push:
        branches: [main]
      pull_request:
        branches: [main]
    jobs:
      build-test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - uses: actions/setup-node@v4
            with:
              node-version: '18'
          - run: npm ci
          - run: npm test
          - run: npm run lint

## Limitations
Cette compétence se limite à la configuration d’une pipeline CI de base. La livraison continue (CD) et le déploiement automatique nécessitent des étapes supplémentaires.