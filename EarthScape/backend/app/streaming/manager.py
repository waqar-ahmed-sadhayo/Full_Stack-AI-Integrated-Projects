"""
Real-time WebSocket layer. DEMO_MODE simulates a live sensor constellation:
every ~2.5s a reading is generated for a random city/sensor, then run
through the same pipeline a real ingest would use: validate -> process
-> threshold-check -> anomaly-check -> alert-if-needed -> store -> broadcast.
"""
from __future__ import annotations

import asyncio
import json
import random
from datetime import datetime, timezone

from fastapi import WebSocket

from app.database import get_db, new_id
from app.services import alerts_service
from app.utils.geo import CITIES, DATA_SOURCES


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
        self._recent_events: list[dict] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        for event in self._recent_events[-30:]:
            await ws.send_text(json.dumps(event, default=str))

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, event: dict):
        self._recent_events.append(event)
        self._recent_events = self._recent_events[-100:]
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(event, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()

ACTIVE_SENSORS = [
    {"sensor_id": f"SNR-{c['city'][:3].upper()}-{i}", "city": c["city"], "country": c["country"], "region": c["region"], "lat": c["lat"], "lon": c["lon"]}
    for c in CITIES
    for i in range(1, 3)
]


def _sensor_statuses() -> list[dict]:
    return [{**s, "status": random.choices(["Online", "Online", "Online", "Degraded"], weights=[6, 6, 6, 1])[0]} for s in ACTIVE_SENSORS]


async def _generate_reading() -> dict:
    city = random.choice(CITIES)
    sensor = random.choice([s for s in ACTIVE_SENSORS if s["city"] == city["city"]])
    now = datetime.now(timezone.utc)
    doy = now.timetuple().tm_yday
    import math

    seasonal = math.sin(((doy - 80) / 365.0) * 2 * math.pi) * (-1 if city["lat"] < 0 else 1)

    record = {
        "_id": new_id(),
        "timestamp": now.isoformat(),
        "location": f"{city['city']}, {city['country']}",
        "country": city["country"],
        "region": city["region"],
        "city": city["city"],
        "latitude": city["lat"],
        "longitude": city["lon"],
        "temperature_c": round(city["base_temp"] + seasonal * city["amp"] + random.gauss(0, 1.6), 2),
        "humidity_pct": round(max(5, min(100, 55 + random.gauss(0, 10))), 1),
        "rainfall_mm": round(max(0, random.gauss(2, 3)), 2),
        "wind_speed_kmh": round(max(0, random.gauss(14, 7)), 2),
        "pressure_hpa": round(random.gauss(1013, 6), 1),
        "co2_ppm": round(420 + random.gauss(0, 3), 2),
        "sensor_id": sensor["sensor_id"],
        "data_source": random.choice(DATA_SOURCES),
        "status": "Processed",
        "is_anomaly": False,
        "anomaly_kind": None,
        "created_at": now.isoformat(),
        "realtime": True,
    }
    if random.random() < 0.03:
        kind = random.choice(["heatwave", "co2_spike", "storm"])
        record["is_anomaly"] = True
        record["anomaly_kind"] = kind
        record["status"] = "Flagged"
        if kind == "heatwave":
            record["temperature_c"] += random.uniform(6, 11)
        elif kind == "co2_spike":
            record["co2_ppm"] += random.uniform(15, 35)
        elif kind == "storm":
            record["wind_speed_kmh"] += random.uniform(30, 55)
            record["pressure_hpa"] -= random.uniform(15, 25)
    return record


async def simulator_loop():
    db = get_db()
    while True:
        try:
            await asyncio.sleep(2.5)
            record = await _generate_reading()
            await db.get_collection("climate_records").insert_one(record)
            await manager.broadcast({"type": "sensor_reading", "data": record})

            if record["is_anomaly"]:
                await manager.broadcast({"type": "anomaly_event", "data": {
                    "location": record["location"], "parameter": "temperature_c" if record["anomaly_kind"] == "heatwave" else ("co2_ppm" if record["anomaly_kind"] == "co2_spike" else "wind_speed_kmh"),
                    "kind": record["anomaly_kind"], "timestamp": record["timestamp"],
                }})

            new_alerts = await alerts_service.check_thresholds(record)
            for alert in new_alerts:
                await manager.broadcast({"type": "alert_event", "data": alert})

            if random.random() < 0.08:
                await manager.broadcast({"type": "processing_event", "data": {
                    "message": "Simulated MapReduce micro-batch committed to /earthscape/processed",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }})
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(1)
