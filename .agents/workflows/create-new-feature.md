---
description: Ce workflow initie une nouvelle fonctionnalité et guide l’agent Product Owner dans la collecte des informations et la création des User Stories. Il se déclenche via la commande `/create-new-feature`.
---

# create-new-feature

Ce workflow initie une nouvelle fonctionnalité et guide l’agent Product Owner dans la collecte des informations et la création des User Stories. Il se déclenche via la commande `/create-new-feature`.

## Étapes
1. **Collecte des informations initiales** : demandez à l’utilisateur le numéro de version (ex. 15) et le nom de la fonctionnalité (par exemple "NewFeature"). Vérifiez que le nom est explicite et utilisez des tirets si nécessaire.
2. **Compréhension du besoin** : résumez l’objectif général de la fonctionnalité et confirmez les attentes. Activez ensuite la compétence `planning/requirement-gathering` pour recueillir et structurer les besoins des parties prenantes.
3. **Validation des besoins** : synthétisez les informations collectées (exigences, contraintes, objectifs) et demandez à l’utilisateur de confirmer que tout est correct avant d’aller plus loin.
4. **Calcul de la numérotation des US** : 
   - Si la fonctionnalité comporte jusqu’à 10 User Stories, calculez l’identifiant de base en multipliant le numéro de version par 10. Par exemple pour V15 : base = 15 × 10 = 150, les US seront `US‑150`, `US‑151`, … `US‑159`.  
   - Si la fonctionnalité nécessite plus de 10 US, passez au millier : base = version × 100 + numéro d’ordre. Pour V15, les US au-delà de la dixième seront numérotées `US‑1501`, `US‑1502`, etc.
5. **Attente de validation** : indiquez la numérotation prévue et attendez la confirmation de l’utilisateur. Aucune création de fichier ou de dossier ne doit être faite sans cette validation.
6. **Création de la structure** : une fois validé, créez un dossier `/feature/V<version>-<FeatureName>/`. Pour chaque User Story, créez un fichier `.md` nommé selon le modèle `US-<numéro>-<rôle>-<nom-court>.md` (ex. `US-150-front-inscription.md`). Le contenu doit être rédigé par l’agent Product Owner via le workflow `create-user-stories`.
7. **Rédaction des User Stories** : pour chaque besoin identifié, appelez le workflow `create-user-stories` en fournissant le numéro calculé et le rôle concerné (`front`, `back`, etc.). L’agent doit respecter la structure décrite dans `product-owner.md` et indiquer clairement les critères d’acceptation.
8. **Finalisation et retour utilisateur** : informez l’utilisateur de la création des fichiers et du chemin du dossier. Invitez-le à relire les User Stories et à proposer d’éventuelles modifications.

## Notes
- Ce workflow fait intervenir la compétence `planning/requirement-gathering` pour clarifier les besoins et le workflow `create-user-stories` pour la rédaction détaillée.
- La création de dossiers et de fichiers se fait uniquement après validation explicite de l’utilisateur.
- Respectez toujours la structure et les conventions de nommage fixées par les règles du Product Owner.