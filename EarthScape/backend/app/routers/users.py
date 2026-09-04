from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.deps import require_admin
from app.schemas.auth import RegisterRequest
from app.services import auth_service, users_service

router = APIRouter(prefix="/api/v1/users", tags=["User Management"])


class RoleUpdate(BaseModel):
    role: str


class ActiveUpdate(BaseModel):
    is_active: bool


@router.get("")
async def get_users(user=Depends(require_admin)):
    return await users_service.list_users()


@router.post("")
async def create_user(payload: RegisterRequest, user=Depends(require_admin)):
    created = await auth_service.register(payload)
    return auth_service.to_user_out(created)


@router.patch("/{user_id}/role")
async def change_role(user_id: str, payload: RoleUpdate, user=Depends(require_admin)):
    ok = await users_service.update_role(user_id, payload.role)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return {"detail": "role updated"}


@router.patch("/{user_id}/active")
async def change_active(user_id: str, payload: ActiveUpdate, user=Depends(require_admin)):
    ok = await users_service.set_active(user_id, payload.is_active)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return {"detail": "status updated"}


@router.delete("/{user_id}")
async def remove_user(user_id: str, user=Depends(require_admin)):
    ok = await users_service.delete_user(user_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return {"detail": "deleted"}
