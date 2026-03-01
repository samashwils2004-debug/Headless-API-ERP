from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.rbac_engine import check_permission
from app.models import Event
from app.schemas import EventResponse
from app.tenant import TenantContext, get_tenant_context

router = APIRouter()


@router.get("/events")
def list_events(
    limit: int = Query(default=100, ge=1, le=500),
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("event:read")),
    db: Session = Depends(get_db),
):
    events = (
        db.query(Event)
        .filter(
            Event.institution_id == tenant.institution_id,
            Event.project_id == tenant.project_id,
        )
        .order_by(Event.timestamp.desc())
        .limit(limit)
        .all()
    )
    return {"events": [EventResponse.model_validate(event) for event in events]}

