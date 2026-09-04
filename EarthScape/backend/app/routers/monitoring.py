from fastapi import APIRouter, Depends

from app.auth.deps import require_admin
from app.services import monitoring_service

router = APIRouter(prefix="/api/v1/monitoring", tags=["System Monitoring"])


@router.get("/system")
async def get_system_status(user=Depends(require_admin)):
    return await monitoring_service.system_status()
