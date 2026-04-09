# US-1915 - Interface de Recommandations de Paris

**Rôle :** Frontend Engineer
**Objectif :** Créer la vue listant les opportunités de paris détectées par les modèles "Champion".

## Contexte
C'est la page finale utilisée pour la prise de décision. Elle doit être claire, fiable et riche en informations.

## Tâches
- [ ] Lister les matchs à venir avec les recommandations (Selection, Odds, Edge, Stake).
- [ ] Afficher le `Confidence Score` pondéré par la qualité du modèle et la complétude des données.
- [ ] Ajouter un volet "Why" explicitant les 3 facteurs principaux de la prédiction (Feature SHAP/Significance).
- [ ] Gérer les tags PRE-LINEUP / POST-LINEUP.

## Expertise Requise
- **Agents & Rules :**
    - `frontend-engineer.md` : Pour l'affichage clair des recommandations et de leur justification.
    - `security-expert.md` : Pour garantir que seules les données autorisées sont affichées.
- **Skills :**
    - `machine-learning` : Interprétabilité des modèles (SHAP values).

## Critères d'Acceptation
- Seules les recommandations issues de modèles "Champion" actifs sont affichées.
- L'interface respecte les réglages de gestion des risques (limites d'exposition).
- L'information est rafraîchie automatiquement lors des mises à jour de cotes.
