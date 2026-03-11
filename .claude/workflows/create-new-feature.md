---
description: Initier une nouvelle feature — TSD, branche Git, User Stories. Se déclenche avec /create-new-feature ou quand on démarre une nouvelle feature.
---

# create-new-feature

Ce workflow initie une nouvelle fonctionnalité et guide l’agent Product Owner dans la collecte des informations et la création des User Stories. Il se déclenche via la commande `/create-new-feature`.

## Étapes

### Phase 0 : Raffinement & Contexte (Product Owner)
1. **Dialogue Initial** : Engagez une discussion approfondie avec l'utilisateur pour comprendre le "Pourquoi" et le "Quoi". Posez toutes les questions nécessaires pour éliminer les zones d'ombre.
2. **Identification de la Feature** :
   - Version : [ex: V29]
   - Nom : [ex: Live-Betting-Dashboard]
3. **Vision & Objectifs** : Déterminez les piliers de la feature (Ex: Performance, UX premium, Intégrité des données).

### Phase 1 : Spécifications Techniques - Le TSD (Product Architect)
4. **Analyse d'Impact** : Analysez `.claude/project-architecture/` pour identifier les points de contact.
5. **Rédaction du TSD** : Avant tout code, rédigez un document `technical-spec.md` (ou `feature-spec.md`) comprenant :
   - **Data Contract** : Schéma SQL précis (tables/colonnes) et contrats API (Zod).
   - **UI Blueprint** : Layout exact et liste des composants V3 à utiliser.
   - **Logic & Edge Cases** : Gestion des erreurs, états vides, etc.
6. **Validation du TSD** : Obtenez l'accord explicite de l'utilisateur sur ce document avant de découper en US.

### Phase 2 : Isolation & Structure (Git Engineer)
7. **Création de Branche** : Basculez sur une nouvelle branche fraîche (ex: `feature/Vxx-[Nom]`).
8. **Initialisation du Dossier** : Créez le dossier `feature/Vxx-[Nom]/` et déplacez-y le TSD validé.

### Phase 3 : Définition des US & Tests (Product Owner)
9. **Découpage en US** : Définissez les User Stories basées sur le TSD.
10. **Intégration des Tests (QA Gatekeeper)** : Chaque US **doit** inclure une section "Scénarios de Test / Preuves" pour éviter le "raccourci technique".
11. **Numérotation** : Utilisez le système standard (V15 -> US-150, US-151... ou US-1501 si > 9 US).
12. **Création des Fichiers** : Générez les fichiers `US-<num>-<role>-<nom>.md` dans le dossier de la feature.

### Phase 4 : Lancement (Full-Stack Engineer)
13. **Validation Finale** : Présentez le backlog et le TSD à l'utilisateur.
14. **Passage de Relais** : Une fois validé, lancez `/implement-feature`.

## Notes
- Ce workflow est la responsabilité exclusive de l'agent assumant le rôle de **Product Owner**.
- La création de dossiers et de fichiers se fait uniquement après validation explicite de l’utilisateur à l'étape 6.
- L'analyse préliminaire du dossier `.claude/project-architecture/` est primordiale pour garantir la viabilité technique des User Stories.
- **IMPORTANT** : Une fois la feature terminée et validée, le dossier de documentation `feature/Vxx-[Nom]/` **doit** être déplacé vers `feature/Completed-Feature/` et **pushé** sur le dépôt.