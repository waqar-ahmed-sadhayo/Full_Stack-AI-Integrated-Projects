from fastapi import APIRouter, Depends

from app.auth.deps import require_any_role
from app.database import get_db
from app.hdfs import service as hdfs_service
from app.ml import pipeline as ml_pipeline
from app.services import analytics_service, anomaly_service, climate_service

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/kpis")
async def get_kpis(user=Depends(require_any_role)):
    db = get_db()
    summary = await climate_service.summary_stats()
    hdfs_stats = hdfs_service.storage_stats()
    running_jobs = await db.get_collection("hadoop_jobs").count({"status": "Running"})
    models = await ml_pipeline.list_models()
    accuracies = [m["metrics"].get("r2") or m["metrics"].get("accuracy") for m in models if m.get("metrics")]
    avg_accuracy = round(sum(a for a in accuracies if a is not None) / len(accuracies) * 100, 1) if accuracies else None

    return {
        **summary,
        "hdfs_used_pct": hdfs_stats["used_pct"],
        "active_processing_jobs": running_jobs,
        "prediction_accuracy_pct": avg_accuracy,
    }


@router.get("/overview")
async def get_overview(user=Depends(require_any_role)):
    kpis = await get_kpis(user)
    temp_trend = await analytics_service.trend("temperature_c", "day")
    rainfall_trend = await analytics_service.trend("rainfall_mm", "day")
    co2_trend = await analytics_service.trend("co2_ppm", "month")
    regional = await analytics_service.regional_comparison("temperature_c")
    seasonal = await analytics_service.seasonal_trend("temperature_c")
    anomaly_dist = await anomaly_service.distribution()

    return {
        "kpis": kpis,
        "temperature_trend": temp_trend[-30:],
        "rainfall_trend": rainfall_trend[-30:],
        "co2_trend": co2_trend,
        "regional_comparison": regional,
        "seasonal_trend": seasonal,
        "anomaly_distribution": anomaly_dist,
    }
