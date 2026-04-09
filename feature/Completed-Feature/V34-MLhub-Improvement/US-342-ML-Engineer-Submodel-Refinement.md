# US-342 - ML Engineer - Refinement of Specific Submodels

**1. Contexte :**
- Feature parente : V34 - MLhub-Improvement
- Couche technique : ML-Service (Training Scripts)

**2. Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux ré-entraîner et affiner les sous-modèles spécifiques (Corners, Cards) en utilisant les nouvelles features xG.

**3. Raison (Pourquoi) :**
Le volume d'xG est fortement corrélé avec le nombre de corners (pression offensive) et l'intensité du match (potentiel de cartons).

**4. Détails Techniques & Contraintes :**
- Mettre à jour `train_forge.py` pour inclure les nouveaux blocs de features dans l'entraînement.
- Entraîner les modèles `corners_total` et `cards_total`.
- Documenter le gain de performance (Accuracy, Log-Loss).

**5. Scénarios de Test / Preuves de QA :**
- Comparer l'importance des features : l'xG doit apparaître dans le Top 10 des features pour les Corners.
- Vérifier que les modèles sont bien sauvegardés sous format `.joblib` et enregistrés dans `V3_Model_Registry`.
