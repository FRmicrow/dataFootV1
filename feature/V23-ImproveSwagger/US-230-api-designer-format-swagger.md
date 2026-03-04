# US-230: Format backend-swagger.yaml

## Informations Générales
- **Feature** : V23-ImproveSwagger
- **Rôle principal** : `@api-designer` / `@backend-engineer`
- **Priorité** : Haute

## Objectif
Corriger les erreurs de formatage et de linting dans le fichier `.agents/project-architecture/backend-swagger.yaml` pour qu'il soit un fichier OpenAPI 3.0 parfaitement valide et prêt à être utilisé comme contrat d'API par toutes les équipes.

## Description détaillée
Le fichier Swagger actuel contient de nombreuses erreurs identifiées par le linter `redocly` :
- L'indentation des paramètres est parfois erronée, ce qui casse la structure YAML.
- Il manque des `operationId` sur de nombreuses routes (70 warnings).
- L'attribut `version` de `info` est formaté comme un nombre entier au lieu d'une chaîne de caractères (ex: `"3.0"` au lieu de `3.0`).
- Les définitions de sécurité (`security-defined`) sont absentes pour les endpoints, ce qui lève des erreurs. Pour cet environnement local, il faudra soit ajouter une définition de sécurité ouverte ou désactiver/ignorer cette règle de linter pour ne pas bloquer les agents.
- Quelques descriptions de tags sont manquantes.

L'objectif de cette User Story est de nettoyer l'ensemble de ces points.

## Critères d'Acceptation (DoD)
- [ ] Le fichier `backend-swagger.yaml` est un YAML syntaxiquement valide.
- [ ] Tous les `operationId` manquants ont été définis avec des noms cohérents (ex: `getGlobalStatsV3`).
- [ ] L'erreur `struct` concernant la `version` est corrigée.
- [ ] Les erreurs liées à la sécurité (`security-defined`) sont gérées (soit résolues par une sécurité par défaut, soit configurées pour être ignorées par Redocly).
- [ ] La commande `npx @redocly/cli lint .agents/project-architecture/backend-swagger.yaml` renvoie 0 erreur.

## Règles métier
Respecter les standards d'écriture OpenAPI 3. Ne modifier aucun schéma de données ni aucune logique métier existante lors de ce nettoyage, uniquement le formatage.
