from __future__ import annotations

from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.database import get_db, new_id

METRICS = ["temperature_c", "humidity_pct", "rainfall_mm", "wind_speed_kmh", "pressure_hpa", "co2_ppm"]


def _severity_from_z(z: float) -> str:
    az = abs(z)
    if az >= 4:
        return "Critical"
    if az >= 3:
        return "High"
    if az >= 2:
        return "Medium"
    if az >= 1:
        return "Low"
    return "Normal"


async def _load_df() -> pd.DataFrame:
    db = get_db()
    records = await db.get_collection("climate_records").find({})
    if not records:
        return pd.DataFrame()
    return pd.DataFrame(records)


async def run_zscore_detection(metric: str = "temperature_c") -> list[dict]:
    df = await _load_df()
    if df.empty or metric not in df.columns:
        return []
    results = []
    for region, group in df.groupby("region"):
        vals = pd.to_numeric(group[metric], errors="coerce")
        mean, std = vals.mean(), vals.std()
        if not std or pd.isna(std):
            continue
        z = (vals - mean) / std
        for idx, zscore in z.items():
            if abs(zscore) >= 2:
                row = group.loc[idx]
                results.append(_build_anomaly(row, metric, mean, "Z-Score", zscore, min(0.99, round(abs(zscore) / 5, 2))))
    return results


async def run_iqr_detection(metric: str = "temperature_c") -> list[dict]:
    df = await _load_df()
    if df.empty or metric not in df.columns:
        return []
    results = []
    for region, group in df.groupby("region"):
        vals = pd.to_numeric(group[metric], errors="coerce").dropna()
        if len(vals) < 5:
            continue
        q1, q3 = vals.quantile(0.25), vals.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        for idx, val in vals.items():
            if val < lower or val > upper:
                row = group.loc[idx]
                deviation = (val - upper) if val > upper else (lower - val)
                z_equiv = deviation / (iqr if iqr else 1)
                results.append(_build_anomaly(row, metric, vals.median(), "IQR", z_equiv, min(0.95, round(0.5 + z_equiv / 10, 2))))
    return results


async def run_isolation_forest_detection() -> list[dict]:
    df = await _load_df()
    if df.empty:
        return []
    feature_df = df[METRICS].apply(pd.to_numeric, errors="coerce").dropna()
    if len(feature_df) < 20:
        return []
    model = IsolationForest(contamination=0.05, random_state=42, n_estimators=150)
    model.fit(feature_df)
    scores = model.decision_function(feature_df)
    preds = model.predict(feature_df)
    results = []
    for idx, pred in zip(feature_df.index, preds):
        if pred == -1:
            row = df.loc[idx]
            score = scores[list(feature_df.index).index(idx)]
            confidence = round(min(0.99, max(0.5, 0.5 - score)), 2)
            deviant_metric = max(METRICS, key=lambda m: abs(row[m] - df[m].mean()) / (df[m].std() or 1))
            results.append(
                _build_anomaly(row, deviant_metric, df[deviant_metric].mean(), "Isolation Forest", score, confidence)
            )
    return results


def _build_anomaly(row: pd.Series, metric: str, expected: float, method: str, zscore: float, confidence: float) -> dict:
    actual = row.get(metric)
    return {
        "_id": new_id(),
        "record_id": row.get("_id"),
        "location": row.get("location"),
        "region": row.get("region"),
        "city": row.get("city"),
        "timestamp": row.get("timestamp"),
        "parameter": metric,
        "actual_value": round(float(actual), 2) if actual is not None else None,
        "expected_value": round(float(expected), 2) if expected is not None else None,
        "deviation": round(float(actual - expected), 2) if actual is not None and expected is not None else None,
        "severity": _severity_from_z(zscore),
        "detection_method": method,
        "confidence_score": confidence,
        "status": "Open",
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }


async def run_full_detection(metric: str = "temperature_c") -> dict:
    zscore_results = await run_zscore_detection(metric)
    iqr_results = await run_iqr_detection(metric)
    iso_results = await run_isolation_forest_detection()

    db = get_db()
    coll = db.get_collection("anomalies")
    await coll.delete_many({})
    all_results = zscore_results + iqr_results + iso_results
    if all_results:
        await coll.insert_many(all_results)
    return {
        "zscore_found": len(zscore_results),
        "iqr_found": len(iqr_results),
        "isolation_forest_found": len(iso_results),
        "total_anomalies": len(all_results),
    }


async def list_anomalies(severity=None, method=None, status=None, region=None, limit: int = 200) -> list[dict]:
    db = get_db()
    filt = {}
    if severity:
        filt["severity"] = severity
    if method:
        filt["detection_method"] = method
    if status:
        filt["status"] = status
    if region:
        filt["region"] = region
    return await db.get_collection("anomalies").find(filt, sort=[("detected_at", -1)], limit=limit)


async def update_anomaly_status(anomaly_id: str, new_status: str) -> bool:
    db = get_db()
    return await db.get_collection("anomalies").update_one({"_id": anomaly_id}, {"$set": {"status": new_status}})


async def distribution() -> dict:
    db = get_db()
    anomalies = await db.get_collection("anomalies").find({})
    severity_counts: dict[str, int] = {}
    method_counts: dict[str, int] = {}
    for a in anomalies:
        severity_counts[a["severity"]] = severity_counts.get(a["severity"], 0) + 1
        method_counts[a["detection_method"]] = method_counts.get(a["detection_method"], 0) + 1
    return {"by_severity": severity_counts, "by_method": method_counts, "total": len(anomalies)}
