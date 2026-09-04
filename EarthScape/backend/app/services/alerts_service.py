from __future__ import annotations

from datetime import datetime, timezone

from app.database import get_db, new_id


async def create_alert(
    title: str,
    severity: str,
    message: str,
    related_metric: str | None,
    threshold_value: float | None,
    actual_value: float | None,
    broadcast: bool,
    created_by: str,
    source: str = "manual",
    location: str | None = None,
) -> dict:
    db = get_db()
    doc = {
        "_id": new_id(),
        "title": title,
        "severity": severity,
        "message": message,
        "related_metric": related_metric,
        "threshold_value": threshold_value,
        "actual_value": actual_value,
        "location": location,
        "status": "Active",
        "broadcast": broadcast,
        "source": source,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
    }
    await db.get_collection("alerts").insert_one(doc)
    return doc


async def list_alerts(status: str | None = None, severity: str | None = None, limit: int = 200) -> list[dict]:
    db = get_db()
    filt = {}
    if status:
        filt["status"] = status
    if severity:
        filt["severity"] = severity
    return await db.get_collection("alerts").find(filt, sort=[("created_at", -1)], limit=limit)


async def resolve_alert(alert_id: str) -> bool:
    db = get_db()
    return await db.get_collection("alerts").update_one(
        {"_id": alert_id}, {"$set": {"status": "Resolved", "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )


async def create_threshold(metric: str, operator: str, value: float, severity: str, created_by: str) -> dict:
    db = get_db()
    doc = {
        "_id": new_id(),
        "metric": metric,
        "operator": operator,
        "value": value,
        "severity": severity,
        "enabled": True,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.get_collection("alert_thresholds").insert_one(doc)
    return doc


async def list_thresholds() -> list[dict]:
    db = get_db()
    return await db.get_collection("alert_thresholds").find({}, sort=[("created_at", -1)])


async def delete_threshold(threshold_id: str) -> bool:
    db = get_db()
    return await db.get_collection("alert_thresholds").delete_one({"_id": threshold_id})


_last_alert_at: dict[str, datetime] = {}


async def check_thresholds(record: dict) -> list[dict]:
    """Called from the real-time simulator on each event: threshold-check
    the incoming reading and auto-create an alert on breach (deduped to
    avoid spamming one alert per second for a sustained breach)."""
    db = get_db()
    thresholds = await db.get_collection("alert_thresholds").find({"enabled": True})
    created = []
    for t in thresholds:
        val = record.get(t["metric"])
        if val is None:
            continue
        breached = (val > t["value"]) if t["operator"] == "gt" else (val < t["value"])
        if not breached:
            continue
        dedupe_key = f"{t['_id']}:{record.get('location')}"
        now = datetime.now(timezone.utc)
        last = _last_alert_at.get(dedupe_key)
        if last and (now - last).total_seconds() < 300:
            continue
        _last_alert_at[dedupe_key] = now
        alert = await create_alert(
            title=f"Threshold breach: {t['metric']} at {record.get('location')}",
            severity=t["severity"],
            message=f"{t['metric']} reached {val} ({'above' if t['operator']=='gt' else 'below'} threshold {t['value']}) at {record.get('location')}",
            related_metric=t["metric"],
            threshold_value=t["value"],
            actual_value=val,
            broadcast=True,
            created_by="system",
            source="threshold",
            location=record.get("location"),
        )
        created.append(alert)
    return created
