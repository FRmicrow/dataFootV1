# US-341 - ML Engineer - xG Feature Integration (General Model)

**1. Contexte :**
- Feature parente : V34 - MLhub-Improvement
- Couche technique : ML-Service (Adapters + SQL)

**2. Intention (Qui & Quoi) :**
En tant que ML Engineer, je veux intégrer les données xG (Expected Goals) dans le pipeline de features via un nouveau `XGBlock`.

**3. Raison (Pourquoi) :**
Les xG sont plus prédictifs que les buts réels pour estimer la qualité de création d'occasions et la solidité défensive, ce qui améliorera la précision du modèle 1X2.

**4. Détails Techniques & Contraintes :**
- Implémenter `XGBlock` récupérant les données de `V3_Fixtures.xg_home/away`.
- Calculer les moyennes mobiles (Moving Averages) sur 3, 5 et 10 matchs.
- Calculer l'indice d'efficacité (Actual Goals / xG).
- Gérer les données manquantes (leagues non-Understat) par une valeur neutre ou moyenne de ligue.

**5. Scénarios de Test / Preuves de QA :**
- Vérifier que pour un match donné, le vecteur contient bien les champs `xg_f_h5`, `xg_a_h5`, etc.
- Vérifier le "Morning-Of" : l'xG du match cible ne doit JAMAIS être inclus dans sa propre feature.
