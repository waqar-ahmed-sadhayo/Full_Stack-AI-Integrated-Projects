from __future__ import annotations

import csv
import io
from typing import Optional

from app.database import get_db

NUMERIC_FIELDS = [
    "temperature_c",
    "humidity_pct",
    "rainfall_mm",
    "wind_speed_kmh",
    "pressure_hpa",
    "co2_ppm",
]


def _build_filter(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    data_source: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    filt: dict = {}
    if date_from or date_to:
        cond = {}
        if date_from:
            cond["$gte"] = date_from
        if date_to:
            cond["$lte"] = date_to
        filt["timestamp"] = cond
    if region:
        filt["region"] = region
    if country:
        filt["country"] = country
    if city:
        filt["city"] = city
    if data_source:
        filt["data_source"] = data_source
    if status:
        filt["status"] = status
    if search:
        filt["$or"] = [
            {"location": {"$regex": search, "$options": "i"}},
            {"sensor_id": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"country": {"$regex": search, "$options": "i"}},
        ]
    return filt


async def list_records(
    page: int = 1,
    page_size: int = 25,
    sort_field: str = "timestamp",
    sort_dir: int = -1,
    **filters,
) -> dict:
    db = get_db()
    coll = db.get_collection("climate_records")
    filt = _build_filter(**filters)
    total = await coll.count(filt)
    skip = (page - 1) * page_size
    records = await coll.find(filt, sort=[(sort_field, sort_dir)], skip=skip, limit=page_size)
    return {
        "items": records,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


async def export_records_csv(**filters) -> str:
    db = get_db()
    coll = db.get_collection("climate_records")
    filt = _build_filter(**filters)
    records = await coll.find(filt, sort=[("timestamp", -1)])
    if not records:
        return ""
    fieldnames = [
        "timestamp", "location", "country", "region", "city", "latitude", "longitude",
        "temperature_c", "humidity_pct", "rainfall_mm", "wind_speed_kmh", "pressure_hpa",
        "co2_ppm", "sensor_id", "data_source", "status",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for r in records:
        writer.writerow(r)
    return buf.getvalue()


async def summary_stats() -> dict:
    db = get_db()
    coll = db.get_collection("climate_records")
    all_records = await coll.find({})
    total = len(all_records)
    if total == 0:
        return {
            "total_records": 0, "processed_records": 0, "active_sensors": 0,
            "anomaly_count": 0, "avg_temperature_c": 0, "avg_rainfall_mm": 0,
            "avg_co2_ppm": 0, "current_temperature_c": 0,
        }
    processed = sum(1 for r in all_records if r.get("status") in ("Processed", "Validated"))
    sensors = {r.get("sensor_id") for r in all_records if r.get("sensor_id")}
    anomalies = sum(1 for r in all_records if r.get("is_anomaly"))
    avg_temp = sum(r.get("temperature_c", 0) for r in all_records) / total
    avg_rain = sum(r.get("rainfall_mm", 0) for r in all_records) / total
    avg_co2 = sum(r.get("co2_ppm", 0) for r in all_records) / total
    latest = sorted(all_records, key=lambda r: r.get("timestamp", ""))[-1]
    return {
        "total_records": total,
        "processed_records": processed,
        "active_sensors": len(sensors),
        "anomaly_count": anomalies,
        "avg_temperature_c": round(avg_temp, 2),
        "avg_rainfall_mm": round(avg_rain, 2),
        "avg_co2_ppm": round(avg_co2, 2),
        "current_temperature_c": round(latest.get("temperature_c", 0), 2),
    }
