# 🚀 StatFoot V3 - Unified Installation & Launch Guide

This guide ensures you can clone, install, and run the complete StatFoot V3 ecosystem on a new machine.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- **Docker & Docker Compose** (Recommended) : `brew install --cask docker`
- **Node.js** (v18+) : `brew install node`
- **Python** (v3.11+) : `brew install python`
- **Git** : `brew install git`

---

## 📥 1. Step-by-Step Repository Setup

Run these commands in your terminal:

```bash
# 1. Clone the repository (Very fast, ~3MB)
git clone https://github.com/FRmicrow/dataFootV1
cd dataFootV1

# 2. Stay on the main branch (default)
git checkout main
```

---

## ⚙️ 2. Data & Models Preparation

The repository only includes source code. Large files (databases and ML models) are excluded from Git to maintain high performance.

1.  **Database**: Place your `database.sqlite` file in the `backend/data/` folder.
2.  **ML Models**: Place your `.joblib`, `.pkl`, or `.cbm` models in the `ml-service/models/` folder.

> [!TIP]
> Si vous n'avez pas de base de données initiale, vous pouvez initialiser la structure V2 via :
> ```bash
> cd backend && npm install && node scripts/initDatabase.js
> ```

---

## 🛠️ 3. Running with Docker (Recommended)

The easiest way to run the entire ecosystem is via Docker Compose.

```bash
# From the root directory
docker-compose up --build
```
This will launch :
- **Backend API**: http://localhost:3001
- **Frontend App**: http://localhost:5173
- **ML Service**: http://localhost:8008

---

## 💻 4. Local Development (Alternative)

If you prefer running services natively, open **three terminal tabs**.

### Tab 1: Backend
```bash
cd backend
npm install
npm run dev
```

### Tab 2: ML Service
```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Tab 3: Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔍 5. Verification Checklist

1.  **API Health**: Visit `http://localhost:8008/health` - it should return `{"status": "online"}`.
2.  **Frontend Interface**: Visit `http://localhost:5173` and verify the dashboard loads.
3.  **Logs**: Check Docker logs or terminal output for any missing dependency warnings.

---

## ⚠️ Common Troubleshooting

-   **Volume Mounts**: If `backend/data/database.sqlite` is not visible in Docker, ensure your local path is correct in `docker-compose.yml`.
-   **Port Conflicts**: If port 3001, 5173 or 8008 is taken, clear your running containers.
-   **Dependencies**: If `npm install` fails, check your Node version (`node -v`).
