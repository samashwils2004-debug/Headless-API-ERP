from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.rbac_engine import check_permission
from app.models import Institution, Project, Workflow
from app.schemas import ProjectCreate, ProjectListResponse, ProjectResponse, ProjectUpdate
from app.tenant import TenantContext, get_tenant_context

router = APIRouter()


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("project:read")),
    db: Session = Depends(get_db),
):
    projects = db.query(Project).filter(Project.institution_id == tenant.institution_id).all()
    return {"projects": [ProjectResponse.model_validate(project) for project in projects]}


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    payload: ProjectCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    current_user=Depends(check_permission("project:write")),
    db: Session = Depends(get_db),
):
    if tenant.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access denied")

    if payload.institution_name:
        institution = db.get(Institution, tenant.institution_id)
        if institution:
            institution.name = payload.institution_name.strip()

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


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    tenant: TenantContext = Depends(get_tenant_context),
    _=Depends(check_permission("project:write")),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.institution_id == tenant.institution_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.institution_name is not None:
        institution = db.get(Institution, tenant.institution_id)
        if institution:
            institution.name = payload.institution_name.strip()

    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    tenant: TenantContext = Depends(get_tenant_context),
    _=Depends(check_permission("project:write")),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.institution_id == tenant.institution_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    has_workflows = db.query(Workflow).filter(
        Workflow.project_id == project_id,
        Workflow.deployed == True,  # noqa: E712
    ).first()
    if has_workflows:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a project with deployed workflows. Undeploy or delete all workflows first.",
        )

    # Clean up in dependency order to avoid FK violations
    from app.models import (
        ArchWorkflow, ArchitectureVersion, InstitutionArchitecture,
        BlueprintProposal, Application, Event, TemplateCustomization,
        APIKey,
    )

    # 1. Get architecture versions to clean up arch_workflows
    arch = db.query(InstitutionArchitecture).filter(
        InstitutionArchitecture.project_id == project_id
    ).first()
    if arch:
        versions = db.query(ArchitectureVersion).filter(
            ArchitectureVersion.architecture_id == arch.id
        ).all()
        for v in versions:
            db.query(ArchWorkflow).filter(
                ArchWorkflow.architecture_version_id == v.id
            ).delete()
        db.query(ArchitectureVersion).filter(
            ArchitectureVersion.architecture_id == arch.id
        ).delete()
        db.delete(arch)

    # 2. Clean up remaining references
    db.query(TemplateCustomization).filter(
        TemplateCustomization.project_id == project_id
    ).delete()
    db.query(BlueprintProposal).filter(
        BlueprintProposal.project_id == project_id
    ).delete()
    db.query(Application).filter(
        Application.project_id == project_id
    ).delete()
    db.query(Event).filter(
        Event.project_id == project_id
    ).delete()
    db.query(APIKey).filter(
        APIKey.project_id == project_id
    ).delete()

    # 3. Delete the project
    db.delete(project)
    db.commit()

