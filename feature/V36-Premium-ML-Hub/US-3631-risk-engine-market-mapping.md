# US-3631 - Risk Engine Market Mapping

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Architecture produit / Risk engine`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux aligner le risk engine sur le mapping officiel des marchés afin qu'il transforme correctement les outputs submodels en entrées de risk analysis.

**Raison (Pourquoi) :**
Afin d'éviter les erreurs de sélection et les fair odds calculées sur des marchés mal identifiés.

**Détails Techniques & Contraintes :**
- Le risk engine doit consommer le mapping officiel défini dans V36
- Les marchés OU doivent conserver leurs lignes et sélections explicites
- La persistance doit respecter le contrat de sortie V36

**Skills à activer :**
- `project-context`
- `machine-learning`
- `docs`
- `code-quality`

**Dépendances :**
- `US-3604`
- `US-3630`

**Livrable :**
- Mapping officiel risk engine

**Scénarios de Test / Preuves de QA :**
- Vérification que chaque marché supporté possède un chemin de transformation clair
- Vérification qu'aucun marché n'est converti vers un label ambigu
