from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.deps import require_any_role
from app.services import live_weather_service

router = APIRouter(prefix="/api/v1/live-weather", tags=["Live Weather (Pakistan)"])


@router.get("/pakistan")
async def get_pakistan_weather(refresh: bool = False, user=Depends(require_any_role)):
    try:
        return await live_weather_service.get_pakistan_weather(force_refresh=refresh)
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not reach live weather provider: {exc}")
