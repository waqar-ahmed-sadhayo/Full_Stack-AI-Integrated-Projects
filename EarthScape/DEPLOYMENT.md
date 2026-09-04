# Deploying EarthScape (Render + Vercel)

**Currently live:**
- Frontend (Vercel): https://earthscape-nu.vercel.app
- Backend (Render): https://earthscape-backend.onrender.com (`/api/docs` for Swagger)

Backend → **Render** (Web Service), Frontend → **Vercel**. Both platforms support
monorepos via a **Root Directory** setting, so no repo restructuring is needed.

Deploy the **backend first** (you need its URL for the frontend's env vars), then the
**frontend**, then go back and update the backend's `FRONTEND_URL`.

## 1. Backend on Render

1. [render.com](https://render.com) → sign in with GitHub → **New → Web Service**.
2. Connect the `waqar-ahmed-sadhayo/Full_Stack-AI-Integrated-Projects` repo.
3. Configure:
   | Field | Value |
   |---|---|
   | Name | `earthscape-backend` |
   | Root Directory | `EarthScape/backend` |
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | Free |
4. Environment variables (Render dashboard → Environment):
   | Key | Value |
   |---|---|
   | `PYTHON_VERSION` | `3.11.9` |
   | `DEMO_MODE` | `true` |
   | `JWT_SECRET_KEY` | *(generate a random 32+ char string — click "Generate" in Render)* |
   | `JWT_ALGORITHM` | `HS256` |
   | `MONGO_URI` | *(leave empty to use the DEMO_MODE local-JSON store, or paste a MongoDB Atlas free-tier URI)* |
   | `FRONTEND_URL` | `http://localhost:5173` *(update after step 2 with your real Vercel URL — can be a comma-separated list)* |
   | `RATE_LIMIT_PER_MINUTE` | `120` |
5. Deploy. Once live, note the URL, e.g. `https://earthscape-backend.onrender.com`.
6. Sanity check: `curl https://earthscape-backend.onrender.com/api/v1/health` → `{"status":"ok"}`.

**Note:** Render's free-tier disk is ephemeral — the DEMO_MODE local-JSON store and any
uploaded files reset on every redeploy/restart (and the free instance spins down after
15 minutes idle, so the first request after idling seeds a fresh ~8,250-record dataset
again, which takes a few seconds). For durable data, set `MONGO_URI` to a free
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster instead.

## 2. Frontend on Vercel

Either via the dashboard or the CLI (already included in this repo as `frontend/vercel.json`).

### Dashboard
1. [vercel.com](https://vercel.com) → sign in with GitHub → **Add New → Project**.
2. Import `waqar-ahmed-sadhayo/Full_Stack-AI-Integrated-Projects`.
3. Set **Root Directory** to `EarthScape/frontend`.
4. Environment variables:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://earthscape-backend.onrender.com` |
   | `VITE_WS_BASE_URL` | `wss://earthscape-backend.onrender.com` |
5. Deploy. Vercel auto-detects Vite (build `npm run build`, output `dist`).

### CLI
```bash
cd EarthScape/frontend
vercel login                      # one-time, opens a browser/email verification
vercel link                       # link this folder to a new/existing Vercel project
vercel env add VITE_API_BASE_URL production   # paste https://earthscape-backend.onrender.com
vercel env add VITE_WS_BASE_URL production    # paste wss://earthscape-backend.onrender.com
vercel --prod
```

## 3. Close the loop

Go back to the Render service → Environment → set `FRONTEND_URL` to your real Vercel URL
(e.g. `https://earthscape.vercel.app`, comma-separate if you keep the preview URL too) →
save (triggers a redeploy). CORS also already allows any `*.vercel.app` origin by regex, so
preview deployments work without extra config.

## 4. Verify end-to-end

1. Open the Vercel URL → `/login`.
2. Sign in with `admin@earthscape.io` / `Admin@12345` (seeded on first backend boot).
3. Check Dashboard KPIs load, Real-Time Monitoring shows a "Live" WebSocket badge, and
   Data Ingestion / ML Predictions / Hadoop job start all work — confirms API + WS + CORS
   are all correctly wired.
