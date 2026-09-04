from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import io

from app.auth.deps import require_any_role
from app.services import climate_service

router = APIRouter(prefix="/api/v1/climate-data", tags=["Climate Data"])


@router.get("")
async def get_records(
    page: int = 1,
    page_size: int = 25,
    sort_field: str = "timestamp",
    sort_dir: int = -1,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    data_source: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user=Depends(require_any_role),
):
    return await climate_service.list_records(
        page=page, page_size=page_size, sort_field=sort_field, sort_dir=sort_dir,
        date_from=date_from, date_to=date_to, region=region, country=country,
        city=city, data_source=data_source, status=status, search=search,
    )


@router.get("/summary")
async def get_summary(user=Depends(require_any_role)):
    return await climate_service.summary_stats()


@router.get("/export")
async def export_csv(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    data_source: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user=Depends(require_any_role),
):
    csv_text = await climate_service.export_records_csv(
        date_from=date_from, date_to=date_to, region=region, country=country,
        city=city, data_source=data_source, status=status, search=search,
    )
    return StreamingResponse(
        io.BytesIO(csv_text.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=climate_data_export.csv"},
    )
