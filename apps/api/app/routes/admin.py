"""
Admin dashboard and audit logs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, AuditLog, WorkflowTransition, User, WorkflowInstance
from app.schemas import DashboardResponse, AuditLogEntry, TransitionEntry
from app.security import get_current_user

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    limit_recent: int = Query(default=5, ge=1, le=20),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role not in ("admin", "admissions_officer"):
        raise HTTPException(403, "Insufficient permissions")
    institution_id = user.institution_id
    apps = db.query(Application).filter_by(institution_id=institution_id).all()

    by_status = {}
    by_decision = {}
    for a in apps:
        by_status[a.current_status] = by_status.get(a.current_status, 0) + 1
        if a.decision:
            by_decision[a.decision] = by_decision.get(a.decision, 0) + 1

    recent_apps = (
        db.query(Application)
        .filter_by(institution_id=institution_id)
        .order_by(Application.created_at.desc())
        .limit(limit_recent)
        .all()
    )

    return DashboardResponse(
        total_applications=len(apps),
        by_status=by_status,
        by_decision=by_decision,
        recent=[
            {
                "id": a.id,
                "current_status": a.current_status,
                "applicant_name": a.applicant.name,
                "applicant_email": a.applicant.email,
                "program_name": a.program.name,
                "submitted_at": a.submitted_at,
                "decision": a.decision,
            }
            for a in recent_apps
        ],
    )


@router.get("/audit-log")
def get_audit_log(
    limit: int = Query(default=100, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role not in ("admin", "admissions_officer"):
        raise HTTPException(403, "Insufficient permissions")

    institution_id = user.institution_id
    institution_application_ids = [
        row[0]
        for row in db.query(Application.id)
        .filter_by(institution_id=institution_id)
        .all()
    ]
    institution_instance_ids = [
        row[0]
        for row in db.query(WorkflowInstance.id)
        .filter(WorkflowInstance.application_id.in_(institution_application_ids))
        .all()
    ]

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.resource_type == "application",
            AuditLog.resource_id.in_(institution_application_ids),
        )
        .order_by(AuditLog.occurred_at.desc())
        .limit(limit)
        .all()
    )
    transitions = (
        db.query(WorkflowTransition)
        .filter(WorkflowTransition.instance_id.in_(institution_instance_ids))
        .order_by(WorkflowTransition.occurred_at.desc())
        .limit(limit)
        .all()
    )
    audit_entries = []
    for l in logs:
        u = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        audit_entries.append(
            AuditLogEntry(
                id=l.id,
                action=l.action,
                resource_type=l.resource_type,
                resource_id=l.resource_id,
                user_name=u.name if u else "System",
                occurred_at=l.occurred_at,
            )
        )
    return {
        "audit_logs": audit_entries,
        "workflow_transitions": [
            TransitionEntry(
                id=t.id,
                from_state=t.from_state,
                to_state=t.to_state,
                triggered_by=t.triggered_by or "",
                occurred_at=t.occurred_at,
            )
            for t in transitions
        ],
    }

