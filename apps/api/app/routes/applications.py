from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.event_engine import EventEngine
from app.core.rbac_engine import check_permission
from app.core.schema_engine import SchemaEngine
from app.core.workflow_engine import WorkflowEngine, WorkflowExecutionError
from app.models import Application, Workflow
from app.schemas import ApplicationCreate, ApplicationResponse, ApplicationTransition
from app.tenant import TenantContext, get_tenant_context

router = APIRouter()


@router.post("/applications", response_model=ApplicationResponse)
async def create_application(
    payload: ApplicationCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("application:write")),
    db: Session = Depends(get_db),
):
    schema_engine = SchemaEngine()
    schema_errors = schema_engine.validate_application(payload.model_dump())
    if schema_errors:
        raise HTTPException(status_code=400, detail={"schema_errors": schema_errors})

    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
            Workflow.name == payload.workflow_name,
            Workflow.deployed.is_(True),
        )
        .order_by(Workflow.version.desc())
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="No deployed workflow found")

    application = Application(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        workflow_id=workflow.id,
        workflow_version=workflow.version,
        current_state=workflow.definition.get("initial_state", "submitted"),
        applicant_data=payload.applicant_data,
        application_data=payload.application_data,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    event_engine = EventEngine(db)
    await event_engine.emit(
        "application.created",
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        data={
            "application_id": application.id,
            "workflow_id": workflow.id,
            "workflow_version": workflow.version,
        },
    )

    engine = WorkflowEngine(db)
    try:
        application = await engine.execute_until_wait(application.id)
    except WorkflowExecutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return application


@router.get("/applications")
def list_applications(
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("application:read")),
    db: Session = Depends(get_db),
):
    applications = (
        db.query(Application)
        .filter(
            Application.institution_id == tenant.institution_id,
            Application.project_id == tenant.project_id,
        )
        .order_by(Application.created_at.desc())
        .all()
    )
    return {"applications": [ApplicationResponse.model_validate(application) for application in applications]}


@router.post("/applications/{application_id}/transition", response_model=ApplicationResponse)
async def transition_application(
    application_id: str,
    payload: ApplicationTransition,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("application:write")),
    db: Session = Depends(get_db),
):
    application = (
        db.query(Application)
        .filter(
            Application.id == application_id,
            Application.institution_id == tenant.institution_id,
            Application.project_id == tenant.project_id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == application.workflow_id,
            Workflow.version == application.workflow_version,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    state_config = workflow.definition.get("states", {}).get(application.current_state, {})
    allowed = {transition.get("to") for transition in state_config.get("transitions", [])}
    if payload.to_state not in allowed:
        raise HTTPException(status_code=400, detail="Transition not allowed from current state")

    from_state = application.current_state
    application.current_state = payload.to_state
    db.commit()
    db.refresh(application)

    event_engine = EventEngine(db)
    await event_engine.emit(
        "application.transitioned",
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        data={
            "application_id": application.id,
            "workflow_id": application.workflow_id,
            "workflow_version": application.workflow_version,
            "from_state": from_state,
            "to_state": payload.to_state,
            "actor_user_id": user.id,
        },
    )

    if not workflow.definition.get("states", {}).get(payload.to_state, {}).get("transitions"):
        application.status = "completed"
        db.commit()
        db.refresh(application)

    return application

