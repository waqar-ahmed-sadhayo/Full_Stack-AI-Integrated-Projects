from datetime import datetime, timezone

from app.database import get_db, new_id


async def submit_ticket(category: str, subject: str, message: str, priority: str, user: dict) -> dict:
    db = get_db()
    doc = {
        "_id": new_id(),
        "category": category,
        "subject": subject,
        "message": message,
        "priority": priority,
        "status": "Open",
        "submitted_by": user["_id"],
        "submitted_by_name": user["full_name"],
        "submitted_by_role": user["role"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
    }
    await db.get_collection("feedback").insert_one(doc)
    return doc


async def list_tickets(user: dict) -> list[dict]:
    db = get_db()
    coll = db.get_collection("feedback")
    if user["role"] == "Administrator":
        return await coll.find({}, sort=[("created_at", -1)])
    return await coll.find({"submitted_by": user["_id"]}, sort=[("created_at", -1)])


async def update_status(ticket_id: str, status: str) -> bool:
    db = get_db()
    update = {"status": status}
    if status == "Resolved":
        update["resolved_at"] = datetime.now(timezone.utc).isoformat()
    return await db.get_collection("feedback").update_one({"_id": ticket_id}, {"$set": update})
