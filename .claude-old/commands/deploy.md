---
description: Déployer l'application via Docker Compose — full stack
---

## État actuel

Conteneurs :
```
!docker compose ps
```

Dernier commit : `!git log --oneline -1`

---

Endosse le rôle **DevOps Engineer** et déploie :

### 1. Vérification pré-déploiement
- Docker daemon actif
- `.env` présent avec `DATABASE_URL`
- Tests passés (`/project:run-tests` avant si besoin)

### 2. Build
```bash
docker compose build --no-cache
```
Lis les logs complets.

### 3. Démarrage
```bash
docker compose up -d
```
Ordre : `db` → `backend` → `frontend` + `ml-service`

### 4. Vérification des logs
```bash
docker compose logs backend --tail=50
docker compose logs frontend --tail=20
```
Vérifie : "Server running on port 3001", "Local: http://localhost:5173"

### 5. Health check
```bash
curl -s http://localhost:3001/health | python3 -m json.tool
```

### 6. En cas d'erreur
```bash
docker compose ps          # état des services
docker compose logs [svc]  # logs détaillés
docker compose restart [svc]
```

**RÈGLE ABSOLUE** : Ne jamais exécuter `docker compose down -v` sans confirmation explicite de l'utilisateur (détruit les données PostgreSQL).
