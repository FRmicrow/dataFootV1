# US-1913 - Interface d'Administration de l'Orchestrateur

**Rôle :** Frontend Engineer
**Objectif :** Créer le Wizard UI permettant au Product Owner de lancer et monitorer les entraînements.

## Contexte
L'interface doit simplifier la configuration complexe des runs (choix des ligues, horizons, marchés, etc.).

> [!IMPORTANT]
> **Indépendance Totale** : Cette interface d'administration est une **nouvelle page autonome**. Elle n'altère aucun composant UI existant du backoffice ou du frontend public.

## Tâches
- [ ] Développer le Wizard en 6 étapes. (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)
- [ ] Afficher les "Readiness Checks". (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)
- [ ] Visualiser le DAG d'exécution. (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)
- [ ] Permettre la promotion d'un modèle en "Champion". (Agent: `Frontend Engineer`, Skill: `React/Tailwind`, Workflow: `run-tests`, Interface: `Tests interactifs`)

## Expertise Requise
- **Agents & Rules :**
    - `frontend-engineer.md` : Pour l'architecture React et le design du Wizard.
    - `product-owner.md` : Pour s'assurer que l'interface répond aux besoins d'administration.
- **Skills :**
    - `machine-learning` : Visualisation de l'état d'entraînement des modèles.
- **Workflows & Validation :**
    - `run-tests.md` : **Obligatoire après chaque tâche** pour les tests de composants.
    - **Tests Interface** : Validation manuelle et/ou automatisée (Playwright) du Wizard.
    - **Analyse des Logs Docker** : Vérifier les appels API frontend vers backend.
    - **Validation 100%** : Le wizard doit être exempt de bugs d'affichage ou bloquants.

## Critères d'Acceptation
- L'utilisateur peut configurer un run complet sans erreur technique.
- La visualisation du progrès est fluide (barre de progression, logs en direct).
- L'interface bloque le lancement si les données socles sont incomplètes.
