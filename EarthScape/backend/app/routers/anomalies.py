from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.deps import require_any_role
from app.services import anomaly_service

router = APIRouter(prefix="/api/v1/anomalies", tags=["Anomaly Detection"])


class DetectRequest(BaseModel):
    metric: str = "temperature_c"


class StatusUpdate(BaseModel):
    status: str


@router.post("/detect")
async def detect(payload: DetectRequest, user=Depends(require_any_role)):
    return await anomaly_service.run_full_detection(payload.metric)


@router.get("")
async def get_anomalies(
    severity: Optional[str] = None,
    method: Optional[str] = None,
    status_filter: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = 200,
    user=Depends(require_any_role),
):
    return await anomaly_service.list_anomalies(severity, method, status_filter, region, limit)


@router.get("/distribution")
async def get_distribution(user=Depends(require_any_role)):
    return await anomaly_service.distribution()


@router.patch("/{anomaly_id}/status")
async def set_status(anomaly_id: str, payload: StatusUpdate, user=Depends(require_any_role)):
    ok = await anomaly_service.update_anomaly_status(anomaly_id, payload.status)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anomaly not found")
    return {"detail": "updated"}
