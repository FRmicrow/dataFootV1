---
description: Ce workflow guide l’agent et l’utilisateur dans le processus de commit, test, merge sur `main` et suppression de branche.
---

# gitflow

Ce workflow guide l’agent et l’utilisateur dans le processus de commit, test, merge sur `main` et suppression de branche.

## Pré-requis
- Le travail a été réalisé sur une branche `feature/*` ou correspondante.
- Les modifications sont prêtes à être commitées.

## Étapes
1. **Endosser le Rôle Git** : L'agent doit activer la règle `@git-engineer`.
2. **Vérification d'état** : Exécutez `git status` et `git diff` pour comprendre quels fichiers ont été modifiés.
3. **Planification Git (BLOQUANT)** : **TOUJOURS** faire un plan avant d'agir. Générez ou mettez à jour un artefact `implementation_plan.md` listant :
   - Les fichiers à commiter.
   - Les commandes Git exactes prévues.
   - Le message de commit (conforme à `commit-message-guidelines.md`).
   - La stratégie de fusion vers `main`.
   **VOUS DEVEZ UTILISER l'outil `notify_user` (`BlockedOnUser=true`) POUR FAIRE VALIDER CE PLAN A L'UTILISATEUR.** Interdiction absolue de l'exécuter sans son accord.
4. **Commit et Tests Locaux** : Une fois le plan validé, créez le commit. Appelez impérativement le workflow `/run-tests` pour vérifier qu'aucune régression n'a été introduite par ces ajouts.
5. **Push de la branche** : Poussez le commit sur la branche courante distante (`git push -u origin HEAD`).
6. **Demande d'Intégration vers Main (BLOQUANT)** : Redemandez une confirmation explicite à l'utilisateur : *"Puis-je fusionner la branche <nom> sur la branche `main` ?"*. Ne touchez pas à `main` sans ce feu vert.
7. **Fusion (Merge)** : Basculez sur `main` (`git checkout main`), mettez à jour (`git pull origin main`), et fusionnez la branche (`git merge <branche>`). Poussez `main` (`git push origin main`).
8. **Nettoyage (Suppression de Branche)** : Supprimez la branche de travail localement (`git branch -d <branche>`) et sur le distant (`git push origin --delete <branche>`). Confirmez la suppression à l'utilisateur.

## Notes
- La suppression de la branche à l'étape 8 remplace l'ancienne méthodologie de renommage en `-DONE`.