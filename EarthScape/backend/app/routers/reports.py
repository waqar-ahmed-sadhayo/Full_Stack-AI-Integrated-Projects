from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.auth.deps import require_any_role
from app.services import reports_service

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])

MIME = {"csv": "text/csv", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "pdf": "application/pdf"}


class GenerateRequest(BaseModel):
    report_type: str
    format: str  # csv | excel | pdf


@router.get("")
async def get_reports(limit: int = 100, user=Depends(require_any_role)):
    return await reports_service.list_reports(limit)


@router.get("/types")
async def get_types(user=Depends(require_any_role)):
    return reports_service.REPORT_TYPES


@router.post("/generate")
async def generate(payload: GenerateRequest, user=Depends(require_any_role)):
    try:
        return await reports_service.generate_report(payload.report_type, payload.format, user["_id"])
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))


@router.get("/{report_id}/download")
async def download(report_id: str, user=Depends(require_any_role)):
    report = await reports_service.get_report(report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    ext = report["filename"].rsplit(".", 1)[-1]
    return FileResponse(report["local_path"], media_type=MIME.get(ext, "application/octet-stream"), filename=report["filename"])
