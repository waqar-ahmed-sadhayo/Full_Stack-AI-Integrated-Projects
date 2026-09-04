from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.deps import require_admin, require_any_role
from app.services import alerts_service

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts & Notifications"])


class CreateAlertRequest(BaseModel):
    title: str
    severity: str
    message: str
    related_metric: Optional[str] = None
    threshold: Optional[float] = None
    broadcast: bool = True


class CreateThresholdRequest(BaseModel):
    metric: str
    operator: str  # "gt" | "lt"
    value: float
    severity: str


@router.get("")
async def get_alerts(status_filter: Optional[str] = None, severity: Optional[str] = None, limit: int = 200, user=Depends(require_any_role)):
    return await alerts_service.list_alerts(status_filter, severity, limit)


@router.post("")
async def create_alert(payload: CreateAlertRequest, user=Depends(require_admin)):
    return await alerts_service.create_alert(
        title=payload.title, severity=payload.severity, message=payload.message,
        related_metric=payload.related_metric, threshold_value=payload.threshold,
        actual_value=None, broadcast=payload.broadcast, created_by=user["_id"], source="manual",
    )


@router.patch("/{alert_id}/resolve")
async def resolve(alert_id: str, user=Depends(require_any_role)):
    ok = await alerts_service.resolve_alert(alert_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found")
    return {"detail": "resolved"}


@router.get("/thresholds")
async def get_thresholds(user=Depends(require_admin)):
    return await alerts_service.list_thresholds()


@router.post("/thresholds")
async def create_threshold(payload: CreateThresholdRequest, user=Depends(require_admin)):
    return await alerts_service.create_threshold(payload.metric, payload.operator, payload.value, payload.severity, user["_id"])


@router.delete("/thresholds/{threshold_id}")
async def delete_threshold(threshold_id: str, user=Depends(require_admin)):
    ok = await alerts_service.delete_threshold(threshold_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Threshold not found")
    return {"detail": "deleted"}
