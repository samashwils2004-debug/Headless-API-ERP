from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.rbac_engine import check_permission
from app.models import Project
from app.schemas import ProjectCreate, ProjectResponse
from app.tenant import TenantContext, get_tenant_context

router = APIRouter()


@router.get("/projects")
def list_projects(
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("project:read")),
    db: Session = Depends(get_db),
):
    projects = db.query(Project).filter(Project.institution_id == tenant.institution_id).all()
    return {"projects": [ProjectResponse.model_validate(project) for project in projects]}


@router.post("/projects", response_model=ProjectResponse)
def create_project(
    payload: ProjectCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("project:write")),
    db: Session = Depends(get_db),
):
    if tenant.institution_id != user.institution_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access denied")

    project = Project(
        institution_id=tenant.institution_id,
        name=payload.name,
        slug=payload.slug,
        environment=payload.environment,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

