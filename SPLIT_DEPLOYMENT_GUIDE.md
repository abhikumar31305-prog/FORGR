# 🚀 Split Deployment Guide: Vercel (Frontend) + Render (Backend & PostgreSQL)

This guide takes you through deploying the **FORGR MVP** stack using:
- **Frontend**: [Vercel](https://vercel.com) (Global edge CDN, instant page loads, zero maintenance)
- **Backend & Database**: [Render](https://render.com) (Managed PostgreSQL 16 + FastAPI server via Blueprint)

---

## Step 1: Commit and Push to GitHub

First, commit the new deployment configurations (`render.yaml`, `vercel.json`, and database migrations) to your GitHub repository:

```bash
git add .
git commit -m "feat: configure split deployment for Vercel and Render"
git push origin main
```

---

## Step 2: Deploy Backend & PostgreSQL on Render (3 Minutes)

We have created an automated **Render Blueprint (`render.yaml`)** that sets up your database and backend simultaneously.

1. Go to [dashboard.render.com](https://dashboard.render.com) and log in.
2. Click **New +** (top right) and select **Blueprint**.
3. Connect your GitHub repository (`forgrmvp`).
4. Render will detect `render.yaml` and display two resources to create:
   - **forgr-db**: Managed PostgreSQL database.
   - **forgr-backend**: FastAPI web service.
5. Click **Apply**.
6. Render will automatically:
   - Provision PostgreSQL 16.
   - Install Python dependencies from `backend/requirements.txt`.
   - Run Alembic database migrations (`python -m alembic upgrade head`).
   - Launch FastAPI with Uvicorn.
7. Once the backend status turns to **Live**, copy your public service URL:
   `https://forgr-backend-xxxx.onrender.com`

---

## Step 3: Deploy Frontend on Vercel (2 Minutes)

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`forgrmvp`).
4. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
5. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://forgr-backend-xxxx.onrender.com` *(your Render URL from Step 2)* |
6. Click **Deploy**.
7. Vercel will build and publish your frontend in ~45 seconds.
8. Copy your live Vercel URL (e.g., `https://forgr-frontend-xxxx.vercel.app`).

---

## Step 4: Whitelist your Vercel Domain in Backend CORS

To allow secure browser communication between Vercel and Render:

1. In the [Render Dashboard](https://dashboard.render.com), click on your **`forgr-backend`** service.
2. Navigate to **Environment** in the left sidebar.
3. Find `FORGR_CORS_ORIGINS` and set it to your Vercel domain:
   ```env
   FORGR_CORS_ORIGINS=https://your-app-name.vercel.app,https://*.vercel.app
   ```
4. Click **Save Changes**. Render will perform a zero-downtime redeploy in ~15 seconds.

---

## Step 5: Log in to your Live Deployment

1. Visit your live Vercel frontend URL: `https://your-app-name.vercel.app`
2. Log in with the Administrator account:
   - **Email**: `admin@forgr.app`
   - **Password**: Check the auto-generated `FORGR_SEED_PASSWORD` in your Render Environment dashboard (or use `demo123` if simulation mode is active).
3. Check API status anytime at: `https://forgr-backend-xxxx.onrender.com/health`
4. Interactive Swagger documentation is available at: `https://forgr-backend-xxxx.onrender.com/docs`
