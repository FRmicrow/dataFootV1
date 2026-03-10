---
description: Déployer l'application statFootV3 via Docker Compose. Se déclenche avec /deploy-application ou quand on lance l'environnement complet (backend, frontend, DB, ML).
---

# deploy-application

Workflow de déploiement complet via Docker Compose. Couvre le démarrage, la vérification et le diagnostic de l'environnement.

## Pré-requis
- Docker et Docker Compose installés
- Le fichier `backend/.env` existe avec `DATABASE_URL` configuré
- La branche courante est à jour (`git pull`)

## Étapes

### 1. Vérification de l'environnement
```bash
docker --version
docker compose version
cat backend/.env | grep DATABASE_URL  # vérifier que la variable est définie
```

### 2. Build des images
```bash
docker compose build --no-cache
```
Lisez chaque ligne de sortie. Un `ERROR` ou `FAILED` doit être résolu avant de continuer.

### 3. Démarrage des services
```bash
docker compose up -d
```
Ordre de démarrage garanti par `depends_on` : `db` → `backend` → `frontend` + `ml-service`.

### 4. Vérification des logs (CRITIQUE)
```bash
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
docker compose logs ml-service --tail=50
```
**Signes de succès backend** : `Server running on http://localhost:3001`
**Signes de succès frontend** : `Local: http://localhost:5173`
**Erreurs à corriger** : `ECONNREFUSED`, `SyntaxError`, `relation does not exist`

### 5. Vérification de santé
```bash
curl http://localhost:3001/health
# Réponse attendue : { "status": "ok", "timestamp": "..." }
```

### 6. Diagnostic si un service crash
```bash
# Voir l'état de tous les conteneurs
docker compose ps

# Logs d'un service spécifique depuis le début
docker compose logs --no-log-prefix backend

# Redémarrer un service spécifique
docker compose restart backend
```

### 7. Arrêt de l'environnement
```bash
# Arrêt propre (conserve les volumes)
docker compose down

# Arrêt et suppression des volumes (reset complet — demander confirmation à l'utilisateur)
docker compose down -v
```

## Règles
- Ne jamais exécuter `docker compose down -v` sans confirmation explicite de l'utilisateur — cela supprime les données PostgreSQL
- Si le backend ne démarre pas à cause de `DATABASE_URL`, vérifier `backend/.env` et le service `db`
- Après tout changement de code, relancer `docker compose build` avant `docker compose up -d`
