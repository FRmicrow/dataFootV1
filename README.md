# ⚽ StatFoot V3 - Football Analysis & Prediction Ecosystem

StatFoot V3 is a comprehensive football analysis platform designed for scouting, prediction, and historical data management. It combines a high-performance Node.js backend, a modern React frontend, and a specialized Python Machine Learning service.

## 🌟 Ecosystem Overview

-   **Frontend**: Modern dashboard for visual analysis and scouting.
-   **Backend**: Core API managing data flows and PostgreSQL persistence.
-   **ML-Service**: Python service using CatBoost models for match predictions.
-   **Forge**: Integrated ML pipeline for model training and evaluation.

## 🚀 Getting Started

The project is optimized for speed and stability. The repository only contains source code, while large data files and models are excluded.

### 📋 Installation
For a complete step-by-step setup guide, including Docker instructions, please refer to:
👉 **[INSTALLATION.md](./INSTALLATION.md)**

### 🐳 Quick Launch (Docker)
```bash
docker-compose up --build
```

---

## 📂 Project Structure

```
statFootV3/
├── frontend/      # React (Vite) - UI/UX
├── backend/       # Node.js - Core Logic & Data
├── ml-service/    # Python - Predictions & Models
└── .claude/       # Project intelligence & Architecture
```

For a detailed architectural breakdown, see **[.claude/project-architecture/architecture-globale.md](./.claude/project-architecture/architecture-globale.md)**.

## 🛠️ Key Features

-   **Match Predictions**: Advanced 1x2 and goals predictions.
-   **Player Scouting**: Local database of player statistics and achievements.
-   **League Management**: Automated import and synchronization of competitions.
-   **Rate-Limited Imports**: Intelligent queue system for API-Football integration.

## 🛡️ Development & Maintenance

This repository follows a strict performance policy:
-   **Lightweight**: Git history is kept under 200MB.
-   **Standardized**: All binaries and virtual environments are ignored.
-   **Dockerized**: Consistent environment across all development machines.

---

**Enjoy the ultimate football data experience! 🏆**
