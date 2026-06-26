from app.models import ArchWorkflow, Workflow

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import get_event_engine
from app.core.rbac_engine import check_permission
from app.models import Workflow
from app.schemas import WorkflowCreate, WorkflowListResponse, WorkflowResponse
from app.tenant import TenantContext, get_tenant_context

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/workflows", response_model=WorkflowListResponse)
async def list_workflows(
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("workflow:read")),
    db: Session = Depends(get_db),
):
    workflows = (
        db.query(Workflow)
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
        )
        .order_by(Workflow.name.asc(), Workflow.version.desc())
        .all()
    )
    return {"workflows": [WorkflowResponse.model_validate(workflow) for workflow in workflows]}


@router.post("/workflows", response_model=WorkflowResponse)
async def create_workflow(
    payload: WorkflowCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("workflow:write")),
    db: Session = Depends(get_db),
):
    next_version = (
        db.query(func.coalesce(func.max(Workflow.version), 0))
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
            Workflow.name == payload.name,
        )
        .scalar()
        + 1
    )

    workflow = Workflow(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        name=payload.name,
        version=next_version,
        definition=payload.definition,
        is_ai_generated=payload.is_ai_generated,
        deployed=False,
        created_by=user.id,
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow


@router.post("/workflows/{workflow_id}/deploy", response_model=WorkflowResponse)
async def deploy_workflow(
    workflow_id: str,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("workflow:deploy")),
    db: Session = Depends(get_db),
):
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow.deployed:
        return workflow

    # Prevent duplicate deployed names
    already_deployed = (
        db.query(Workflow)
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
            Workflow.name == workflow.name,
            Workflow.deployed == True,
            Workflow.id != workflow_id,
        )
        .first()
    )
    if already_deployed:
        raise HTTPException(
            status_code=409,
            detail=f"A deployed workflow named '{workflow.name}' already exists (v{already_deployed.version}). Use a different name.",
        )

    workflow.deployed = True
    workflow.deployed_at = datetime.utcnow()
    db.commit()
    db.refresh(workflow)

    try:
        event_engine = get_event_engine(db)
        await event_engine.emit(
            "workflow.deployed",
            institution_id=tenant.institution_id,
            project_id=tenant.project_id,
            data={"workflow_id": workflow.id, "workflow_name": workflow.name, "version": workflow.version},
        )
    except Exception:
        logger.warning("Event emission failed during deploy for workflow %s", workflow.id, exc_info=True)
    return workflow


@router.post("/workflows/{workflow_id}/undeploy", response_model=WorkflowResponse)
async def undeploy_workflow(
    workflow_id: str,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("workflow:deploy")),
    db: Session = Depends(get_db),
):
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if not workflow.deployed:
        return workflow

    workflow.deployed = False
    workflow.deployed_at = None
    db.commit()
    db.refresh(workflow)

    try:
        event_engine = get_event_engine(db)
        await event_engine.emit(
            "workflow.undeployed",
            institution_id=tenant.institution_id,
            project_id=tenant.project_id,
            data={"workflow_id": workflow.id, "workflow_name": workflow.name, "version": workflow.version},
        )
    except Exception:
        logger.warning("Event emission failed during undeploy for workflow %s", workflow.id, exc_info=True)
    return workflow


@router.put("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    payload: WorkflowCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("workflow:write")),
    db: Session = Depends(get_db),
):
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow.deployed:
        raise HTTPException(status_code=409, detail="Deployed workflows are immutable")

    workflow.name = payload.name
    workflow.definition = payload.definition
    workflow.is_ai_generated = payload.is_ai_generated
    db.commit()
    db.refresh(workflow)
    return workflow


@router.delete("/workflows/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: str,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("workflow:write")),
    db: Session = Depends(get_db),
):
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow.deployed:
        raise HTTPException(status_code=409, detail="Deployed workflows cannot be deleted")

    db.query(ArchWorkflow).filter(ArchWorkflow.workflow_id == workflow.id).delete()
    db.delete(workflow)
    db.commit()
