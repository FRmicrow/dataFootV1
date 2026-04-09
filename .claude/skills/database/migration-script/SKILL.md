---
name: migration-script
description: "Écrire des migrations PostgreSQL sûres. Utiliser quand on modifie le schéma DB — CREATE, ALTER ou DROP une table."
risk: critical
---

## When to use
Activez cette compétence lorsqu’il est nécessaire de modifier la structure de la base (ajout, suppression ou modification de tables ou colonnes) pour suivre les évolutions applicatives.

## Instructions
1. Rédigez un script `up` pour appliquer les modifications (CREATE, ALTER, DROP) et un script `down` pour revenir en arrière.
2. Encapsulez les modifications dans une transaction afin de garantir l’atomicité (rollback complet en cas d’échec).
3. Testez la migration sur une copie de la base ou dans un environnement de staging pour anticiper les problèmes.
4. Planifiez la migration en production en minimisant l’impact (période creuse) et en effectuant des sauvegardes préalables.
5. Documentez le but de la migration, les impacts sur les données et les étapes de rollback en cas de problème.

## Example
Pour renommer une colonne `username` en `login` dans la table `users`, écrivez un `ALTER TABLE users RENAME COLUMN username TO login;` dans le script `up` et l’inverse dans le script `down`.

## Limitations
Les migrations doivent être synchronisées avec le code applicatif. Manipuler de grandes tables en production peut nécessiter des stratégies spécifiques (verrouillage, temps d’arrêt).