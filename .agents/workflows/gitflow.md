---
description: Ce workflow guide l’agent et l’utilisateur dans un processus de travail Git sécurisé pour livrer une feature sans introduire de régressions.
---

# gitflow

Ce workflow guide l’agent et l’utilisateur dans un processus de travail Git sécurisé pour livrer une feature sans introduire de régressions.
Il vérifie l’état de la branche, la synchronisation avec `main`, exécute les tests via le workflow `run-tests`, puis propose la fusion sur `main` (directement ou via PR selon la politique du projet).

## Pré-requis
- Le dépôt dispose d’une branche `main`.
- Les conventions de commit suivent la règle `commit-message-guidelines.md`.
- Les revues suivent `review-checklist.md`.
- Les tests sont exécutables via le workflow `run-tests.md`.

## Étapes

### 1) Identifier la branche de travail et son intention
1. Vérifiez sur quelle branche vous êtes.
2. Vérifiez que la branche correspond bien à l’US/feature en cours (nom explicite).
3. Si vous êtes sur `main`, créez (ou basculez vers) une branche de travail dédiée avant toute modification.

### 2) Vérifier l’état local et synchroniser les références
1. Vérifiez l’état du working tree (pas de changements non commit).
2. Récupérez l’état distant (fetch) pour comparer correctement la branche et `main`.

### 3) Vérifier si la branche est à jour avec `main`
1. Comparez la branche courante avec `main` pour déterminer si elle est :
   - **À jour**
   - **En avance** (normal : contient le travail local)
   - **En retard** (risque de conflits / régressions)
   - **Divergente** (merge/rebase nécessaire)
2. Si la branche est en retard sur `main`, demandez explicitement à l’utilisateur :
   - Est-ce normal (ex : travail long, dépendance en attente, PR déjà ouverte, freeze volontaire) ?
   - Souhaite-t-il mettre à jour maintenant ?
3. Si l’utilisateur confirme qu’il faut mettre à jour :
   - Stratégie recommandée : **rebase** de la branche sur `main` pour éviter les merges inutiles.
   - Alternative : **merge main -> branche** si c’est la politique de l’équipe ou si le rebase est risqué.

> Règle : ne pas continuer vers le commit final si la branche est en retard **et** que l’utilisateur n’a pas validé la situation comme “normale”.

### 4) Préparer le commit
1. Vérifiez que le code respecte `global-coding-standards.md`.
2. Vérifiez que les changements répondent bien à l’US (ou au scope de la branche).
3. Assurez-vous qu’aucun secret / donnée sensible n’est inclus.
4. Regroupez les changements en commits atomiques si nécessaire.
5. Rédigez un message de commit conforme à `commit-message-guidelines.md` (inclure une référence US/feature si applicable).

### 5) Commit puis push sur la branche distante
1. Créez le commit local.
2. Poussez (`push`) sur la branche distante correspondante (pas sur `main` à ce stade).
3. Vérifiez que le push est bien effectué et que la branche distante est à jour.

### 6) Exécuter les tests (garde-fou obligatoire)
1. Appelez le workflow `/run-tests` pour exécuter les suites de tests et analyser les résultats.
2. Si un test échoue :
   - Bloquez le processus de livraison.
   - Corrigez, recommitez, repoussez sur la branche.
   - Relancez `/run-tests` jusqu’à succès.

### 7) Validation avant intégration dans `main`
1. Une fois les tests OK, demandez à l’utilisateur :
   - **“Puis-je intégrer sur `main` ?”**
2. Si l’utilisateur répond **non** :
   - Arrêtez le workflow.
   - Laissez la branche telle quelle (prête, testée, poussée).
3. Si l’utilisateur répond **oui** :
   - Vérifiez la politique projet :
     - Si `main` est protégé : ouvrir une PR/MR et demander la validation/revue.
     - Si push direct autorisé : continuer les étapes ci-dessous.

### 8) Intégration dans `main`
1. Passez sur `main`.
2. Synchronisez `main` avec le distant (pull).
3. Intégrez le travail :
   - Option A (recommandée) : merge de la branche dans `main` (fast-forward si possible, sinon merge commit selon politique).
   - Option B : rebase/ff selon stratégie décidée.
4. Exécutez un dernier contrôle rapide (optionnel mais recommandé) :
   - relancer `/run-tests` sur `main` si votre CI n’est pas instantanée ou si vous voulez une sécurité locale.

### 9) Push de `main`
1. Poussez `main` vers le distant.
2. Vérifiez que `main` distant est bien à jour.

### 10) Nettoyage : renommer l’ancienne branche en `-DONE`
1. Revenez sur l’ancienne branche de travail.
2. Renommez-la localement en ajoutant le suffixe `-DONE` (ex : `feature/V16-audit` -> `feature/V16-audit-DONE`).
3. Poussez le renommage (création de la nouvelle branche distante si nécessaire).
4. Optionnel recommandé :
   - Supprimer l’ancienne branche distante non suffixée si votre politique le permet (sinon la conserver en lecture seule).

## Notes
- Ce workflow vise à réduire les régressions : aucune intégration sur `main` ne doit se faire sans `/run-tests` réussi.
- Si votre dépôt impose des PR/MR, remplacez “push sur main” par “ouvrir PR/MR + merge après approbation”.
- En cas de conflits lors de la mise à jour avec `main`, privilégiez une résolution explicite et retestez systématiquement.