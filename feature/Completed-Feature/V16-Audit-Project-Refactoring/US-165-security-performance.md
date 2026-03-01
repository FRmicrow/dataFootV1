# US-165: Renforcement de la sécurité et des performances

**Rôle**: Security Expert / Backend Engineer

**Objectif**: En tant qu'Expert Sécurité, je veux auditer et renforcer la protection des données et les performances globales de l'application.

**Tâches**:
- [ ] Auditer la protection contre les injections (SQL, XSS, CSRF).
- [ ] Vérifier la gestion des secrets et des variables d'environnement.
- [ ] Analyser les goulets d'étranglement de performance.
- [ ] Implémenter des stratégies de mise en cache (Redis ou cache applicatif).
- [ ] Optimiser les requêtes les plus lourdes et les temps de réponse.

**Exigences**:
- Respecter les instructions de `security-expert.md`.
- Appliquer le principe du moindre privilège.
- Garantir des temps de réponse rapides (< 200ms pour les requêtes standard).

**Critères d'acceptation**:
- [ ] Aucun secret n'est exposé dans le code.
- [ ] Les tests de sécurité basiques passent.
- [ ] Les gains de performance sont mesurables et documentés.
