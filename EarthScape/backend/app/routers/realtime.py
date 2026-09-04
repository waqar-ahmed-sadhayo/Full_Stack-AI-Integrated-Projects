from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.auth.deps import require_any_role
from app.auth.security import decode_token
from app.streaming.manager import ACTIVE_SENSORS, _sensor_statuses, manager

router = APIRouter(tags=["Real-Time Monitoring"])


@router.get("/api/v1/realtime/sensors")
async def get_sensors(user=Depends(require_any_role)):
    return _sensor_statuses()


@router.websocket("/ws/realtime")
async def realtime_ws(websocket: WebSocket, token: str = ""):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4401)
        return
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
