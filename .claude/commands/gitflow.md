---
description: Commit, push et merge vers dev — workflow Git complet avec gates de validation
---

## État du dépôt

```
!git status
```

```
!git diff --stat
```

Branche : `!git branch --show-current`

---

Endosse le rôle **Git Engineer** et exécute le gitflow :

1. **Vérification** : `git status` propre, pas de fichiers sensibles (`.env`, secrets)

2. **Plan de commit (BLOQUANT)** : Génère un `implementation_plan.md` avec :
   - Liste des fichiers modifiés
   - Message de commit (`type: description`)
   - Stratégie de merge
   Attends la validation explicite de l'utilisateur.

3. **Tests** : `cd backend && npm test` + `cd frontend && npm test` → zéro échec requis

4. **Commit & Push** :
   ```bash
   git add [fichiers spécifiques]
   git commit -m "type: description"
   git push -u origin HEAD
   ```

5. **Archive** : Déplace `docs/features/Vxx-[Nom]/` → `docs/features/Completed-Feature/`

6. **Demande de merge (BLOQUANT)** : "Prêt à merger [branche] vers dev ?" — attend la confirmation

7. **Merge vers dev uniquement** :
   ```bash
   git checkout dev && git pull && git merge [branche] && git push origin dev
   ```

8. **Nettoyage** : Supprime la branche locale et distante

**RÈGLES ABSOLUES** :
- Les features mergent **uniquement vers `dev`** — jamais directement vers `preprod` ou `main`
- `preprod` et `main` sont gérés manuellement par l'utilisateur
- Ne jamais forcer sur une branche protégée, ne jamais skipper les tests, ne jamais committer `.env`
