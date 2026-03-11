# 🚀 StatFoot V3 - Unified Installation & Launch Guide

This guide ensures you can clone, install, and run the complete StatFoot V3 ecosystem on a new machine.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- **Docker & Docker Compose** (Recommended) : `brew install --cask docker`
- **Node.js** (v18+) : `brew install node`
- **Python** (v3.11+) : `brew install python`
- **Git** : `brew install git`
- **Git LFS** (CRITICAL: Required for the 1.8GB database) : `brew install git-lfs` (macOS)

---

## 📥 1. Step-by-Step Repository Setup

Run these commands in your terminal:

```bash
# 1. Clone the repository
git clone https://github.com/FRmicrow/dataFootV1
cd dataFootV1

# 2. Initialize Git LFS
git lfs install

# 3. Pull the large files (database & models)
# This will download the 1.8GB database.sqlite file
git lfs pull
```

---

### Tab 3: Frontend
```bash
cd frontend
npm install
npm run dev
```
### Tab 3: Start Frontend
```bash
cd frontend
npm run dev
# Web app will run at http://localhost:5173 (or similar Vite port)
```
```

---

## 🔍 5. Verification Checklist

1.  **Database Check**: Ensure `backend/database.sqlite` is ~1.8GB in size. If it's only a few KB, `git lfs pull` failed.
2.  **API Health**: Visit `http://localhost:8000/health` - it should return `{"status": "online"}`.
3.  **Frontend Interface**: Visit the Vite URL and verify the dashboard loads data from the backend.

---

-   **Git LFS Error**: If you see "smudge filter failed", run `git lfs install` followed by `git lfs pull`.
-   **Port Conflicts**: If port 3001 or 8000 is taken, update the `.env` in backend or the uvicorn command in ML service.
-   **Missing Models**: If prediction fails, ensure `.joblib` files exist in the `ml-service/` folder.

---

## 🚚 6. Migrating Docker Volumes (New Computer)

If you are moving to a new computer and want to keep your Postgres data and ML models:

### 📤 Step A: Export from Old Computer
Run these commands in the project root:
```bash
# Export Postgres data
docker run --rm -v statfoot-postgres-data:/volume -v $(pwd):/backup ubuntu tar cvf /backup/statfoot-postgres-data.tar -C /volume .

# Export ML Models (if any)
docker run --rm -v statfoot-ml-models-vol:/volume -v $(pwd):/backup ubuntu tar cvf /backup/statfoot-ml-models-vol.tar -C /volume .
```

### 📥 Step B: Import to New Computer
1.  Transfer the `.tar` files to your new computer's project root.
2.  Create the volumes and restore data:
```bash
# Create volumes
docker volume create statfoot-postgres-data
docker volume create statfoot-ml-models-vol

# Restore Postgres data
docker run --rm -v statfoot-postgres-data:/volume -v $(pwd):/backup ubuntu bash -c "rm -rf /volume/* && tar xvf /backup/statfoot-postgres-data.tar -C /volume"

# Restore ML Models
docker run --rm -v statfoot-ml-models-vol:/volume -v $(pwd):/backup ubuntu bash -c "rm -rf /volume/* && tar xvf /backup/statfoot-ml-models-vol.tar -C /volume"
```
3.  Run `docker-compose up --build` as usual.
