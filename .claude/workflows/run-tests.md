---
description: Exécuter les tests et valider le build Docker. Se déclenche avec /run-tests ou quand on doit prouver que le code fonctionne avant un merge.
---

# run-tests

Ce workflow décrit comment exécuter les suites de tests et analyser les résultats.

## Étapes
1. **Endosser le Rôle QA** : L'agent doit activer et respecter strictement la règle `@qa-engineer`.
2. **Analyse des Impacts** : Consultez `.claude/project-architecture/backend-swagger.yaml` et `.claude/project-architecture/frontend-pages.md` pour identifier ce qui doit être testé suite aux développements récents.
3. **Build Environnement (Crucial)** : Assurez-vous que l'environnement Docker est stable. Exécutez systématiquement :
   ```bash
   docker compose build
   docker compose up -d
   ```
4. **Inspection des Logs (Traque des Bugs)** : C'est ici que se trouvent 90% des erreurs d'intégration. Exécutez :
   ```bash
   docker compose logs backend --tail=100
   docker compose logs frontend --tail=100
   docker compose logs ml-service --tail=100
   ```
   *Cherchez activement les `SyntaxError`, `Crash`, ou refus de connexion à la BDD.*
5. **Boucle de Correction Interne (AUTO-RÉPLICATION)** : Si un conteneur crash ou affiche des erreurs dans les logs :
    - Analysez et corrigez le code source.
    - **COMMANDE OBLIGATOIRE** : Vous DEVEZ relancer immédiatement les étapes 3 et 4 (`docker compose build` + `up` + `logs`).
    - **Validation de Résolution** : Une correction n'est considérée comme valide QUE si les nouveaux logs confirment explicitement le succès (ex: "Server started on port 3000"). Ne jamais s'arrêter à "j'ai corrigé".
    - **Itération** : Répétez ce cycle jusqu'à stabilité totale.
6. **Tests Unitaires & Intégration (Obligatoire)** : Une fois les logs propres, exécutez les suites de tests automatisées :
   ```bash
   cd backend && npm test
   cd frontend && npm test
   ```
   Zéro échec autorisé. Si un test échoue, corrigez et relancez — ne passez pas à l'étape suivante.
7. **Rapport & Clôture** : Rédigez le Rapport QA incluant les preuves de succès des logs.

## Notes
- Ne présumez jamais que le code fonctionne avant d'avoir lu les vrais logs de `docker compose`.
- La boucle Etape 3 -> Etape 4 -> Etape 5 doit être itérée par l'agent jusqu'à résolution totale des problèmes de build.