from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.deps import require_admin, require_any_role
from app.services import feedback_service

router = APIRouter(prefix="/api/v1/feedback", tags=["Feedback & Support"])


class TicketRequest(BaseModel):
    category: str
    subject: str
    message: str
    priority: str = "Medium"


class StatusUpdate(BaseModel):
    status: str


@router.get("")
async def get_tickets(user=Depends(require_any_role)):
    return await feedback_service.list_tickets(user)


@router.post("")
async def create_ticket(payload: TicketRequest, user=Depends(require_any_role)):
    return await feedback_service.submit_ticket(payload.category, payload.subject, payload.message, payload.priority, user)


@router.patch("/{ticket_id}/status")
async def set_status(ticket_id: str, payload: StatusUpdate, user=Depends(require_admin)):
    ok = await feedback_service.update_status(ticket_id, payload.status)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return {"detail": "updated"}
