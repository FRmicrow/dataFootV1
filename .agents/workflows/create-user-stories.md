---
description: Ce workflow guide l’agent Product Owner pour créer et valider des User Stories à partir des besoins recueillis.
---

# create-user-stories

Ce workflow guide l’agent Product Owner pour créer et valider des User Stories à partir des besoins recueillis.

## Étapes
1. **Collecte des exigences spécifiques** : Demandez à l'utilisateur de fournir les informations concernant la User Story à en utilisant le format suivant :
   ```markdown
   **1. Contexte :**
   - Feature parente : [ex: V20 - Match-Simulation-Engine]
   - Couche technique ciblée : [ex: Backend & Database / Frontend / Machine Learning]

   **2. Intention (Qui & Quoi) :**
   [Ex: En tant qu'admin, je veux pouvoir sauvegarder le résultat des ML générés pour un match précis.]

   **3. Raison (Pourquoi) :**
   [Ex: Afin de pouvoir comparer les prédictions du modèle avec la réalité après le match.]

   **4. Détails / Scénarios (Critères d'Acceptation) :**
   - [Ex: L'API doit exposer une route POST `/api/simulations`]
   - [Ex: Le payload doit contenir l'ID du match, les probas 1N2 et la date de simulation]
   - [Ex: Si le match a déjà une simulation pour cette version de modèle, écraser l'existante]
   ```
   Utilisez la compétence `planning/requirement-gathering` si besoin pour affiner ces informations.
2. Pour chaque besoin identifié, calculez l’identifiant de la User Story en fonction du numéro de version de la fonctionnalité :
   - Pour les dix premières User Stories, multipliez le numéro de version par 10 et ajoutez un incrément (ex. V15 → `US‑150`, `US‑151`, …, `US‑159`).
   - Au‑delà de dix User Stories, passez aux milliers en multipliant le numéro de version par 100 et en ajoutant l’ordre de l’histoire (ex. V15 → `US‑1501`, `US‑1502`, etc.).
   Rédigez ensuite une User Story en suivant la règle `product-owner.md` et en appliquant la structure et la numérotation définies.
3. Définissez les critères d’acceptation et les conditions de satisfaction pour chaque User Story.
4. Classez les User Stories par priorité et assurez‑vous qu’elles sont indépendantes et compréhensibles.
5. Soumettez les User Stories à l’équipe pour revue et ajustement.

## Notes
- Enregistrez chaque User Story dans un fichier `.md` nommé selon le modèle `US-<numéro>-<rôle>-<nom-court>.md` (par exemple `US-150-front-inscription.md`) et placez ce fichier dans le dossier correspondant à la fonctionnalité : `/feature/V<version>-<FeatureName>/`.
- Ce workflow se concentre sur la génération de User Stories. La planification et l’estimation des User Stories sont traitées par d’autres compétences.