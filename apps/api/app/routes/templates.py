"""Workflow template routes for Orquestra."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.rbac_engine import check_permission
from app.database import get_db
from app.models import WorkflowTemplate, Workflow
from app.schemas import TemplateListResponse, TemplateResponse
from app.security import get_current_user
from app.tenant import get_tenant_context

router = APIRouter()


@router.get("/templates", response_model=TemplateListResponse)
def list_templates(
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(WorkflowTemplate)
    if category:
        query = query.filter(WorkflowTemplate.category == category)
    templates = query.order_by(WorkflowTemplate.name).all()
    return {"templates": [TemplateResponse.model_validate(t) for t in templates]}


@router.post("/templates/{template_id}/deploy", status_code=201)
def deploy_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("workflow:write")),
):
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get next version number
    existing = (
        db.query(Workflow)
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
            Workflow.name == template.name,
        )
        .order_by(Workflow.version.desc())
        .first()
    )
    version = (existing.version + 1) if existing else 1

    workflow = Workflow(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        name=template.name,
        version=version,
        definition=template.definition,
        is_ai_generated=False,
        deployed=False,
        created_by=current_user.id,
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    return {
        "id": workflow.id,
        "name": workflow.name,
        "version": workflow.version,
        "message": f"Template '{template.name}' deployed as workflow draft. Review and deploy when ready.",
    }
