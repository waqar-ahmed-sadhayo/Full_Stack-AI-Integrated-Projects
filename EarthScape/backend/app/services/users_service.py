from app.database import get_db
from app.services.auth_service import to_user_out


async def list_users() -> list[dict]:
    db = get_db()
    users = await db.get_collection("users").find({}, sort=[("created_at", -1)])
    return [to_user_out(u) for u in users]


async def update_role(user_id: str, role: str) -> bool:
    db = get_db()
    return await db.get_collection("users").update_one({"_id": user_id}, {"$set": {"role": role}})


async def set_active(user_id: str, is_active: bool) -> bool:
    db = get_db()
    return await db.get_collection("users").update_one({"_id": user_id}, {"$set": {"is_active": is_active}})


async def delete_user(user_id: str) -> bool:
    db = get_db()
    return await db.get_collection("users").delete_one({"_id": user_id})
