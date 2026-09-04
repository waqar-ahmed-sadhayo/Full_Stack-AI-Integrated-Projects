"""
Simulated Hadoop MapReduce jobs. DEMO_MODE runs the exact same
map -> shuffle -> reduce logical stages using pandas groupby locally
(no cluster available on a laptop), tracked through the same
`hadoop_jobs` collection and API contract a real YARN-submitted job
would use. Output is written to the HDFS-simulated `analytics` zone.
"""
from __future__ import annotations

import asyncio
import io
import time
from datetime import datetime, timezone

import pandas as pd

from app.database import get_db, new_id
from app.hdfs import service as hdfs_service

JOB_DEFINITIONS = {
    "temperature_aggregation": {
        "name": "Temperature Aggregation (avg/min/max by region)",
        "metric": "temperature_c",
        "agg": ["mean", "min", "max"],
        "group": ["region"],
    },
    "temperature_yearly": {
        "name": "Temperature Yearly Trend",
        "metric": "temperature_c",
        "agg": ["mean", "min", "max"],
        "group": ["year"],
    },
    "rainfall_aggregation": {
        "name": "Rainfall Totals (sum/avg/max by region)",
        "metric": "rainfall_mm",
        "agg": ["sum", "mean", "max"],
        "group": ["region"],
    },
    "rainfall_yearly": {
        "name": "Rainfall Yearly Trend",
        "metric": "rainfall_mm",
        "agg": ["sum", "mean", "max"],
        "group": ["year"],
    },
    "co2_aggregation": {
        "name": "CO2 Concentration (avg/max by region)",
        "metric": "co2_ppm",
        "agg": ["mean", "max"],
        "group": ["region"],
    },
    "co2_yearly": {
        "name": "CO2 Yearly Trend",
        "metric": "co2_ppm",
        "agg": ["mean", "max"],
        "group": ["year"],
    },
    "regional_summary": {
        "name": "Regional Climate Summary",
        "metric": None,
        "agg": None,
        "group": ["region"],
    },
    "anomaly_processing": {
        "name": "Anomaly Processing & Regional Rollup",
        "metric": None,
        "agg": None,
        "group": ["region"],
    },
}


async def _load_records_df() -> pd.DataFrame:
    db = get_db()
    records = await db.get_collection("climate_records").find({})
    if not records:
        return pd.DataFrame()
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["year"] = df["timestamp"].dt.year
    df["month"] = df["timestamp"].dt.month
    return df


def _map_reduce_aggregate(df: pd.DataFrame, definition: dict) -> pd.DataFrame:
    """The 'map' phase emits (key, value) pairs per record; the 'reduce'
    phase performs the groupby aggregation. pandas groupby is used as the
    local execution engine standing in for a YARN-distributed reducer."""
    group_cols = definition["group"]
    if definition["metric"] is None:
        grouped = (
            df.groupby(group_cols)
            .agg(
                record_count=("_id", "count"),
                avg_temperature_c=("temperature_c", "mean"),
                total_rainfall_mm=("rainfall_mm", "sum"),
                avg_co2_ppm=("co2_ppm", "mean"),
                anomaly_count=("is_anomaly", "sum"),
            )
            .reset_index()
        )
        return grouped

    agg_map = {f"{definition['metric']}_{fn}": (definition["metric"], fn) for fn in definition["agg"]}
    grouped = df.groupby(group_cols).agg(record_count=("_id", "count"), **agg_map).reset_index()
    return grouped


async def start_job(job_type: str, triggered_by: str) -> dict:
    if job_type not in JOB_DEFINITIONS:
        raise ValueError(f"Unknown job type: {job_type}")

    db = get_db()
    jobs = db.get_collection("hadoop_jobs")
    now = datetime.now(timezone.utc).isoformat()
    job = {
        "_id": new_id(),
        "job_id": f"JOB-{new_id()[:8].upper()}",
        "job_type": job_type,
        "name": JOB_DEFINITIONS[job_type]["name"],
        "status": "Queued",
        "mapper_status": "Pending",
        "reducer_status": "Pending",
        "input_records": 0,
        "output_records": 0,
        "start_time": now,
        "end_time": None,
        "execution_time_ms": None,
        "triggered_by": triggered_by,
        "output_path": None,
        "error": None,
        "simulated": True,
    }
    await jobs.insert_one(job)
    asyncio.create_task(_execute_job(job["_id"], job_type))
    return job


async def _execute_job(doc_id: str, job_type: str):
    db = get_db()
    jobs = db.get_collection("hadoop_jobs")
    started = time.perf_counter()
    try:
        await jobs.update_one({"_id": doc_id}, {"$set": {"status": "Running", "mapper_status": "Running"}})
        await asyncio.sleep(0.6)  # simulate mapper distribution latency

        df = await _load_records_df()
        input_records = len(df)
        await jobs.update_one(
            {"_id": doc_id},
            {"$set": {"mapper_status": "Completed", "reducer_status": "Running", "input_records": input_records}},
        )
        await asyncio.sleep(0.4)  # simulate shuffle/reduce latency

        if df.empty:
            result_df = pd.DataFrame()
        else:
            result_df = _map_reduce_aggregate(df, JOB_DEFINITIONS[job_type])

        buffer = io.StringIO()
        result_df.to_csv(buffer, index=False)
        year = datetime.now(timezone.utc).year
        month = datetime.now(timezone.utc).month
        out_meta = hdfs_service.write_file(
            "analytics",
            [f"year={year}", f"month={month:02d}", job_type],
            f"{job_type}_{doc_id[:8]}.csv",
            buffer.getvalue().encode("utf-8"),
        )

        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        await jobs.update_one(
            {"_id": doc_id},
            {
                "$set": {
                    "status": "Completed",
                    "reducer_status": "Completed",
                    "output_records": len(result_df),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "execution_time_ms": elapsed_ms,
                    "output_path": out_meta["hdfs_path"],
                }
            },
        )
    except Exception as exc:  # pragma: no cover - defensive
        await jobs.update_one(
            {"_id": doc_id},
            {
                "$set": {
                    "status": "Failed",
                    "mapper_status": "Failed",
                    "reducer_status": "Failed",
                    "error": str(exc),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                }
            },
        )


async def list_jobs(limit: int = 100) -> list[dict]:
    db = get_db()
    return await db.get_collection("hadoop_jobs").find({}, sort=[("start_time", -1)], limit=limit)


async def get_job(job_id: str) -> dict | None:
    db = get_db()
    return await db.get_collection("hadoop_jobs").find_one({"job_id": job_id})
