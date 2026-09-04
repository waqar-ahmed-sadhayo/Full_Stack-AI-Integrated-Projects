"""
Generates a realistic multi-city, multi-region, multi-date synthetic climate
dataset used to seed the platform (Mongo or the DEMO_MODE local store) so
analytics, ML, anomaly detection, Hadoop views, maps, alerts and reports all
have real volume to work against.
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone

from app.database import new_id
from app.utils.geo import CITIES, DATA_SOURCES

random.seed(42)

DAYS_OF_HISTORY = 330
ANOMALY_RATE = 0.045


def _sensor_id(city: str, source: str) -> str:
    code = "".join(w[0] for w in city.split())[:3].upper()
    src = "".join(w[0] for w in source.split())[:2].upper()
    return f"SNR-{code}-{src}-{random.randint(100, 999)}"


def _season_factor(day_of_year: int) -> float:
    return math.sin(((day_of_year - 80) / 365.0) * 2 * math.pi)


def generate_climate_records(days: int = DAYS_OF_HISTORY) -> list[dict]:
    records: list[dict] = []
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days)

    city_sensors = {
        c["city"]: {src: _sensor_id(c["city"], src) for src in DATA_SOURCES} for c in CITIES
    }

    for offset in range(days):
        date = start + timedelta(days=offset)
        day_of_year = date.timetuple().tm_yday
        for city in CITIES:
            hemisphere_flip = -1 if city["lat"] < 0 else 1
            seasonal = _season_factor(day_of_year) * hemisphere_flip
            source = random.choice(DATA_SOURCES)

            temp = city["base_temp"] + seasonal * city["amp"] + random.gauss(0, 1.4)
            humidity = max(5, min(100, 55 + seasonal * -10 + random.gauss(0, 8) + (10 if city["region"] == "Asia" else 0)))
            rainfall = max(0, random.gauss(3 + max(0, seasonal) * 4, 3))
            wind = max(0, random.gauss(14, 6))
            pressure = random.gauss(1013, 5)
            co2 = 415 + (offset / days) * 6 + random.gauss(0, 2.5)

            is_anomaly = random.random() < ANOMALY_RATE
            anomaly_kind = None
            if is_anomaly:
                anomaly_kind = random.choice(["heatwave", "coldsnap", "co2_spike", "storm", "drought"])
                if anomaly_kind == "heatwave":
                    temp += random.uniform(6, 12)
                elif anomaly_kind == "coldsnap":
                    temp -= random.uniform(6, 14)
                elif anomaly_kind == "co2_spike":
                    co2 += random.uniform(15, 40)
                elif anomaly_kind == "storm":
                    wind += random.uniform(30, 60)
                    rainfall += random.uniform(20, 60)
                    pressure -= random.uniform(15, 30)
                elif anomaly_kind == "drought":
                    rainfall = 0
                    humidity = max(5, humidity - random.uniform(20, 35))

            status = "Flagged" if is_anomaly else random.choices(
                ["Validated", "Processed", "Pending"], weights=[0.75, 0.20, 0.05]
            )[0]

            records.append(
                {
                    "_id": new_id(),
                    "timestamp": datetime.combine(date, datetime.min.time(), tzinfo=timezone.utc).isoformat(),
                    "location": f"{city['city']}, {city['country']}",
                    "country": city["country"],
                    "region": city["region"],
                    "city": city["city"],
                    "latitude": city["lat"],
                    "longitude": city["lon"],
                    "temperature_c": round(temp, 2),
                    "humidity_pct": round(humidity, 1),
                    "rainfall_mm": round(rainfall, 2),
                    "wind_speed_kmh": round(wind, 2),
                    "pressure_hpa": round(pressure, 1),
                    "co2_ppm": round(co2, 2),
                    "sensor_id": city_sensors[city["city"]][source],
                    "data_source": source,
                    "status": status,
                    "is_anomaly": is_anomaly,
                    "anomaly_kind": anomaly_kind,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
    return records


def generate_default_users() -> list[dict]:
    from app.auth.security import hash_password

    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "_id": new_id(),
            "full_name": "Dr. Elena Vance",
            "email": "admin@earthscape.io",
            "password_hash": hash_password("Admin@12345"),
            "role": "Administrator",
            "organization": "EarthScape Climate Agency",
            "is_active": True,
            "created_at": now,
        },
        {
            "_id": new_id(),
            "full_name": "Sam Rivera",
            "email": "analyst@earthscape.io",
            "password_hash": hash_password("Analyst@12345"),
            "role": "Analyst",
            "organization": "EarthScape Climate Agency",
            "is_active": True,
            "created_at": now,
        },
    ]
