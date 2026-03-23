---
description: Lancer la batterie de tests complète — Docker build, backend, frontend
---

## État des conteneurs

```
!docker compose ps
```

---

Endosse le rôle **QA Engineer** et exécute la batterie de tests :

### 1. Build Docker (si changements backend/ML)
```bash
docker compose build
```
Lis les logs en intégralité. Si erreur → identifie la cause racine, corrige, rebuild, relis.

### 2. Tests Backend
```bash
cd backend && npm test
```
- Unit tests (Vitest)
- API contract tests (Supertest)
- Zéro échec autorisé — si un test échoue, corrige la cause racine (jamais commenter)

### 3. Tests Frontend
```bash
cd frontend && npm test
```
- Tests de rendu et interaction
- Zéro échec autorisé

### 4. Rapport
Produis un résumé :
- ✅/❌ Build Docker
- ✅/❌ Backend : X tests passés
- ✅/❌ Frontend : X tests passés
- Bugs identifiés et corrigés
- Régressions détectées
