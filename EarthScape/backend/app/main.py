import asyncio
import logging
import time
from collections import defaultdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.data.sample_data_generator import generate_climate_records, generate_default_users
from app.database import db
from app.routers import (
    alerts,
    analytics,
    anomalies,
    auth,
    climate_data,
    climate_map,
    dashboard,
    feedback,
    hadoop,
    ingestion,
    live_weather,
    ml,
    monitoring,
    realtime,
    reports,
    users,
)
from app.streaming.manager import simulator_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("earthscape")

settings = get_settings()

app = FastAPI(
    title="EarthScape Climate Intelligence Platform API",
    description="Big Data climate ingestion, processing, ML prediction, real-time monitoring and alerting API.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_rate_bucket: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = _rate_bucket[client_ip]
    window[:] = [t for t in window if now - t < 60]
    if len(window) >= settings.rate_limit_per_minute:
        return JSONResponse({"detail": "Rate limit exceeded. Try again shortly."}, status_code=429)
    window.append(now)
    response = await call_next(request)
    return response


@app.on_event("startup")
async def on_startup():
    await db.connect()
    logger.info("Database mode: %s", db.mode)

    users_coll = db.get_collection("users")
    if await users_coll.count({}) == 0:
        await users_coll.insert_many(generate_default_users())
        logger.info("Seeded default Administrator/Analyst accounts")

    records_coll = db.get_collection("climate_records")
    if await records_coll.count({}) == 0:
        logger.info("Seeding synthetic climate dataset (DEMO_MODE=%s)...", settings.demo_mode)
        records = generate_climate_records()
        await records_coll.insert_many(records)
        logger.info("Seeded %d climate records", len(records))

    if settings.demo_mode:
        asyncio.create_task(simulator_loop())
        logger.info("DEMO_MODE: started simulated real-time sensor stream (no live satellite/IoT feed connected)")


@app.get("/api/v1/system/info")
async def system_info():
    return {
        "app": "EarthScape Climate Intelligence Platform",
        "version": "1.0.0",
        "demo_mode": settings.demo_mode,
        "database_mode": db.mode,
        "hdfs_simulated": settings.demo_mode,
        "hadoop_simulated": settings.demo_mode,
        "notice": "DEMO_MODE simulates HDFS/MapReduce/real-time sensors on the local filesystem — no live Hadoop cluster is connected."
        if settings.demo_mode
        else "Connected to production infrastructure.",
    }


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(climate_data.router)
app.include_router(ingestion.router)
app.include_router(hadoop.router)
app.include_router(analytics.router)
app.include_router(anomalies.router)
app.include_router(ml.router)
app.include_router(realtime.router)
app.include_router(alerts.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(feedback.router)
app.include_router(monitoring.router)
app.include_router(climate_map.router)
app.include_router(live_weather.router)
