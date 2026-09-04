from typing import Optional

from fastapi import APIRouter, Depends

from app.auth.deps import require_any_role
from app.database import get_db
from app.utils.geo import CITIES

router = APIRouter(prefix="/api/v1/map", tags=["Climate Map"])


@router.get("/stations")
async def get_stations(user=Depends(require_any_role)):
    db = get_db()
    stations = []
    for c in CITIES:
        latest = await db.get_collection("climate_records").find(
            {"city": c["city"]}, sort=[("timestamp", -1)], limit=1
        )
        if not latest:
            continue
        r = latest[0]
        stations.append(
            {
                "city": c["city"],
                "country": c["country"],
                "region": c["region"],
                "latitude": c["lat"],
                "longitude": c["lon"],
                "sensor_id": r.get("sensor_id"),
                "timestamp": r.get("timestamp"),
                "temperature_c": r.get("temperature_c"),
                "humidity_pct": r.get("humidity_pct"),
                "rainfall_mm": r.get("rainfall_mm"),
                "co2_ppm": r.get("co2_ppm"),
                "wind_speed_kmh": r.get("wind_speed_kmh"),
                "data_source": r.get("data_source"),
                "status": r.get("status"),
                "is_anomaly": r.get("is_anomaly", False),
            }
        )
    return stations


@router.get("/anomalies")
async def get_anomaly_markers(user=Depends(require_any_role)):
    db = get_db()
    return await db.get_collection("anomalies").find({"status": "Open"}, sort=[("detected_at", -1)], limit=200)
