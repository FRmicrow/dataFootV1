# Standards d'Ingénierie & Qualité

Ce document définit les standards communs de développement, de revue et de livraison pour le projet `statFootV3`.

## 1. Conventions de Codage & Structure
- **Langage** : Anglais pour le code (variables, fonctions, classes), Français pour les commentaires si nécessaire.
- **Naming** : `camelCase` (variables), `PascalCase` (classes/composants), `kebab-case` (fichiers).
- **Architecture** : Respectez la séparation des couches (Controller, Service, Repository). Séparez les composants UI de la logique métier.
- **Principes** : Appliquez DRY (Don't Repeat Yourself) et SOLID. Privilégiez la composition à l'héritage.

## 2. Guide des Commits (Git)
- **Format** : `type: description concise` (ex: `feat: ajouter le calcul des probas`).
- **Verbes** : Utilisez l'infinitif.
- **Atomicité** : Un commit = un changement logique. Ne jamais mélanger des refactos et des features.
- **Vérification** : Pas de commit direct sur `main`. Pas de commit avec des fichiers non suivis ou des secrets.

## 3. Checklist de Revue (QA)
Avant de considérer une tâche comme terminée, vérifiez :
- **Conformité au TSD** : Est-ce que l'implémentation respecte fidèlement le contrat de données et l'UI blueprint ?
- **Tests** : Les scénarios de test définis dans l'US ont-ils été exécutés et prouvés ?
- **Sécurité** : Les entrées sont-elles validées (Zod) ? Pas d'exposition de données sensibles ?
- **Performance** : Pas de renders inutiles (React) ou de requêtes SQL non indexées ?
- **Propreté** : Suppression du code mort, des logs de debug et formatage correct.

## 4. Documentation
- Mettez à jour le Swagger si les endpoints changent.
- Documentez les nouvelles variables d'environnement dans le README.
