"""
HDFS abstraction. In a production deployment (DEMO_MODE=false + a real
Hadoop cluster reachable at HDFS_NAMENODE_URL) this would talk to the
WebHDFS REST API. In DEMO_MODE it mirrors the exact same directory
layout (/earthscape/{raw,processed,analytics,models,reports}, partitioned
by year/month/region/source) on the local filesystem, so every service
that calls this module works identically either way.

Every response includes `simulated: true/false` so the UI can label
clearly which infrastructure produced it.
"""
from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import get_settings

settings = get_settings()

ZONES = ["raw", "processed", "analytics", "models", "reports"]


def _root() -> Path:
    root = settings.hdfs_root_path / "earthscape"
    for zone in ZONES:
        (root / zone).mkdir(parents=True, exist_ok=True)
    return root


def partition_path(zone: str, year: int, month: int, region: str = "ALL", source: str = "ALL") -> Path:
    safe_region = region.replace(" ", "_")
    safe_source = source.replace(" ", "_")
    p = _root() / zone / f"year={year}" / f"month={month:02d}" / f"region={safe_region}" / f"source={safe_source}"
    p.mkdir(parents=True, exist_ok=True)
    return p


def write_file(zone: str, relative_dir_parts: list[str], filename: str, content: bytes) -> dict:
    target_dir = _root() / zone
    for part in relative_dir_parts:
        target_dir = target_dir / part
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    target_path.write_bytes(content)
    return file_metadata(target_path)


def read_file(path_str: str) -> bytes:
    p = Path(path_str)
    if not p.exists():
        raise FileNotFoundError(path_str)
    return p.read_bytes()


def file_metadata(path: Path) -> dict:
    stat = path.stat()
    return {
        "path": str(path),
        "hdfs_path": "/" + str(path.relative_to(settings.hdfs_root_path)).replace("\\", "/"),
        "name": path.name,
        "size_bytes": stat.st_size,
        "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "replication_factor": 3,
        "simulated": True,
    }


def list_zone(zone: str) -> list[dict]:
    zone_path = _root() / zone
    files = []
    for f in zone_path.rglob("*"):
        if f.is_file():
            files.append(file_metadata(f))
    return files


def delete_path(path_str: str) -> bool:
    p = Path(path_str)
    if not p.exists():
        return False
    if p.is_dir():
        shutil.rmtree(p)
    else:
        p.unlink()
    return True


def storage_stats() -> dict:
    root = _root()
    total_files = 0
    total_bytes = 0
    per_zone = {}
    for zone in ZONES:
        zone_path = root / zone
        zone_files = list(zone_path.rglob("*"))
        zone_file_count = sum(1 for f in zone_files if f.is_file())
        zone_bytes = sum(f.stat().st_size for f in zone_files if f.is_file())
        per_zone[zone] = {"files": zone_file_count, "size_bytes": zone_bytes}
        total_files += zone_file_count
        total_bytes += zone_bytes

    disk_usage = shutil.disk_usage(root)
    return {
        "simulated": True,
        "namenode_url": settings.hdfs_namenode_url,
        "cluster_health": "SIMULATED_HEALTHY",
        "total_capacity_bytes": disk_usage.total,
        "used_bytes": disk_usage.used,
        "available_bytes": disk_usage.free,
        "used_pct": round(disk_usage.used / disk_usage.total * 100, 2) if disk_usage.total else 0,
        "block_count": total_files * 1,
        "file_count": total_files,
        "tracked_bytes": total_bytes,
        "replication_factor": 3,
        "zones": per_zone,
        "root_path": str(root),
    }


def health() -> dict:
    stats = storage_stats()
    return {
        "simulated": True,
        "status": "healthy",
        "namenode_url": settings.hdfs_namenode_url,
        "live_datanodes_simulated": 3,
        "dead_datanodes_simulated": 0,
        "used_pct": stats["used_pct"],
    }
