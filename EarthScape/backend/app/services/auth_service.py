from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.auth.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest


def _initials(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "??"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def to_user_out(user: dict) -> dict:
    return {
        "id": user["_id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
        "organization": user.get("organization"),
        "is_active": user.get("is_active", True),
        "created_at": user["created_at"],
        "avatar_initials": _initials(user["full_name"]),
    }


async def register(payload: RegisterRequest) -> dict:
    db = get_db()
    users = db.get_collection("users")
    existing = await users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    doc = {
        "full_name": payload.full_name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "organization": payload.organization,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    user_id = await users.insert_one(doc)
    doc["_id"] = user_id
    return doc


async def authenticate(payload: LoginRequest) -> dict:
    db = get_db()
    users = db.get_collection("users")
    user = await users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account has been deactivated")
    return user


def issue_tokens(user: dict) -> dict:
    return {
        "access_token": create_access_token(user["_id"], user["role"]),
        "refresh_token": create_refresh_token(user["_id"], user["role"]),
        "token_type": "bearer",
    }


async def refresh_access_token(refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    db = get_db()
    user = await db.get_collection("users").find_one({"_id": payload["sub"]})
    if not user or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer active")
    return issue_tokens(user)
