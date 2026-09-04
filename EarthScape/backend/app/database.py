"""
Unified async data-access layer.

Real deployments point MONGO_URI at a live MongoDB cluster and every
router/service talks to `Collection` objects backed by Motor.

DEMO_MODE (or any environment where Mongo is unreachable) transparently
falls back to a JSON-file-backed store with the exact same async
interface, so the rest of the codebase never branches on which backend
is active.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path
from typing import Any, Optional

from app.config import get_settings

settings = get_settings()


def new_id() -> str:
    return uuid.uuid4().hex


def _match(doc: dict, filt: dict) -> bool:
    for key, cond in filt.items():
        if key == "$or":
            if not any(_match(doc, sub) for sub in cond):
                return False
            continue
        val = doc.get(key)
        if isinstance(cond, dict) and any(k.startswith("$") for k in cond):
            for op, target in cond.items():
                if op == "$eq" and val != target:
                    return False
                if op == "$ne" and val == target:
                    return False
                if op == "$in" and val not in target:
                    return False
                if op == "$nin" and val in target:
                    return False
                if op == "$gte" and not (val is not None and val >= target):
                    return False
                if op == "$lte" and not (val is not None and val <= target):
                    return False
                if op == "$gt" and not (val is not None and val > target):
                    return False
                if op == "$lt" and not (val is not None and val < target):
                    return False
                if op == "$regex":
                    import re

                    flags = re.IGNORECASE if cond.get("$options") == "i" else 0
                    if not (val is not None and re.search(target, str(val), flags)):
                        return False
        else:
            if val != cond:
                return False
    return True


class JSONCollection:
    """A minimal Mongo-like async collection persisted as a JSON array on disk."""

    def __init__(self, name: str, root: Path):
        self.name = name
        self.path = root / f"{name}.json"
        self._lock = asyncio.Lock()
        if not self.path.exists():
            self.path.write_text("[]", encoding="utf-8")

    def _read(self) -> list[dict]:
        try:
            return json.loads(self.path.read_text(encoding="utf-8") or "[]")
        except json.JSONDecodeError:
            return []

    def _write(self, docs: list[dict]) -> None:
        self.path.write_text(json.dumps(docs, default=str, indent=None), encoding="utf-8")

    async def find(
        self,
        filter: Optional[dict] = None,
        sort: Optional[list[tuple[str, int]]] = None,
        skip: int = 0,
        limit: Optional[int] = None,
    ) -> list[dict]:
        async with self._lock:
            docs = self._read()
        filter = filter or {}
        results = [d for d in docs if _match(d, filter)]
        if sort:
            for field, direction in reversed(sort):
                results.sort(key=lambda d: (d.get(field) is None, d.get(field)), reverse=direction == -1)
        if skip:
            results = results[skip:]
        if limit is not None:
            results = results[:limit]
        return results

    async def find_one(self, filter: dict) -> Optional[dict]:
        results = await self.find(filter)
        return results[0] if results else None

    async def insert_one(self, doc: dict) -> str:
        doc = dict(doc)
        doc.setdefault("_id", new_id())
        async with self._lock:
            docs = self._read()
            docs.append(doc)
            self._write(docs)
        return doc["_id"]

    async def insert_many(self, items: list[dict]) -> list[str]:
        ids = []
        async with self._lock:
            docs = self._read()
            for doc in items:
                doc = dict(doc)
                doc.setdefault("_id", new_id())
                docs.append(doc)
                ids.append(doc["_id"])
            self._write(docs)
        return ids

    async def update_one(self, filter: dict, update: dict, upsert: bool = False) -> bool:
        async with self._lock:
            docs = self._read()
            for d in docs:
                if _match(d, filter):
                    if "$set" in update:
                        d.update(update["$set"])
                    if "$inc" in update:
                        for k, v in update["$inc"].items():
                            d[k] = (d.get(k) or 0) + v
                    if "$push" in update:
                        for k, v in update["$push"].items():
                            d.setdefault(k, []).append(v)
                    self._write(docs)
                    return True
            if upsert:
                new_doc = dict(filter)
                new_doc.update(update.get("$set", {}))
                new_doc.setdefault("_id", new_id())
                docs.append(new_doc)
                self._write(docs)
                return True
        return False

    async def update_many(self, filter: dict, update: dict) -> int:
        count = 0
        async with self._lock:
            docs = self._read()
            for d in docs:
                if _match(d, filter):
                    if "$set" in update:
                        d.update(update["$set"])
                    count += 1
            if count:
                self._write(docs)
        return count

    async def delete_one(self, filter: dict) -> bool:
        async with self._lock:
            docs = self._read()
            for i, d in enumerate(docs):
                if _match(d, filter):
                    docs.pop(i)
                    self._write(docs)
                    return True
        return False

    async def delete_many(self, filter: dict) -> int:
        async with self._lock:
            docs = self._read()
            remaining = [d for d in docs if not _match(d, filter)]
            removed = len(docs) - len(remaining)
            if removed:
                self._write(remaining)
        return removed

    async def count(self, filter: Optional[dict] = None) -> int:
        return len(await self.find(filter or {}))


class MongoCollectionWrapper:
    """Thin wrapper so Motor collections expose the same call signature as JSONCollection."""

    def __init__(self, collection):
        self._c = collection

    async def find(self, filter=None, sort=None, skip=0, limit=None):
        cursor = self._c.find(filter or {})
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit is not None:
            cursor = cursor.limit(limit)
        return [doc async for doc in cursor]

    async def find_one(self, filter):
        return await self._c.find_one(filter)

    async def insert_one(self, doc):
        doc = dict(doc)
        doc.setdefault("_id", new_id())
        await self._c.insert_one(doc)
        return doc["_id"]

    async def insert_many(self, items):
        items = [dict(i, _id=i.get("_id", new_id())) for i in items]
        await self._c.insert_many(items)
        return [i["_id"] for i in items]

    async def update_one(self, filter, update, upsert=False):
        res = await self._c.update_one(filter, update, upsert=upsert)
        return res.modified_count > 0 or (upsert and res.upserted_id is not None)

    async def update_many(self, filter, update):
        res = await self._c.update_many(filter, update)
        return res.modified_count

    async def delete_one(self, filter):
        res = await self._c.delete_one(filter)
        return res.deleted_count > 0

    async def delete_many(self, filter):
        res = await self._c.delete_many(filter)
        return res.deleted_count

    async def count(self, filter=None):
        return await self._c.count_documents(filter or {})


class Database:
    def __init__(self):
        self.mode = "uninitialized"
        self._mongo_client = None
        self._mongo_db = None
        self._json_root: Optional[Path] = None
        self._collections: dict[str, Any] = {}

    async def connect(self):
        connected = False
        if not settings.demo_mode or settings.mongo_uri:
            try:
                from motor.motor_asyncio import AsyncIOMotorClient

                client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=1500)
                await client.admin.command("ping")
                self._mongo_client = client
                self._mongo_db = client[settings.mongo_db_name]
                self.mode = "mongodb"
                connected = True
            except Exception:
                connected = False

        if not connected:
            if not settings.demo_mode:
                raise RuntimeError(
                    "MongoDB is unreachable and DEMO_MODE=false — refusing to start with no persistence layer."
                )
            self._json_root = settings.hdfs_root_path.parent / "local_store"
            self._json_root.mkdir(parents=True, exist_ok=True)
            self.mode = "local_json_demo"

        await self._ensure_indexes()

    async def _ensure_indexes(self):
        if self.mode != "mongodb":
            return
        await self.get_collection("users")._c.create_index("email", unique=True)
        await self.get_collection("climate_records")._c.create_index([("timestamp", -1)])
        await self.get_collection("climate_records")._c.create_index([("location", 1)])
        await self.get_collection("climate_records")._c.create_index([("sensor_id", 1)])
        await self.get_collection("hadoop_jobs")._c.create_index([("status", 1)])
        await self.get_collection("alerts")._c.create_index([("status", 1)])
        await self.get_collection("ml_models")._c.create_index([("model_id", 1)])

    def get_collection(self, name: str):
        if name in self._collections:
            return self._collections[name]
        if self.mode == "mongodb":
            coll = MongoCollectionWrapper(self._mongo_db[name])
        else:
            coll = JSONCollection(name, self._json_root)
        self._collections[name] = coll
        return coll


db = Database()


def get_db() -> Database:
    return db
