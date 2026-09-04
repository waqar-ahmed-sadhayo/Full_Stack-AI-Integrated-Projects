import os
import time
from datetime import datetime, timezone

import psutil

from app.database import get_db
from app.hdfs import service as hdfs_service

_PROCESS_START = time.time()


async def system_status() -> dict:
    db = get_db()
    users = await db.get_collection("users").find({"is_active": True})
    running_jobs = await db.get_collection("hadoop_jobs").count({"status": "Running"})
    queued_jobs = await db.get_collection("hadoop_jobs").count({"status": "Queued"})

    api_start = time.perf_counter()
    _ = await db.get_collection("users").count({})
    api_response_ms = round((time.perf_counter() - api_start) * 1000, 2)

    disk = psutil.disk_usage(os.getcwd())
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cpu_pct": psutil.cpu_percent(interval=0.1),
        "ram_pct": psutil.virtual_memory().percent,
        "ram_used_gb": round(psutil.virtual_memory().used / (1024 ** 3), 2),
        "ram_total_gb": round(psutil.virtual_memory().total / (1024 ** 3), 2),
        "disk_pct": disk.percent,
        "hdfs": hdfs_service.storage_stats(),
        "database": {"mode": db.mode, "status": "connected"},
        "api_response_time_ms": api_response_ms,
        "active_users": len(users),
        "running_jobs": running_jobs,
        "queued_jobs": queued_jobs,
        "uptime_seconds": round(time.time() - _PROCESS_START, 1),
    }
