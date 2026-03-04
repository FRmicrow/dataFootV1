# 🚀 StatFoot V3 - Unified Installation & Launch Guide

This guide ensures you can clone, install, and run the complete StatFoot V3 ecosystem on a new machine.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
<<<<<<< HEAD
- **Docker & Docker Compose** (Recommended) : `brew install --cask docker`
- **Node.js** (v18+) : `brew install node`
- **Python** (v3.11+) : `brew install python`
- **Git** : `brew install git`
=======
- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **Git**
- **Git LFS** (CRITICAL: Required for the 1.8GB database)

### Install Git LFS
If you don't have Git LFS, install it first:
- **macOS**: `brew install git-lfs`
- **Ubuntu/Debian**: `sudo apt install git-lfs`
- **Windows**: Download from [git-lfs.com](https://git-lfs.com/)
>>>>>>> 32ec8570960a3dcff5069fa867558f28db9d0463

---

## 📥 1. Step-by-Step Repository Setup

Run these commands in your terminal:

```bash
<<<<<<< HEAD
# 1. Clone the repository (Very fast, ~3MB)
git clone https://github.com/FRmicrow/dataFootV1
cd dataFootV1

# 2. Stay on the main branch (default)
git checkout main
=======
# 1. Clone the repository
git clone https://github.com/FRmicrow/dataFootV1
cd dataFootV1

# 2. Initialize Git LFS (if not already done globally)
git lfs install

# 3. Switch to the development branch
git checkout betlive

# 4. Pull the large files (database & models)
# This will download the 1.8GB database.sqlite file
git lfs pull
>>>>>>> 32ec8570960a3dcff5069fa867558f28db9d0463
```

---

<<<<<<< HEAD
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
=======
## ⚙️ 2. Environment Configuration

The backend requires API keys to fetch data.

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and verify/set the configuration:
   ```env
   API_FOOTBALL_KEY=92dd9cdae2f05e395cf02b5f51f38efb
   API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
   PORT=3001
   ```

---

## 🛠️ 3. Service Installation

You need to install dependencies for three separate services. Open **three terminal tabs** or windows.

### Tab 1: Backend (Express API)
```bash
cd backend
npm install
```

### Tab 2: ML Service (Python FastAPI)
```bash
cd ml-service
# Create virtual environment
python3 -m venv venv
# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate
# Install required ML libraries
pip install fastapi uvicorn joblib pandas scikit-learn numpy
```

### Tab 3: Frontend (React + Vite)
```bash
cd frontend
npm install
```

---

## 🚀 4. Launching the Application

Run each service in its respective terminal tab.

### Tab 1: Start Backend
```bash
cd backend
npm run dev
# Server will run at http://localhost:3001
```

### Tab 2: Start ML Service
```bash
cd ml-service
source venv/bin/activate
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ML API will run at http://localhost:8000
```

### Tab 3: Start Frontend
```bash
cd frontend
npm run dev
# Web app will run at http://localhost:5173 (or similar Vite port)
>>>>>>> 32ec8570960a3dcff5069fa867558f28db9d0463
```

---

## 🔍 5. Verification Checklist

<<<<<<< HEAD
1.  **API Health**: Visit `http://localhost:8008/health` - it should return `{"status": "online"}`.
2.  **Frontend Interface**: Visit `http://localhost:5173` and verify the dashboard loads.
3.  **Logs**: Check Docker logs or terminal output for any missing dependency warnings.
=======
1.  **Database Check**: Ensure `backend/database.sqlite` is ~1.8GB in size. If it's only a few KB, `git lfs pull` failed.
2.  **API Health**: Visit `http://localhost:8000/health` - it should return `{"status": "online"}`.
3.  **Frontend Interface**: Visit the Vite URL and verify the dashboard loads data from the backend.
>>>>>>> 32ec8570960a3dcff5069fa867558f28db9d0463

---

## ⚠️ Common Troubleshooting

<<<<<<< HEAD
-   **Volume Mounts**: If `backend/data/database.sqlite` is not visible in Docker, ensure your local path is correct in `docker-compose.yml`.
-   **Port Conflicts**: If port 3001, 5173 or 8008 is taken, clear your running containers.
-   **Dependencies**: If `npm install` fails, check your Node version (`node -v`).
=======
-   **Git LFS Error**: If you see "smudge filter failed", run `git lfs install` followed by `git lfs pull`.
-   **Port Conflicts**: If port 3001 or 8000 is taken, update the `.env` in backend or the uvicorn command in ML service.
-   **Missing Models**: If prediction fails, ensure `.joblib` files exist in the `ml-service/` folder.
>>>>>>> 32ec8570960a3dcff5069fa867558f28db9d0463
