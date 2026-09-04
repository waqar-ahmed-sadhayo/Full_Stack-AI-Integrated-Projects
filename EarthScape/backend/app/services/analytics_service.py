from __future__ import annotations

from typing import Optional

import pandas as pd

from app.database import get_db

METRICS = ["temperature_c", "humidity_pct", "rainfall_mm", "wind_speed_kmh", "pressure_hpa", "co2_ppm"]


async def _df(filters: Optional[dict] = None) -> pd.DataFrame:
    db = get_db()
    records = await db.get_collection("climate_records").find(filters or {})
    if not records:
        return pd.DataFrame()
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["timestamp"])
    df["year"] = df["timestamp"].dt.year
    df["month"] = df["timestamp"].dt.month
    df["month_name"] = df["timestamp"].dt.strftime("%b")
    df["date"] = df["timestamp"].dt.strftime("%Y-%m-%d")
    return df


def _apply_scope(df: pd.DataFrame, region=None, country=None, city=None, data_source=None) -> pd.DataFrame:
    if df.empty:
        return df
    if region:
        df = df[df["region"] == region]
    if country:
        df = df[df["country"] == country]
    if city:
        df = df[df["city"] == city]
    if data_source:
        df = df[df["data_source"] == data_source]
    return df


async def trend(metric: str, granularity: str = "day", region=None, country=None, city=None, data_source=None) -> list[dict]:
    if metric not in METRICS:
        metric = "temperature_c"
    df = await _df()
    df = _apply_scope(df, region, country, city, data_source)
    if df.empty:
        return []
    key = "date" if granularity == "day" else ("month_name" if granularity == "month" else "year")
    grouped = df.groupby(key)[metric].mean().reset_index().sort_values(key)
    return [{"period": str(row[key]), "value": round(row[metric], 2)} for _, row in grouped.iterrows()]


async def multi_metric_trend(granularity: str = "day", region=None, country=None, city=None, data_source=None) -> list[dict]:
    df = await _df()
    df = _apply_scope(df, region, country, city, data_source)
    if df.empty:
        return []
    key = "date" if granularity == "day" else ("month_name" if granularity == "month" else "year")
    grouped = df.groupby(key)[METRICS].mean().reset_index().sort_values(key)
    out = []
    for _, row in grouped.iterrows():
        item = {"period": str(row[key])}
        for m in METRICS:
            item[m] = round(row[m], 2)
        out.append(item)
    return out


async def regional_comparison(metric: str = "temperature_c") -> list[dict]:
    df = await _df()
    if df.empty:
        return []
    grouped = df.groupby("region")[metric].mean().reset_index().sort_values(metric, ascending=False)
    return [{"region": row["region"], "value": round(row[metric], 2)} for _, row in grouped.iterrows()]


async def seasonal_trend(metric: str = "temperature_c") -> list[dict]:
    df = await _df()
    if df.empty:
        return []
    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    grouped = df.groupby("month_name")[metric].mean().reindex(month_order).reset_index()
    return [{"month": row["month_name"], "value": round(row[metric], 2) if pd.notna(row[metric]) else None} for _, row in grouped.iterrows()]


async def source_breakdown() -> list[dict]:
    df = await _df()
    if df.empty:
        return []
    grouped = df.groupby("data_source").size().reset_index(name="count")
    return [{"source": row["data_source"], "count": int(row["count"])} for _, row in grouped.iterrows()]


async def correlation_matrix() -> dict:
    df = await _df()
    if df.empty:
        return {"metrics": METRICS, "matrix": []}
    corr = df[METRICS].corr().round(3)
    matrix = corr.values.tolist()
    return {"metrics": METRICS, "matrix": matrix}


async def status_breakdown() -> list[dict]:
    df = await _df()
    if df.empty:
        return []
    grouped = df.groupby("status").size().reset_index(name="count")
    return [{"status": row["status"], "count": int(row["count"])} for _, row in grouped.iterrows()]
