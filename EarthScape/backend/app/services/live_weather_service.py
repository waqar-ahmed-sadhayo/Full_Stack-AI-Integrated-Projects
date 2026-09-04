"""
Live weather for major Pakistani cities via the Open-Meteo API (free, no API
key required). This is REAL external data — unlike the rest of the platform,
it is not affected by DEMO_MODE and is not simulated.

Responses are cached briefly in-memory to stay well within Open-Meteo's fair
-use limits and keep the dashboard snappy.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

PAKISTAN_CITIES = [
    {"city": "Karachi", "province": "Sindh", "lat": 24.8607, "lon": 67.0011},
    {"city": "Lahore", "province": "Punjab", "lat": 31.5204, "lon": 74.3587},
    {"city": "Islamabad", "province": "ICT", "lat": 33.6844, "lon": 73.0479},
    {"city": "Rawalpindi", "province": "Punjab", "lat": 33.5651, "lon": 73.0169},
    {"city": "Faisalabad", "province": "Punjab", "lat": 31.4504, "lon": 73.1350},
    {"city": "Multan", "province": "Punjab", "lat": 30.1575, "lon": 71.5249},
    {"city": "Peshawar", "province": "KPK", "lat": 34.0151, "lon": 71.5249},
    {"city": "Quetta", "province": "Balochistan", "lat": 30.1798, "lon": 66.9750},
    {"city": "Sialkot", "province": "Punjab", "lat": 32.4945, "lon": 74.5229},
    {"city": "Hyderabad", "province": "Sindh", "lat": 25.3960, "lon": 68.3578},
    {"city": "Gujranwala", "province": "Punjab", "lat": 32.1877, "lon": 74.1945},
    {"city": "Sukkur", "province": "Sindh", "lat": 27.7052, "lon": 68.8574},
]

# WMO weather interpretation codes -> (label, icon key)
WEATHER_CODE_MAP: dict[int, tuple[str, str]] = {
    0: ("Clear sky", "sun"),
    1: ("Mainly clear", "sun"),
    2: ("Partly cloudy", "cloud-sun"),
    3: ("Overcast", "cloud"),
    45: ("Fog", "fog"),
    48: ("Depositing rime fog", "fog"),
    51: ("Light drizzle", "drizzle"),
    53: ("Moderate drizzle", "drizzle"),
    55: ("Dense drizzle", "drizzle"),
    56: ("Light freezing drizzle", "drizzle"),
    57: ("Dense freezing drizzle", "drizzle"),
    61: ("Slight rain", "rain"),
    63: ("Moderate rain", "rain"),
    65: ("Heavy rain", "rain"),
    66: ("Light freezing rain", "rain"),
    67: ("Heavy freezing rain", "rain"),
    71: ("Slight snow fall", "snow"),
    73: ("Moderate snow fall", "snow"),
    75: ("Heavy snow fall", "snow"),
    77: ("Snow grains", "snow"),
    80: ("Slight rain showers", "rain"),
    81: ("Moderate rain showers", "rain"),
    82: ("Violent rain showers", "rain"),
    85: ("Slight snow showers", "snow"),
    86: ("Heavy snow showers", "snow"),
    95: ("Thunderstorm", "storm"),
    96: ("Thunderstorm with slight hail", "storm"),
    99: ("Thunderstorm with heavy hail", "storm"),
}

CACHE_TTL_SECONDS = 600  # 10 minutes

_cache: dict = {"data": None, "fetched_at": None}
_lock = asyncio.Lock()


def _describe(code: Optional[int]) -> tuple[str, str]:
    if code is None:
        return ("Unknown", "cloud")
    return WEATHER_CODE_MAP.get(code, ("Unknown", "cloud"))


async def _fetch_from_open_meteo() -> list[dict]:
    lats = ",".join(str(c["lat"]) for c in PAKISTAN_CITIES)
    lons = ",".join(str(c["lon"]) for c in PAKISTAN_CITIES)
    params = {
        "latitude": lats,
        "longitude": lons,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,"
        "weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,is_day",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=8.0) as http_client:
        res = await http_client.get(OPEN_METEO_URL, params=params)
        res.raise_for_status()
        payload = res.json()

    # Open-Meteo returns a single object (not a list) when only one location is requested.
    locations = payload if isinstance(payload, list) else [payload]

    results = []
    for city, location in zip(PAKISTAN_CITIES, locations):
        current = location.get("current", {})
        code = current.get("weather_code")
        label, icon = _describe(code)
        results.append(
            {
                "city": city["city"],
                "province": city["province"],
                "latitude": city["lat"],
                "longitude": city["lon"],
                "temperature_c": current.get("temperature_2m"),
                "feels_like_c": current.get("apparent_temperature"),
                "humidity_pct": current.get("relative_humidity_2m"),
                "precipitation_mm": current.get("precipitation"),
                "pressure_hpa": current.get("pressure_msl"),
                "wind_speed_kmh": current.get("wind_speed_10m"),
                "wind_direction_deg": current.get("wind_direction_10m"),
                "is_day": bool(current.get("is_day", 1)),
                "weather_code": code,
                "weather_label": label,
                "weather_icon": icon,
                "observed_at": current.get("time"),
                "timezone": location.get("timezone"),
            }
        )
    return results


async def get_pakistan_weather(force_refresh: bool = False) -> dict:
    now = datetime.now(timezone.utc)
    async with _lock:
        stale = (
            _cache["data"] is None
            or _cache["fetched_at"] is None
            or (now - _cache["fetched_at"]).total_seconds() > CACHE_TTL_SECONDS
        )
        if force_refresh or stale:
            try:
                cities = await _fetch_from_open_meteo()
                _cache["data"] = cities
                _cache["fetched_at"] = now
                _cache["error"] = None
            except Exception as exc:  # network hiccup — serve stale cache if we have one
                _cache["error"] = str(exc)
                if _cache["data"] is None:
                    raise

        return {
            "source": "Open-Meteo (live)",
            "simulated": False,
            "fetched_at": _cache["fetched_at"].isoformat(),
            "cache_age_seconds": round((now - _cache["fetched_at"]).total_seconds(), 1),
            "stale": _cache.get("error") is not None,
            "error": _cache.get("error"),
            "cities": _cache["data"],
        }
