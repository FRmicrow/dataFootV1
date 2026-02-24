# 🚀 StatFoot V3 - Unified Installation & Launch Guide

This guide ensures you can clone, install, and run the complete StatFoot V3 ecosystem on a new machine.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **Git**
- **Git LFS** (CRITICAL: Required for the 1.8GB database)

### Install Git LFS
If you don't have Git LFS, install it first:
- **macOS**: `brew install git-lfs`
- **Ubuntu/Debian**: `sudo apt install git-lfs`
- **Windows**: Download from [git-lfs.com](https://git-lfs.com/)

---

## 📥 1. Step-by-Step Repository Setup

Run these commands in your terminal:

```bash
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
```

---

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
```

---

## 🔍 5. Verification Checklist

1.  **Database Check**: Ensure `backend/database.sqlite` is ~1.8GB in size. If it's only a few KB, `git lfs pull` failed.
2.  **API Health**: Visit `http://localhost:8000/health` - it should return `{"status": "online"}`.
3.  **Frontend Interface**: Visit the Vite URL and verify the dashboard loads data from the backend.

---

## ⚠️ Common Troubleshooting

-   **Git LFS Error**: If you see "smudge filter failed", run `git lfs install` followed by `git lfs pull`.
-   **Port Conflicts**: If port 3001 or 8000 is taken, update the `.env` in backend or the uvicorn command in ML service.
-   **Missing Models**: If prediction fails, ensure `.joblib` files exist in the `ml-service/` folder.
