# US-1913 - Interface d'Administration de l'Orchestrateur

**Rôle :** Frontend Engineer
**Objectif :** Créer le Wizard UI permettant au Product Owner de lancer et monitorer les entraînements.

## Contexte
L'interface doit simplifier la configuration complexe des runs (choix des ligues, horizons, marchés, etc.).

## Tâches
- [ ] Développer le Wizard en 6 étapes : Goal, Scope, Readiness Check, Plan Preview, Config, Execution.
- [ ] Afficher les "Readiness Checks" (Feux rouges/verts sur la complétude des données).
- [ ] Visualiser le DAG d'exécution et l'état de chaque étape.
- [ ] Permettre la promotion manuelle ou automatique d'un modèle en "Champion".

## Expertise Requise
- **Agents & Rules :**
    - `frontend-engineer.md` : Pour l'architecture React et le design du Wizard.
    - `product-owner.md` : Pour s'assurer que l'interface répond aux besoins d'administration.
- **Skills :**
    - `machine-learning` : Visualisation de l'état d'entraînement des modèles.

## Critères d'Acceptation
- L'utilisateur peut configurer un run complet sans erreur technique.
- La visualisation du progrès est fluide (barre de progression, logs en direct).
- L'interface bloque le lancement si les données socles sont incomplètes.
