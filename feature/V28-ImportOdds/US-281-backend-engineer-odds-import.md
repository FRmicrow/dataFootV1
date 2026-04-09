# US-281: Implémentation du script d'import des Cotes (Odds)

## 1. Rôle ciblé
@[.agents/rules/backend-engineer.md]

## 2. Objectif
Développer des scripts backend autonomes pour interroger l'API-Football afin de récupérer les cotes (Odds Pre-Match) et les insérer dans la base de données.

## 3. Contexte (Pourquoi)
Le système a besoin de récupérer deux sets distincts de données de cotes :
1. **L'historique** : Pour alimenter les modèles de Machine Learning.
2. **La semaine courante** (ou les prochains jours) : Pour alimenter l'interface utilisateur en temps réel des matchs à venir.
Le script doit être robuste, gérer la pagination/limitation (rate limits) de l'API et maintenir à jour l'évolution des cotes si nécessaire.

## 4. Tâches attendues
- Se brancher sur l'endpoint `/odds` d'API-Football.
- Implémenter une méthode pour récupérer et injecter en base de données l'historique complet des cotes des saisons précédentes (ou d'un certain nombre de `fixture_id` ciblés).
- Implémenter une méthode distincte pour récupérer les cotes des matchs de la semaine à venir.
- Utiliser la nouvelle table de cotes créée dans l'US-280.
- Gérer l'upsert (mise à jour) des données si la cote a évolué.
- Optionnel : Ajouter l'exécution de ces scripts dans l'interface ou les outils d'administration existants.

## 5. Exigences spécifiques & Contraintes
- **Architecture Modulaire** : Créer ces scripts sous forme de services isolés (`backend/src/services/odds/` par exemple) pour rester indépendant du reste de l'application technique.
- **Résilience** : Implémenter de la gestion d'erreurs au cas où l'API renvoie des limites de taux ou des timeouts.
- **Paramétrage** : Permettre au script de prendre des paramètres (ex: ligues spécifiques, dates de début/fin) pour éviter un appel colossal d'un seul coup.

## 6. Critères d'acceptation (Definition of Done)
- [ ] Un script pour l'import de l'historique des cotes est fonctionnel et remplit la DB en local.
- [ ] Un script pour l'import des cotes futures est fonctionnel.
- [ ] Les données insérées correspondent au schéma prévu (US-280) sans doublons.
- [ ] Les taux limites (Rate Limits) de l'API sont gérés proprement.
