# EarthScape — Climate Intelligence & Big Data Analytics Platform

A full-stack Big Data climate analytics platform: ingestion → validation/cleaning → HDFS-style
storage → MapReduce-style processing → analytics → ML prediction → anomaly detection →
real-time monitoring → alerting → reporting, with role-based access for Administrators and
Analysts.

Built for a local development machine with **no Hadoop/HDFS/Kafka/MongoDB cluster required** —
see [DEMO_MODE](#demo_mode--what-is-real-vs-simulated) below.

## Project Summary

| | |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4, Recharts, React Leaflet, Lucide icons |
| Backend | FastAPI (Python 3.14), Pydantic v2, JWT auth, WebSockets |
| Data layer | MongoDB (via Motor) when reachable, else a JSON-file-backed store with an identical async interface (DEMO_MODE) |
| Big Data | Simulated HDFS (local filesystem, `/earthscape/{raw,processed,analytics,models,reports}`) + simulated MapReduce jobs (pandas groupby standing in for map→shuffle→reduce) |
| ML | scikit-learn — RandomForestRegressor (temperature/rainfall), LinearRegression (CO2 trend), RandomForestClassifier (anomaly detector), plus Z-score/IQR/IsolationForest anomaly detection |
| Real-time | WebSocket sensor stream, simulated in DEMO_MODE |
| Tests | pytest / pytest-asyncio, 65 tests covering auth, authorization, ingestion, analytics, anomaly detection, ML, alerts, reports, health, HDFS service, Hadoop jobs |

## Folder Structure

```
earthscape/
  frontend/                  React + TS + Tailwind app (own package.json, .env)
    src/
      api/                   Axios client + typed endpoint modules
      auth, context/          AuthContext, ThemeContext, ToastContext
      layouts/                AppShell, Sidebar, Header, nav config
      components/ui/          Reusable Button, Input, Badge, DataTable, StatCard, Modal...
      pages/                  All 15 screens (Login, Register, Dashboard, ...)
      hooks/                  useRealtimeFeed (WebSocket)
  backend/                    FastAPI app (own requirements.txt, .env)
    app/
      main.py                 App wiring, CORS, rate limiting, startup seeding
      config.py                Settings (pydantic-settings, .env driven)
      database.py               Unified Mongo / local-JSON async data layer
      auth/                     JWT + password hashing + role dependencies
      schemas/                  Pydantic request/response models
      services/                 Business logic per domain
      routers/                  Thin FastAPI routers per domain
      ml/pipeline.py             Train/evaluate/serialize/predict pipeline
      hadoop/mapreduce.py         Simulated MapReduce jobs
      hdfs/service.py             Simulated HDFS filesystem layer
      streaming/manager.py        WebSocket manager + sensor simulator
      data/sample_data_generator.py
      utils/geo.py                 Reference city/region/source data
    tests/                     pytest suite (65 tests)
  data/                       Generated: hdfs_simulated/, local_store/ (JSON demo DB), uploads/
  models/                     Generated: trained ML model .joblib files
  reports/                    (unused — reports write into data/hdfs_simulated/earthscape/reports)
  legacy_flask/                Prior Flask/SQLite prototype, kept for reference
docs/
stitch_earthscape_climate_authentication_ui/   Stitch design reference (screens + DESIGN.md)
```

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4 (CSS-token theme, light/dark), Axios,
React Router v7, Recharts, React Leaflet + Leaflet (OpenStreetMap tiles, dark-filtered), Lucide
React icons.

**Backend:** FastAPI, Pydantic v2 / pydantic-settings, python-jose (JWT), bcrypt, Motor/PyMongo,
pandas, numpy, scikit-learn, joblib, openpyxl, reportlab (PDF), psutil, websockets.

## Setup & Run

### Backend

```bash
cd earthscape/backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # defaults already work for DEMO_MODE
python run.py                 # http://localhost:8000  (docs at /api/docs)
```

First boot auto-seeds:
- Two accounts — `admin@earthscape.io` / `Admin@12345` (Administrator) and
  `analyst@earthscape.io` / `Analyst@12345` (Analyst)
- ~8,250 synthetic climate records across 25 cities / 6 regions / ~330 days, with ~4.5%
  injected labeled anomalies (heatwaves, cold snaps, CO2 spikes, storms, droughts)
- A simulated real-time sensor stream (new reading every ~2.5s) broadcasting over WebSocket

### Frontend

```bash
cd earthscape/frontend
npm install
cp .env.example .env          # points at http://localhost:8000 by default
npm run dev                   # http://localhost:5173
```

Open `http://localhost:5173/login` and sign in with either seeded account.

### Running tests

```bash
cd earthscape/backend
source .venv/Scripts/activate   # or .venv\Scripts\activate on Windows cmd
python -m pytest -q
```

**Result: 65 passed.** Tests run against an isolated temp HDFS/model/report directory and the
local-JSON demo data layer (see `tests/conftest.py`), so they never touch your dev data.

## Environment Variables

### Backend (`backend/.env`, see `.env.example`)

| Variable | Purpose |
|---|---|
| `DEMO_MODE` | `true` = simulate HDFS/MapReduce/real-time/Mongo-fallback on local machine |
| `MONGO_URI`, `MONGO_DB_NAME` | MongoDB connection (optional in DEMO_MODE — falls back to JSON store if unreachable) |
| `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Auth token config |
| `HDFS_NAMENODE_URL` | Real WebHDFS endpoint (only used when `DEMO_MODE=false`) |
| `HDFS_LOCAL_ROOT` | Local folder simulating the HDFS root |
| `UPLOAD_DIR`, `MODEL_DIR`, `REPORT_DIR` | Local storage paths |
| `MAX_UPLOAD_SIZE_MB` | Ingestion upload limit |
| `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_ENABLED` | Optional, unused in DEMO_MODE |
| `RATE_LIMIT_PER_MINUTE` | Per-IP API rate limit |
| `FRONTEND_URL` | Allowed CORS origin |

### Frontend (`frontend/.env`, see `.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend REST base URL |
| `VITE_WS_BASE_URL` | Backend WebSocket base URL |

## Database Collections (Mongo or local-JSON — identical shape either way)

`users`, `climate_records`, `datasets` (ingestion history), `hadoop_jobs`, `anomalies`,
`ml_models`, `predictions`, `alerts`, `alert_thresholds`, `reports`, `feedback`.

## API Endpoints (`/api/v1/...`, Swagger at `/api/docs`)

**Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
`GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Dashboard** — `GET /dashboard/kpis`, `GET /dashboard/overview`

**Climate Data** — `GET /climate-data`, `GET /climate-data/summary`, `GET /climate-data/export`

**Ingestion** — `POST /ingestion/upload`, `GET /ingestion/datasets`

**Hadoop/HDFS** — `GET /hadoop/hdfs/health`, `GET /hadoop/hdfs/storage`, `GET /hadoop/hdfs/files`,
`GET /hadoop/jobs`, `GET /hadoop/jobs/definitions`, `GET /hadoop/jobs/{job_id}`,
`POST /hadoop/jobs/start`

**Analytics** — `GET /analytics/trend`, `GET /analytics/multi-trend`,
`GET /analytics/regional-comparison`, `GET /analytics/seasonal-trend`,
`GET /analytics/source-breakdown`, `GET /analytics/status-breakdown`,
`GET /analytics/correlation`, `GET /analytics/summary`

**Anomalies** — `POST /anomalies/detect`, `GET /anomalies`, `GET /anomalies/distribution`,
`PATCH /anomalies/{id}/status`

**ML** — `GET /ml/models`, `POST /ml/train`, `POST /ml/predict`

**Real-time** — `GET /realtime/sensors`, `WS /ws/realtime?token=...`

**Alerts** — `GET /alerts`, `POST /alerts`, `PATCH /alerts/{id}/resolve`,
`GET /alerts/thresholds`, `POST /alerts/thresholds`, `DELETE /alerts/thresholds/{id}`

**Reports** — `GET /reports`, `GET /reports/types`, `POST /reports/generate`,
`GET /reports/{id}/download`

**Users** (admin) — `GET /users`, `POST /users`, `PATCH /users/{id}/role`,
`PATCH /users/{id}/active`, `DELETE /users/{id}`

**Feedback** — `GET /feedback`, `POST /feedback`, `PATCH /feedback/{id}/status` (admin)

**Monitoring** (admin) — `GET /monitoring/system`

**Map** — `GET /map/stations`, `GET /map/anomalies`

**Live Weather (Pakistan)** — `GET /live-weather/pakistan` — **real, non-simulated** current
conditions (temperature, feels-like, humidity, precipitation, pressure, wind) for 12 major
Pakistani cities (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta,
Sialkot, Hyderabad, Gujranwala, Sukkur), sourced live from the free
[Open-Meteo](https://open-meteo.com) API (no key required), cached server-side for 10 minutes.
Shown in the sidebar under **Overview → Pakistan Weather**.

**System** — `GET /system/info`, `GET /health`

## DEMO_MODE — what is real vs. simulated

Everything below runs behind the **same API contracts** a production deployment would use;
DEMO_MODE only changes which implementation answers the call.

| Capability | DEMO_MODE (default, `DEMO_MODE=true`) | Production (`DEMO_MODE=false`) |
|---|---|---|
| Data store | Local JSON files under `data/local_store/` if MongoDB is unreachable | MongoDB via Motor |
| HDFS | Local filesystem tree under `data/hdfs_simulated/earthscape/{raw,processed,analytics,models,reports}`, partitioned by year/month/region/source | Real WebHDFS cluster at `HDFS_NAMENODE_URL` |
| MapReduce | pandas `groupby` standing in for map→shuffle→reduce, run as an asyncio background task, tracked in `hadoop_jobs` exactly like a YARN job would be | Real Hadoop/YARN job submission |
| Real-time sensors | A background loop generates a plausible reading every ~2.5s and runs it through validate→process→threshold-check→anomaly-check→alert→store→broadcast | Ingests real satellite/IoT/weather-station telemetry |
| ML | Identical — scikit-learn models trained on whatever data is in the store (real or synthetic) | Identical |

Every simulated response includes a `simulated: true` flag (HDFS/Hadoop endpoints), and
`GET /api/v1/system/info` reports `demo_mode`, `hdfs_simulated`, `hadoop_simulated`, and a
plain-English notice — the UI never claims simulated infrastructure is a real cluster.

## Definition of Done — status

- ✅ Every screen (Login, Register, Dashboard, Data Ingestion, Climate Records, Climate Map,
  Climate Analytics, Anomaly Detection, ML Predictions, Real-Time Monitoring, Alerts, Hadoop/HDFS,
  Reports, Feedback, Manage Users, System Monitoring) is wired to a real backend endpoint.
- ✅ WebSocket real-time monitoring works (verified live in-browser).
- ✅ End-to-end flow verified in-browser: login → dashboard → upload dataset → validate/clean →
  MapReduce job → analytics → anomaly detection → ML train + predict → real-time monitoring →
  alert → report generation, for both Administrator and Analyst roles.
- ✅ 65/65 backend tests passing.
- ✅ Design tokens (colors, type scale, spacing, radii, glass-card treatment) match the Stitch
  reference for both dark (primary) and light themes.

## Known Limitations

- The JSON-backed demo store is safe for a single backend process. Running multiple `uvicorn`
  workers/processes against it concurrently causes lost writes (no cross-process locking) — use
  a single worker in DEMO_MODE, or point `MONGO_URI` at a real MongoDB instance for concurrent
  workers.
- Password reset is stubbed (no SMTP configured) — see `POST /auth/forgot-password`.
