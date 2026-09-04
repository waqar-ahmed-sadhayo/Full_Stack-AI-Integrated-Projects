from typing import Optional

from fastapi import APIRouter, Depends

from app.auth.deps import require_any_role
from app.services import analytics_service, climate_service

router = APIRouter(prefix="/api/v1/analytics", tags=["Climate Analytics"])


@router.get("/trend")
async def get_trend(
    metric: str = "temperature_c",
    granularity: str = "day",
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    data_source: Optional[str] = None,
    user=Depends(require_any_role),
):
    return await analytics_service.trend(metric, granularity, region, country, city, data_source)


@router.get("/multi-trend")
async def get_multi_trend(
    granularity: str = "day",
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    data_source: Optional[str] = None,
    user=Depends(require_any_role),
):
    return await analytics_service.multi_metric_trend(granularity, region, country, city, data_source)


@router.get("/regional-comparison")
async def get_regional(metric: str = "temperature_c", user=Depends(require_any_role)):
    return await analytics_service.regional_comparison(metric)


@router.get("/seasonal-trend")
async def get_seasonal(metric: str = "temperature_c", user=Depends(require_any_role)):
    return await analytics_service.seasonal_trend(metric)


@router.get("/source-breakdown")
async def get_source_breakdown(user=Depends(require_any_role)):
    return await analytics_service.source_breakdown()


@router.get("/status-breakdown")
async def get_status_breakdown(user=Depends(require_any_role)):
    return await analytics_service.status_breakdown()


@router.get("/correlation")
async def get_correlation(user=Depends(require_any_role)):
    return await analytics_service.correlation_matrix()


@router.get("/summary")
async def get_summary(user=Depends(require_any_role)):
    return await climate_service.summary_stats()
