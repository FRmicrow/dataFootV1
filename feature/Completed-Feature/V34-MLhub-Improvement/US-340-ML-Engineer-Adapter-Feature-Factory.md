# US-340 - ML Engineer - Adapter-based Feature Factory

**1. Contexte :**
- Feature parente : V34 - MLhub-Improvement
- Couche technique : ML-Service (`time_travel.py`)

**2. Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux refactoriser la `TemporalFeatureFactory` pour utiliser une architecture modulaire ("Feature Blocks").

**3. Raison (Pourquoi) :**
Pour permettre l'ajout facile de nouvelles sources de données (xG, Over/Under, Market Data) sans casser la structure existante et garantir que chaque bloc respecte la règle de non-leakage.

**4. Détails Techniques & Contraintes :**
- Créer une classe de base `FeatureBlock` ou un pattern similaire.
- Isoler les blocs existants : `MomentumBlock`, `LQIBlock`, `ELOBlock`, `NarrativeBlock`.
- Assurer que `get_vector` assemble dynamiquement ces blocs.
- Préparer le terrain pour un `XGBlock` et un futur `MarketBlock` (Over/Under).

**5. Scénarios de Test / Preuves de QA :**
- Exécuter `time_travel.py` sur un match de test -> Le vecteur retourné doit être identique à 100% au vecteur produit par l'ancienne version (pour éviter les régressions).
- Vérifier que l'ajout d'un bloc "Dummy" se fait en moins de 10 lignes de code.
