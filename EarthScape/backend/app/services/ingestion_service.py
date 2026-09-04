from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from fastapi import HTTPException, status

from app.database import get_db, new_id
from app.hdfs import service as hdfs_service

COLUMN_ALIASES = {
    "date": "timestamp", "datetime": "timestamp", "time": "timestamp", "recorded_at": "timestamp",
    "lat": "latitude", "lng": "longitude", "lon": "longitude", "long": "longitude",
    "temp": "temperature_c", "temperature": "temperature_c", "temp_c": "temperature_c",
    "humidity": "humidity_pct", "rh": "humidity_pct",
    "rainfall": "rainfall_mm", "precipitation": "rainfall_mm", "rain": "rainfall_mm",
    "wind": "wind_speed_kmh", "wind_speed": "wind_speed_kmh", "windspeed": "wind_speed_kmh",
    "pressure": "pressure_hpa", "air_pressure": "pressure_hpa",
    "co2": "co2_ppm", "carbon_dioxide": "co2_ppm",
    "sensor": "sensor_id", "sensorid": "sensor_id", "station_id": "sensor_id",
    "source": "data_source", "datasource": "data_source",
    "loc": "location", "place": "location",
}

REQUIRED_ANY_LOCATION = ["location", "city"]
NUMERIC_COLUMNS = ["temperature_c", "humidity_pct", "rainfall_mm", "wind_speed_kmh", "pressure_hpa", "co2_ppm", "latitude", "longitude"]
SUPPORTED_EXTENSIONS = {".csv", ".json", ".xlsx", ".xls", ".txt"}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    df = df.rename(columns={k: v for k, v in COLUMN_ALIASES.items() if k in df.columns})
    return df


def _parse_file(filename: str, raw: bytes) -> pd.DataFrame:
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported file type '{ext}'. Use CSV, JSON, Excel or TXT.")
    try:
        if ext == ".csv" or ext == ".txt":
            df = pd.read_csv(io.BytesIO(raw))
        elif ext == ".json":
            df = pd.read_json(io.BytesIO(raw))
        else:
            df = pd.read_excel(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Could not parse file: {exc}")
    return df


async def ingest_file(
    filename: str,
    raw: bytes,
    source_type: str,
    uploaded_by: str,
) -> dict:
    audit_trail: list[str] = []
    errors: list[str] = []

    df = _parse_file(filename, raw)
    audit_trail.append(f"Parsed {len(df)} raw rows from {filename}")
    df = _normalize_columns(df)

    if not any(col in df.columns for col in REQUIRED_ANY_LOCATION):
        errors.append("Missing required location column (expected 'location' or 'city').")
    if "timestamp" not in df.columns:
        errors.append("Missing required 'timestamp'/'date' column.")

    if errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, {"message": "Validation failed", "errors": errors})

    missing_values: dict[str, int] = {}
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            before_na = df[col].isna().sum()
            df[col] = pd.to_numeric(df[col], errors="coerce")
            after_na = df[col].isna().sum()
            invalid = after_na - before_na
            if invalid > 0:
                audit_trail.append(f"Coerced {invalid} non-numeric values in '{col}' to null")
            if after_na > 0:
                missing_values[col] = int(after_na)

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    invalid_timestamps = int(df["timestamp"].isna().sum())
    if invalid_timestamps:
        audit_trail.append(f"Dropped {invalid_timestamps} rows with unparseable timestamps")
        df = df[df["timestamp"].notna()]

    if "latitude" in df.columns:
        bad_lat = df["latitude"].apply(lambda v: pd.notna(v) and not (-90 <= v <= 90)).sum()
        if bad_lat:
            errors.append(f"{int(bad_lat)} rows have out-of-range latitude values (flagged, not dropped)")
    if "longitude" in df.columns:
        bad_lon = df["longitude"].apply(lambda v: pd.notna(v) and not (-180 <= v <= 180)).sum()
        if bad_lon:
            errors.append(f"{int(bad_lon)} rows have out-of-range longitude values (flagged, not dropped)")

    duplicate_mask = df.duplicated(subset=[c for c in ["timestamp", "sensor_id"] if c in df.columns], keep="first")
    duplicates = int(duplicate_mask.sum())
    if duplicates:
        audit_trail.append(f"Removed {duplicates} duplicate rows (same timestamp + sensor)")
        df = df[~duplicate_mask]

    for col in NUMERIC_COLUMNS:
        if col in df.columns and df[col].isna().any():
            median = df[col].median()
            filled = int(df[col].isna().sum())
            df[col] = df[col].fillna(median if pd.notna(median) else 0)
            audit_trail.append(f"Filled {filled} missing '{col}' values with column median ({round(median, 2) if pd.notna(median) else 0})")

    if "location" not in df.columns and "city" in df.columns:
        df["location"] = df["city"]
    for col in ["city", "country", "region", "location"]:
        if col not in df.columns:
            df[col] = None
        else:
            df[col] = df[col].fillna("Unknown")

    if "sensor_id" not in df.columns:
        df["sensor_id"] = None
    df["sensor_id"] = df["sensor_id"].where(df["sensor_id"].notna(), None)

    if "data_source" not in df.columns:
        df["data_source"] = source_type

    now_iso = datetime.now(timezone.utc).isoformat()
    records = []
    for idx, row in df.iterrows():
        row_flagged = bool(errors)
        records.append(
            {
                "_id": new_id(),
                "timestamp": row["timestamp"].isoformat() if pd.notna(row["timestamp"]) else now_iso,
                "location": row.get("location") or "Unknown",
                "country": row.get("country") or "Unknown",
                "region": row.get("region") or "Unknown",
                "city": row.get("city") or row.get("location") or "Unknown",
                "latitude": float(row["latitude"]) if "latitude" in df.columns and pd.notna(row.get("latitude")) else None,
                "longitude": float(row["longitude"]) if "longitude" in df.columns and pd.notna(row.get("longitude")) else None,
                "temperature_c": float(row["temperature_c"]) if "temperature_c" in df.columns else None,
                "humidity_pct": float(row["humidity_pct"]) if "humidity_pct" in df.columns else None,
                "rainfall_mm": float(row["rainfall_mm"]) if "rainfall_mm" in df.columns else None,
                "wind_speed_kmh": float(row["wind_speed_kmh"]) if "wind_speed_kmh" in df.columns else None,
                "pressure_hpa": float(row["pressure_hpa"]) if "pressure_hpa" in df.columns else None,
                "co2_ppm": float(row["co2_ppm"]) if "co2_ppm" in df.columns else None,
                "sensor_id": row.get("sensor_id") or f"UPLOAD-{new_id()[:6].upper()}",
                "data_source": row.get("data_source") or source_type,
                "status": "Flagged" if row_flagged else "Processed",
                "is_anomaly": False,
                "anomaly_kind": None,
                "created_at": now_iso,
                "ingested": True,
            }
        )

    db = get_db()
    if records:
        await db.get_collection("climate_records").insert_many(records)

    year, month = datetime.now(timezone.utc).year, datetime.now(timezone.utc).month
    hdfs_meta = hdfs_service.write_file(
        "raw", [f"year={year}", f"month={month:02d}", f"source={source_type.replace(' ', '_')}"], filename, raw
    )

    dataset = {
        "_id": new_id(),
        "filename": filename,
        "size_bytes": len(raw),
        "source_type": source_type,
        "uploaded_by": uploaded_by,
        "uploaded_at": now_iso,
        "record_count": len(records),
        "raw_row_count": int(len(df)) + duplicates + invalid_timestamps,
        "missing_values": missing_values,
        "duplicates_removed": duplicates,
        "invalid_timestamps_dropped": invalid_timestamps,
        "validation_errors": errors,
        "validation_status": "Passed with warnings" if errors else "Passed",
        "processing_status": "Completed",
        "audit_trail": audit_trail,
        "hdfs_destination": hdfs_meta["hdfs_path"],
    }
    await db.get_collection("datasets").insert_one(dataset)
    return dataset


async def list_datasets(limit: int = 50) -> list[dict]:
    db = get_db()
    return await db.get_collection("datasets").find({}, sort=[("uploaded_at", -1)], limit=limit)
