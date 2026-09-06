# FORGR — Student Success & Placement Intelligence Platform

> **An AI-powered academic analytics, career readiness, risk prediction, and institutional placement management platform.**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20+%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED.svg?logo=docker&logoColor=white)](https://docker.com)

---

## 🚀 Key Features

* **Multi-Role Portals**: Role-based access control (RBAC) for **Admin**, **Faculty**, **Placement Cell**, **Student**, **Parent**, and **Corporate Recruiter**.
* **AI & Predictive Models**:
  * **Academic Risk / Backlog Predictor**: Identifies at-risk students before semester examinations.
  * **Placement Probability Classifier**: Predicts placement readiness based on academic & skill metrics.
  * **Career Recommendation Engine**: TF-IDF semantic role mapping for tailored career paths.
* **Institutional Monetization**: Tiered profile quotas (Starter 500, Growth 2,500, Enterprise 10,000+) powered by Razorpay with simulation mode support.
* **Bulk Ingestion**: Master student CSV bulk ingestion with automatic column detection, atomic rollback, and quota validation.
* **Compliance & Audit**: DPDP Act / GDPR consent tracking and audit logging.

---

## 📦 Quick Start (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
API Documentation available at: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Web application available at: `http://localhost:5173`

---

## 🌐 Production Deployment

We support two primary production deployment methods:

1. **Split Deploy: Vercel (Frontend) + Render (Backend & PostgreSQL)**
   * Follow the step-by-step [SPLIT_DEPLOYMENT_GUIDE.md](./SPLIT_DEPLOYMENT_GUIDE.md) using the included `render.yaml` Blueprint and `frontend/vercel.json`.

2. **Docker Compose (Full Self-Hosted Stack)**
   * Linux / Cloud VPS: `./deploy.sh`
   * Windows PowerShell: `.\deploy.ps1`
   * Full documentation: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 📚 Documentation

Detailed operational documentation is organized in the [`docs/`](./docs) directory:
* [Deployment Guide](./DEPLOYMENT_GUIDE.md)
* [Vercel + Render Split Deployment](./SPLIT_DEPLOYMENT_GUIDE.md)
* [Backup & Restore Runbook](./docs/BACKUP_RESTORE.md)
* [Systemd Linux Deployment](./docs/SYSTEMD_DEPLOYMENT.md)
* [Release Runbook](./docs/RELEASE_RUNBOOK.md)
* [ML Retraining & Monitoring](./docs/ML_RETRAINING_RUNBOOK.md)
* [Data Retention & Privacy](./docs/ENCRYPTION_AND_RETENTION.md)

---

## 🛡️ License
Private and Confidential — FORGR Platform.
