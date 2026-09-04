from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.deps import require_any_role
from app.hadoop import mapreduce
from app.hdfs import service as hdfs_service

router = APIRouter(prefix="/api/v1/hadoop", tags=["Hadoop / HDFS Monitoring"])


class StartJobRequest(BaseModel):
    job_type: str


@router.get("/hdfs/health")
async def hdfs_health(user=Depends(require_any_role)):
    return hdfs_service.health()


@router.get("/hdfs/storage")
async def hdfs_storage(user=Depends(require_any_role)):
    return hdfs_service.storage_stats()


@router.get("/hdfs/files")
async def hdfs_files(zone: str = "raw", user=Depends(require_any_role)):
    return hdfs_service.list_zone(zone)


@router.get("/jobs")
async def get_jobs(limit: int = 100, user=Depends(require_any_role)):
    return await mapreduce.list_jobs(limit)


@router.get("/jobs/definitions")
async def get_job_definitions(user=Depends(require_any_role)):
    return [{"job_type": k, "name": v["name"]} for k, v in mapreduce.JOB_DEFINITIONS.items()]


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, user=Depends(require_any_role)):
    job = await mapreduce.get_job(job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job


@router.post("/jobs/start")
async def start_job(payload: StartJobRequest, user=Depends(require_any_role)):
    try:
        return await mapreduce.start_job(payload.job_type, user["_id"])
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
