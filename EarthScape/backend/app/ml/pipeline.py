"""
ML pipeline: extract -> validate -> clean -> feature-engineer -> train ->
evaluate -> serialize (joblib) -> version -> predict.

Four model families, each with an algorithm suited to its target:
  - temperature_predictor : RandomForestRegressor   (seasonal + geo features)
  - rainfall_predictor    : RandomForestRegressor    (seasonal + geo features)
  - climate_trend         : LinearRegression          (long-horizon CO2 drift)
  - anomaly_detector       : RandomForestClassifier    (supervised, trained
                              against the injected ground-truth anomaly
                              labels in the sample dataset)
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, precision_score, r2_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from app.config import get_settings
from app.database import get_db, new_id
from app.utils.geo import CITIES

settings = get_settings()

MODEL_TYPES = ["temperature_predictor", "rainfall_predictor", "climate_trend", "anomaly_detector"]

REGRESSION_TARGETS = {"temperature_predictor": "temperature_c", "rainfall_predictor": "rainfall_mm"}


async def _load_df() -> pd.DataFrame:
    db = get_db()
    records = await db.get_collection("climate_records").find({})
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["timestamp"])
    return df


def _engineer_seasonal_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    doy = df["timestamp"].dt.dayofyear
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.0)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.0)
    df["year_idx"] = (df["timestamp"] - df["timestamp"].min()).dt.days
    le = LabelEncoder()
    df["region_enc"] = le.fit_transform(df["region"].astype(str))
    return df, le


def _model_path(model_type: str, version: int) -> str:
    return str(settings.model_path / f"{model_type}_v{version}.joblib")


async def _next_version(model_type: str) -> int:
    db = get_db()
    existing = await db.get_collection("ml_models").find({"model_type": model_type})
    return (max((m.get("version", 0) for m in existing), default=0)) + 1


async def train_regression_model(model_type: str, triggered_by: str) -> dict:
    target = REGRESSION_TARGETS[model_type]
    df = await _load_df()
    df = df.dropna(subset=[target, "latitude", "longitude", "region"])
    if len(df) < 30:
        raise ValueError("Not enough training data (need at least 30 valid records).")

    df, encoder = _engineer_seasonal_features(df)
    features = ["doy_sin", "doy_cos", "latitude", "longitude", "region_enc"]
    X, y = df[features], df[target]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    residual_std = float(np.std(y_test - preds))
    mae = float(mean_absolute_error(y_test, preds))
    mse = float(mean_squared_error(y_test, preds))
    rmse = float(math.sqrt(mse))
    r2 = float(r2_score(y_test, preds))

    version = await _next_version(model_type)
    payload = {"model": model, "encoder": encoder, "features": features, "residual_std": residual_std}
    joblib.dump(payload, _model_path(model_type, version))

    metrics = {"mae": round(mae, 3), "mse": round(mse, 3), "rmse": round(rmse, 3), "r2": round(r2, 4)}
    return await _save_model_metadata(model_type, "RandomForestRegressor", version, len(df), metrics, triggered_by)


async def train_climate_trend_model(triggered_by: str) -> dict:
    df = await _load_df()
    df = df.dropna(subset=["co2_ppm"])
    if len(df) < 30:
        raise ValueError("Not enough training data.")
    df = df.sort_values("timestamp")
    day_idx = (df["timestamp"] - df["timestamp"].min()).dt.days.values.reshape(-1, 1)
    y = df["co2_ppm"].values

    X_train, X_test, y_train, y_test = train_test_split(day_idx, y, test_size=0.2, random_state=42)
    model = LinearRegression()
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    residual_std = float(np.std(y_test - preds))
    mae = float(mean_absolute_error(y_test, preds))
    mse = float(mean_squared_error(y_test, preds))
    r2 = float(r2_score(y_test, preds))

    version = await _next_version("climate_trend")
    payload = {"model": model, "base_date": df["timestamp"].min().isoformat(), "residual_std": residual_std}
    joblib.dump(payload, _model_path("climate_trend", version))

    metrics = {"mae": round(mae, 3), "mse": round(mse, 3), "rmse": round(math.sqrt(mse), 3), "r2": round(r2, 4)}
    return await _save_model_metadata("climate_trend", "LinearRegression", version, len(df), metrics, triggered_by)


async def train_anomaly_classifier(triggered_by: str) -> dict:
    df = await _load_df()
    if "is_anomaly" not in df.columns or len(df) < 30:
        raise ValueError("Not enough labeled training data.")
    df, encoder = _engineer_seasonal_features(df)
    features = ["temperature_c", "humidity_pct", "rainfall_mm", "wind_speed_kmh", "pressure_hpa", "co2_ppm", "doy_sin", "doy_cos", "region_enc"]
    df = df.dropna(subset=features)
    X, y = df[features], df["is_anomaly"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y if y.nunique() > 1 else None)
    model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42, class_weight="balanced", n_jobs=-1)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
    }

    version = await _next_version("anomaly_detector")
    payload = {"model": model, "encoder": encoder, "features": features}
    joblib.dump(payload, _model_path("anomaly_detector", version))

    return await _save_model_metadata("anomaly_detector", "RandomForestClassifier", version, len(df), metrics, triggered_by)


async def _save_model_metadata(model_type, algorithm, version, training_records, metrics, triggered_by) -> dict:
    db = get_db()
    coll = db.get_collection("ml_models")
    await coll.update_many({"model_type": model_type}, {"$set": {"is_active": False}})
    doc = {
        "_id": new_id(),
        "model_id": f"{model_type}_v{version}",
        "model_type": model_type,
        "algorithm": algorithm,
        "version": version,
        "training_records": training_records,
        "metrics": metrics,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "trained_by": triggered_by,
        "status": "Ready",
        "is_active": True,
    }
    await coll.insert_one(doc)
    return doc


async def get_active_model_doc(model_type: str) -> dict | None:
    db = get_db()
    return await db.get_collection("ml_models").find_one({"model_type": model_type, "is_active": True})


async def list_models() -> list[dict]:
    db = get_db()
    all_models = await db.get_collection("ml_models").find({}, sort=[("trained_at", -1)])
    latest: dict[str, dict] = {}
    for m in all_models:
        if m["model_type"] not in latest:
            latest[m["model_type"]] = m
    return list(latest.values())


def _lookup_city(location: str) -> dict | None:
    for c in CITIES:
        if c["city"].lower() in location.lower() or location.lower() in c["city"].lower():
            return c
    return None


async def predict(model_type: str, location: str, start_date: str, horizon_days: int = 14) -> dict:
    model_doc = await get_active_model_doc(model_type)
    if not model_doc:
        raise ValueError(f"No trained model found for '{model_type}'. Train it first.")

    payload = joblib.load(_model_path(model_type, model_doc["version"]))
    city = _lookup_city(location) or {"lat": 0.0, "lon": 0.0, "region": "Unknown"}

    start = pd.to_datetime(start_date, utc=True, errors="coerce") or pd.Timestamp.now(tz="UTC")
    forecasts = []

    if model_type in REGRESSION_TARGETS:
        model, encoder, features, residual_std = payload["model"], payload["encoder"], payload["features"], payload["residual_std"]
        try:
            region_enc = encoder.transform([city.get("region", "Unknown")])[0]
        except ValueError:
            region_enc = 0
        for i in range(horizon_days):
            date = start + timedelta(days=i)
            doy = date.dayofyear
            row = pd.DataFrame(
                [{
                    "doy_sin": math.sin(2 * math.pi * doy / 365.0),
                    "doy_cos": math.cos(2 * math.pi * doy / 365.0),
                    "latitude": city.get("lat", 0.0),
                    "longitude": city.get("lon", 0.0),
                    "region_enc": region_enc,
                }]
            )[features]
            pred = float(model.predict(row)[0])
            forecasts.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "predicted_value": round(pred, 2),
                    "confidence_lower": round(pred - 1.96 * residual_std, 2),
                    "confidence_upper": round(pred + 1.96 * residual_std, 2),
                }
            )
    elif model_type == "climate_trend":
        model, base_date, residual_std = payload["model"], pd.to_datetime(payload["base_date"]), payload["residual_std"]
        for i in range(horizon_days):
            date = start + timedelta(days=i)
            day_idx = (date - base_date).days
            pred = float(model.predict([[day_idx]])[0])
            forecasts.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "predicted_value": round(pred, 2),
                    "confidence_lower": round(pred - 1.96 * residual_std, 2),
                    "confidence_upper": round(pred + 1.96 * residual_std, 2),
                }
            )
    else:
        raise ValueError(f"Model type '{model_type}' does not support forward forecasting.")

    db = get_db()
    metric_field = REGRESSION_TARGETS.get(model_type, "co2_ppm")
    history_filter = {"$or": [{"city": {"$regex": location, "$options": "i"}}, {"location": {"$regex": location, "$options": "i"}}]}
    history_records = await db.get_collection("climate_records").find(history_filter, sort=[("timestamp", -1)], limit=60)
    history = sorted(
        [{"date": r["timestamp"][:10], "actual_value": r.get(metric_field)} for r in history_records if r.get(metric_field) is not None],
        key=lambda x: x["date"],
    )

    prediction_doc = {
        "_id": new_id(),
        "model_type": model_type,
        "model_id": model_doc["model_id"],
        "location": location,
        "start_date": start_date,
        "horizon_days": horizon_days,
        "forecasts": forecasts,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.get_collection("predictions").insert_one(prediction_doc)

    return {"history": history, "forecasts": forecasts, "model": model_doc}
