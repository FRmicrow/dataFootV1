---
description: Ce workflow initie une nouvelle fonctionnalité et guide l’agent Product Owner dans la collecte des informations et la création des User Stories. Il se déclenche via la commande `/create-new-feature`.
---

# create-new-feature

Ce workflow initie une nouvelle fonctionnalité et guide l’agent Product Owner dans la collecte des informations et la création des User Stories. Il se déclenche via la commande `/create-new-feature`.

## Étapes
1. **Isolation Git (Obligatoire)** : L'agent doit endosser le rôle `@git-engineer`. S'il est positionné sur la branche `main`, il doit s'assurer que celle-ci est bien à jour (`git pull`), puis demander obligatoirement le nom de la fonctionnalité à l'utilisateur pour **créer une nouvelle branche de travail dédiée** (ex: `git checkout -b feature/Vxx-[Nom]`). Le reste de ce workflow doit s'effectuer impérativement sur cette nouvelle branche.
2. **Collecte des informations initiales** : Demandez à l'utilisateur de fournir les détails de la fonctionnalité en utilisant le format suivant :
   ```markdown
   **1. Identification de la Feature :**
   - Version : [ex: V20]
   - Nom : [ex: Match-Simulation-Engine]

   **2. Objectif global (Vision) :**
   [Expliquez le but de cette fonctionnalité en 2-3 phrases]

   **3. Acteurs concernés :**
   - [ex: Utilisateur, Admin, ML Engine]

   **4. Liste des besoins / Fonctionnalités attendues :**
   - [ex: Action 1 attendue]
   - [ex: Action 2 attendue]

   **5. Règles métier & Contraintes :**
   - [ex: Cas limites, performances, règles spécifiques]

   **6. Technique & Dépendances (Optionnel) :**
   - [ex: Modèles de BDD, endpoints, ML]
   ```
2. **Analyse de l'Architecture Existante (Obligatoire)** : Avant de rédiger quoi que ce soit, consultez systématiquement les documents d'architecture dans le dossier `.agents/project-architecture/` (notamment `backend-swagger.yaml`, `backend-apis.md`, `frontend-pages.md`). Liez les besoins fonctionnels à la réalité technique du projet (routes existantes, tables impactées, composants V3 à réutiliser).
3. **Compréhension et Affinage** : Résumez l’objectif général de la fonctionnalité et l'impact technique estimé. Si nécessaire, utilisez la compétence `planning/requirement-gathering` interactivement avec l'utilisateur pour combler les zones d'ombre.
4. **Validation du périmètre** : Synthétisez les informations collectées (exigences, contraintes, architecture ciblée) et demandez à l’utilisateur de confirmer que le plan d'action est correct avant de passer à la création des User Stories.
5. **Calcul de la numérotation des US** :
   - Démarrez la numérotation à la `version` concaténée avec `0`. (Exemple pour V15 : la première US est `US-150`).
   - Incrémentez de 1 pour chaque US (`US-151`, `US-152`...).
   - Si vous dépassez la 9ème US (c'est-à-dire `US-159`), passez directement au format millier pour les suivantes : `US-1501`, `US-1502`, etc.
6. **Attente de validation finale avant création** : Indiquez la liste des User Stories prévues avec leur numérotation calculée. Aucune création de fichier ou de dossier ne doit être faite sans l'accord explicite de l'utilisateur.
7. **Création de la structure** : Une fois validé, créez le dossier `/feature/V<version>-<FeatureName>/`. Pour chaque User Story validée, créez un fichier `.md` nommé selon le modèle `US-<numéro>-<rôle>-<nom-court>.md` (ex. `US-150-front-inscription.md`). Le contenu détaillé de chaque US doit être rédigé par l’agent Product Owner en appelant le workflow `create-user-stories`.
8. **Revue du Backlog** : Informez l’utilisateur que la Feature a été correctement découpée et documentée. Invitez-le à relire les fichiers des User Stories générés dans le dossier.
9. **Passage de relais** : Une fois le backlog validé, conseillez à l'utilisateur de lancer la commande `/implement-feature` pour confier le développement technique à l'équipe.

## Notes
- Ce workflow est la responsabilité exclusive de l'agent assumant le rôle de **Product Owner**.
- La création de dossiers et de fichiers se fait uniquement après validation explicite de l’utilisateur à l'étape 6.
- L'analyse préliminaire du dossier `.agents/project-architecture/` est primordiale pour garantir la viabilité technique des User Stories.