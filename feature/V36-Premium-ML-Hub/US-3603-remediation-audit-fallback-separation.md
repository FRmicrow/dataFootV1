# US-3603 - Remediation Audit Fallback Separation

**Contexte :**
- Feature parente : `V36 - Data & ML Foundations Refactor`
- Couche technique ciblée : `Architecture produit / ML Outputs`
- Rôle principal : `Product Architect`

**Intention (Qui & Quoi) :**
En tant que Product Architect, je veux séparer formellement une prédiction modèle d'une estimation heuristique afin que le stockage et le risk engine ne traitent plus les deux comme équivalents.

**Raison (Pourquoi) :**
Afin de restaurer la confiance dans les sorties persistées et dans les fair odds calculées.

**Détails Techniques & Contraintes :**
- Définir `prediction_status`
- Définir `is_fallback`
- Définir la politique de non-persistance des outputs heuristiques
- Les sorties dummy sont explicitement interdites dans le flux officiel

**Skills à activer :**
- `project-context`
- `machine-learning`
- `docs`
- `code-quality`

**Dépendances :**
- `US-3601`
- `US-3602`

**Livrable :**
- Contrat de sortie `model / fallback / error`

**Scénarios de Test / Preuves de QA :**
- Relecture du flux predictor -> submodel outputs -> risk analysis
- Preuve documentaire qu'un fallback ne peut plus être persisté comme sortie modèle
- Tableau des statuts et comportements attendus
