# 🚀 StatFoot V3 - Guide d'Installation

Ce guide vous permet de cloner, configurer et lancer l'écosystème complet StatFoot V3.
La base de données est **PostgreSQL** (gérée via Docker).

---

## 📋 Prérequis

- **Docker & Docker Compose** : `brew install --cask docker`
- **Node.js** (v18+) : `brew install node`
- **Python** (v3.11+) : `brew install python`
- **Git** : `brew install git`

---

## 📥 1. Cloner le dépôt

```bash
git clone https://github.com/FRmicrow/dataFootV1
cd dataFootV1
```

---

## ⚙️ 2. Configuration de l'environnement

```bash
cd backend
cp .env.example .env
```

Ouvrez `.env` et renseignez vos valeurs :

```env
DATABASE_URL=postgres://statfoot:statfoot@postgres:5432/statfoot
API_FOOTBALL_KEY=your_api_key_here
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
PORT=3001
```

> [!TIP]
> Pour le développement local **sans Docker**, remplacez l'hôte `postgres` par `localhost` dans `DATABASE_URL`.

---

## 🛠️ 3. Lancer avec Docker (recommandé)

```bash
# Depuis la racine du projet
docker-compose up --build
```

Cela démarre :
- **Postgres** : `localhost:5432` (base de données persistante sur volume Docker)
- **Backend API** : http://localhost:3001
- **Frontend App** : http://localhost:5173
- **ML Service** : http://localhost:8008

La base de données PostgreSQL est **initialisée automatiquement** au premier démarrage via les scripts SQL dans `backend/sql/`.

---

## 💻 4. Développement local (alternatif)

Ouvrez **trois terminaux** :

### Terminal 1 — Backend (Express API)
```bash
cd backend && npm install && npm run dev
```

### Terminal 2 — ML Service (Python FastAPI)
```bash
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 3 — Frontend (React + Vite)
```bash
cd frontend && npm install && npm run dev
```

> [!IMPORTANT]
> En mode local, vous devez avoir une instance PostgreSQL accessible. Mettez à jour `DATABASE_URL` dans `backend/.env` en remplaçant l'hôte `postgres` par `localhost`.

---

## 🔍 5. Checklist de vérification

1. **Backend** : `GET http://localhost:3001/api/v3/leagues` renvoie des données JSON
2. **ML Health** : `GET http://localhost:8008/health` → `{"status": "online"}`
3. **Frontend** : http://localhost:5173 charge le dashboard sans erreur

---

## ⚠️ Dépannage courant

| Problème | Solution |
|---|---|
| Backend ne démarre pas | Vérifiez que `DATABASE_URL` dans `backend/.env` est correct et que le conteneur Postgres est bien démarré |
| Port déjà utilisé (3001, 5173, 8008) | Mettez à jour le port dans `backend/.env` ou la commande `uvicorn` |
| `npm install` échoue | Vérifiez votre version Node (`node -v`, doit être ≥ 18) |
| Prédictions ML échouent | Assurez-vous que les modèles `.joblib` sont présents dans `ml-service/models/` |

---

## 🚚 6. Migration Docker (changement de machine)

### 📤 Export (ancienne machine)

```bash
# Depuis la racine du projet
docker run --rm -v statfoot-postgres-data:/volume -v $(pwd):/backup ubuntu \
  tar cvf /backup/statfoot-postgres-data.tar -C /volume .

docker run --rm -v statfoot-ml-models-vol:/volume -v $(pwd):/backup ubuntu \
  tar cvf /backup/statfoot-ml-models-vol.tar -C /volume .
```

### 📥 Import (nouvelle machine)

```bash
# Transférez les .tar vers la nouvelle machine, puis :
docker volume create statfoot-postgres-data
docker volume create statfoot-ml-models-vol

docker run --rm -v statfoot-postgres-data:/volume -v $(pwd):/backup ubuntu \
  bash -c "rm -rf /volume/* && tar xvf /backup/statfoot-postgres-data.tar -C /volume"

docker run --rm -v statfoot-ml-models-vol:/volume -v $(pwd):/backup ubuntu \
  bash -c "rm -rf /volume/* && tar xvf /backup/statfoot-ml-models-vol.tar -C /volume"

docker-compose up --build
```
