"""External-facing runtime API — authenticated via versioned API key."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.middleware.api_key_auth import get_runtime_auth_from_request
from app.models import Application, Workflow
from app.time_utils import utcnow_naive
from app.utils import validate_schema_fields

router = APIRouter()


class SubmitApplicationRequest(BaseModel):
    workflow_id: str
    applicant_data: dict[str, Any] = {}
    application_data: dict[str, Any] = {}


async def _get_db_and_auth(request: Request):
    """Helper that returns (db, auth) for runtime routes."""
    db = next(get_db())
    auth = await get_runtime_auth_from_request(request, db)
    return db, auth


@router.post("/v1/applications", status_code=201)
async def submit_application(body: SubmitApplicationRequest, request: Request):
    from app.services import get_event_engine, get_workflow_engine

    db, auth = await _get_db_and_auth(request)

    # Verify workflow is accessible via this API key's architecture version
    if auth.accessible_workflow_ids and body.workflow_id not in auth.accessible_workflow_ids:
        raise HTTPException(status_code=403, detail="Workflow not accessible with this API key")

    workflow = db.query(Workflow).filter(
        Workflow.id == body.workflow_id,
        Workflow.institution_id == auth.institution_id,
        Workflow.deployed == True,  # noqa: E712
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found or not deployed")

    # Validate applicant_data against embedded schema
    schema = workflow.definition.get("schema", {})
    if schema and schema.get("fields"):
        errors = validate_schema_fields(body.applicant_data, schema["fields"])
        if errors:
            raise HTTPException(status_code=422, detail={"validation_errors": errors})

    application = Application(
        institution_id=auth.institution_id,
        project_id=auth.project_id,
        workflow_id=workflow.id,
        workflow_version=workflow.version,
        current_state=workflow.definition.get("initial_state", ""),
        applicant_data=body.applicant_data,
        application_data=body.application_data,
        status="active",
        created_at=utcnow_naive(),
        updated_at=utcnow_naive(),
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Execute workflow until manual action needed or terminal
    engine = get_workflow_engine(db)
    try:
        application = await engine.execute_until_wait(application.id)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Workflow execution error: {e}") from e

    # Emit application.submitted event
    try:
        await get_event_engine(db).emit(
            "application.submitted",
            auth.institution_id,
            auth.project_id,
            {
                "application_id": application.id,
                "workflow_id": workflow.id,
                "workflow_version": workflow.version,
                "initial_state": workflow.definition.get("initial_state"),
                "current_state": application.current_state,
            },
        )
    except Exception:
        pass

    return {
        "application_id": application.id,
        "workflow_id": application.workflow_id,
        "workflow_version": application.workflow_version,
        "current_state": application.current_state,
        "status": application.status,
        "created_at": application.created_at.isoformat(),
    }


@router.get("/v1/applications/{application_id}")
async def get_application(application_id: str, request: Request):
    db, auth = await _get_db_and_auth(request)

    application = db.query(Application).filter(
        Application.id == application_id,
        Application.institution_id == auth.institution_id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify this key has access to the workflow
    if auth.accessible_workflow_ids and application.workflow_id not in auth.accessible_workflow_ids:
        raise HTTPException(status_code=403, detail="Application not accessible with this API key")

    return {
        "application_id": application.id,
        "workflow_id": application.workflow_id,
        "workflow_version": application.workflow_version,
        "current_state": application.current_state,
        "status": application.status,
        "applicant_data": application.applicant_data,
        "application_data": application.application_data,
        "created_at": application.created_at.isoformat(),
        "updated_at": application.updated_at.isoformat(),
    }


@router.get("/v1/applications")
async def list_applications(
    request: Request,
    workflow_id: str | None = None,
    state: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    db, auth = await _get_db_and_auth(request)

    query = db.query(Application).filter(
        Application.institution_id == auth.institution_id,
    )

    # Restrict to workflows accessible by this key
    if auth.accessible_workflow_ids:
        query = query.filter(Application.workflow_id.in_(auth.accessible_workflow_ids))

    if workflow_id:
        query = query.filter(Application.workflow_id == workflow_id)
    if state:
        query = query.filter(Application.current_state == state)

    total = query.count()
    applications = query.order_by(Application.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "applications": [
            {
                "application_id": a.id,
                "workflow_id": a.workflow_id,
                "workflow_version": a.workflow_version,
                "current_state": a.current_state,
                "status": a.status,
                "created_at": a.created_at.isoformat(),
            }
            for a in applications
        ],
    }
