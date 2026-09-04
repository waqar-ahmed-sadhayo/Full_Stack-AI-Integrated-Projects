from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register")
async def register(payload: RegisterRequest):
    user = await auth_service.register(payload)
    tokens = auth_service.issue_tokens(user)
    return {"user": auth_service.to_user_out(user), **tokens}


@router.post("/login")
async def login(payload: LoginRequest):
    user = await auth_service.authenticate(payload)
    tokens = auth_service.issue_tokens(user)
    return {"user": auth_service.to_user_out(user), **tokens}


@router.post("/refresh")
async def refresh(payload: RefreshRequest):
    return await auth_service.refresh_access_token(payload.refresh_token)


@router.post("/logout")
async def logout(user=Depends(get_current_user)):
    return {"detail": "Logged out. Discard your tokens client-side."}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return auth_service.to_user_out(user)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    # DEMO_MODE: no email transport configured. In production this would
    # dispatch a reset email via an SMTP/API provider from .env config.
    return {"detail": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    return {"detail": "Password reset is not available in DEMO_MODE without an email provider configured."}
