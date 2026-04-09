---
name: integration-testing
description: "Tester l'intégration entre services. Utiliser quand on vérifie l'interaction contrôleur/service avec Supertest + Vitest."
risk: safe
---

## When to use
Servez-vous de cette compétence pour valider que les différents composants de l’application (API, base de données, services tiers) fonctionnent ensemble correctement.

## Instructions
1. Préparez un environnement de test isolé (base de données en mémoire, conteneurs) proche de la production.
2. Écrivez des tests qui effectuent des appels API ou exécutent des fonctions et vérifient les effets sur la base de données et les services.
3. Nettoyez l’état du test entre chaque exécution afin de garantir l’indépendance des tests.
4. Créez des données de test réalistes et anonymisées pour simuler les cas d’usage.
5. Intégrez ces tests à votre CI pour détecter rapidement les régressions.

## Example
Testez l’endpoint `POST /users` en envoyant des données valides, puis vérifiez que l’utilisateur est bien créé dans la base et que l’API renvoie le bon statut et les bonnes valeurs.

## Limitations
Cette compétence ne couvre pas les tests d’interface utilisateur (voir `frontend-testing-react`) ni les tests de charge (voir `load-testing`).