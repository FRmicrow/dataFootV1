---
description: Ce workflow décrit comment exécuter les suites de tests et analyser les résultats.
---

# run-tests

Ce workflow décrit comment exécuter les suites de tests et analyser les résultats.

## Étapes
1. **Endosser le Rôle QA** : L'agent doit activer et respecter strictement la règle `@qa-engineer`.
2. **Analyse des Impacts** : Consultez `.agents/project-architecture/backend-swagger.yaml` et `.agents/project-architecture/frontend-pages.md` pour identifier ce qui doit être testé suite aux développements récents.
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
5. **Boucle de Correction Interne** : Si un conteneur crash ou affiche des erreurs dans les logs, **N'ATTENDEZ PAS**. Corrigez le code source fautif, puis reprenez à l'étape 3 (`build` + `up` + `logs`) de manière autonome jusqu'à obtenir un environnement 100% stable (Healthy).
6. **Tests d'Interface Visuels (Obligatoire)** : Une fois les logs propres, vous **DEVEZ** utiliser vos capacités de navigation web (via l'outil `browser_subagent` par exemple) pour visiter l'application front-end (généralement `http://localhost:5173`). Cliquez sur les pages impactées pour vérifier visuellement et interactivement que l'UI réagit bien et que les requêtes API aboutissent sans erreur côté client. N'acceptez JAMAIS une PR front-end sans l'avoir "vue" fonctionner.
7. **Rapport & Clôture** : Si tout est au vert (logs docker clean + navigation browser valide), validez la User Story en indiquant l'absence de régression.

## Notes
- Ne présumez jamais que le code fonctionne avant d'avoir lu les vrais logs de `docker compose`.
- La boucle Etape 3 -> Etape 4 -> Etape 5 doit être itérée par l'agent jusqu'à résolution totale des problèmes de build.