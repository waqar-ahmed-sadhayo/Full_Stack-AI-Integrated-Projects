from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.auth.deps import require_any_role
from app.config import get_settings
from app.services import ingestion_service

router = APIRouter(prefix="/api/v1/ingestion", tags=["Data Ingestion"])
settings = get_settings()


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    source_type: str = Form("Historical Database"),
    user=Depends(require_any_role),
):
    raw = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"File exceeds {settings.max_upload_size_mb}MB limit")
    return await ingestion_service.ingest_file(file.filename, raw, source_type, user["_id"])


@router.get("/datasets")
async def get_datasets(limit: int = 50, user=Depends(require_any_role)):
    return await ingestion_service.list_datasets(limit)
