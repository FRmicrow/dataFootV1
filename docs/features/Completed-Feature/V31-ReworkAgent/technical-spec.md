# Technical Spec : V31-ReworkAgent-V2 (Anthropic-Inspired)

## Goal
L'objectif est de refondre intégralement le système d'agents en créant une version **V2** (dans `.agents/V2/`) basée sur les standards d'Anthropic. Cette version met l'accent sur l'intentionnalité du design, l'excellence visuelle, et une rigueur technique absolue (Tests, Optimisation, Design System).

## Key Principles (Anthropic Rework)
1. **Design Thinking First** : L'agent doit définir une philosophie esthétique avant de coder.
2. **"Flavor" & Tone** : Sortir du "generic AI" (purple/white) pour des styles marqués.
3. **Multi-Step execution** : Séparation stricte entre conception (Philosophy) et réalisation.
4. **V2 Isolation** : Tous les nouveaux fichiers sont créés dans `.agents/V2/`.

## Data Contract & Structure (V2)
Le dossier `.agents/V2/` sera structuré comme suit :
- `/rules/` : Règles de comportement et standards (V2).
- `/skills/` : Compétences granulaires avec instructions "Design First".
- `/workflows/` : Processus opérationnels avec points de contrôle qualité.

## Proposed Changes (V2)

### 1. New V2 Rules (`.agents/V2/rules/`)
- **[NEW] `development-best-practices.md`** : 
    - Usage systématique du **Design System V3**.
    - Nettoyage et optimisation de code obligatoire à chaque feature (SonarQube compliance).
    - Stratégie de tests : Unit Tests (TU), Tests API (Zod/Swagger), Tests de Non-Régression (TNR).
- **[NEW] `visual-manifesto.md`** : Standards de design Premium (HSL, Gradients, Typo unique, Motion).
- **[NEW] `ai-cognition.md`** : Gestion du contexte, anti-hallucination, et introspection.

### 2. New V2 Skills (`.agents/V2/skills/`)
- **[NEW] `frontend-design-v2/`** : Skill basé sur le template Anthropic (Philosophy -> Component).
- **[NEW] `qa-automation-v2/`** : Skill pour la génération et l'exécution de la batterie de tests.

### 3. New V2 Workflows (`.agents/V2/workflows/`)
- **[NEW] `implement-feature-v2.md`** : Workshop V2 incluant :
    1. Design Philosophy.
    2. Code Implementation + Optimization.
    3. Automated Test Suite (TU, API, TNR).
    4. Quality Gate (Sonar & Visual).

## Validation Plan
1. **Démonstration V2** : Création d'un composant simple en suivant strictement le workflow V2.
2. **Review de Code** : Vérification que le code généré est "Clean Code" et optimisé.
3. **Batterie de Tests** : Preuve d'exécution réussie des tests unitaires et API sur le composant de test.
