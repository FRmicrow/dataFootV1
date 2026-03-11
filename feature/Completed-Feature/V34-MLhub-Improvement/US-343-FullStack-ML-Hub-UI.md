# US-343 - Full-Stack Engineer - ML Hub UI Updates

**1. Contexte :**
- Feature parente : V34 - MLhub-Improvement
- Couche technique : Frontend (Model Factory)

**2. Intention (Qui & Quoi) :**
En tant qu'utilisateur, je veux voir l'impact des nouvelles features xG directement dans l'interface du ML Hub.

**3. Raison (Pourquoi) :**
Pour comprendre pourquoi une prédiction a changé et valider visuellement que le modèle prend bien en compte la qualité de jeu (xG) et non juste le résultat brut.

**4. Détails Techniques & Contraintes :**
- Mettre à jour l'affichage de l'importance des features dans `ModelFactory` pour inclure les nouveaux labels (ex: "xG Momentum").
- S'assurer que les nouveaux modèles V34 sont bien sélectionnés par défaut ou mis en avant.

**5. Scénarios de Test / Preuves de QA :**
- Naviguer vers le ML Hub -> Vérifier que les nouveaux modèles apparaissent dans le Leaderboard.
- Cliquer sur un modèle V34 -> Vérifier que le graphique d'importance affiche les colonnes xG.
