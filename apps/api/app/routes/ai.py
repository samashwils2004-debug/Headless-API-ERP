from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.blueprint_generator import BlueprintGenerator
from app.database import get_db
from app.core.event_engine import EventEngine
from app.core.rbac_engine import check_permission
from app.models import BlueprintProposal, RolePermission, Workflow
from app.schemas import BlueprintCompileRequest, BlueprintProposalResponse, WorkflowCreate
from app.tenant import TenantContext, get_tenant_context
from app.time_utils import utcnow_naive

router = APIRouter()


@router.post("/ai/blueprints/compile", response_model=BlueprintProposalResponse)
def compile_blueprint(
    payload: BlueprintCompileRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("blueprint:compile")),
    db: Session = Depends(get_db),
):
    compiler = BlueprintGenerator()
    try:
        blueprint = compiler.compile(payload.prompt, payload.institution_context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Blueprint compilation failed: {exc}") from exc

    validation_result = compiler.validate(blueprint)
    proposal = BlueprintProposal(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        prompt=payload.prompt,
        status="validated" if validation_result["is_valid"] else "pending",
        blueprint=blueprint,
        validation_result=validation_result,
        compiled_by=user.id,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


@router.post("/ai/blueprints/{proposal_id}/deploy", response_model=WorkflowCreate)
async def deploy_blueprint(
    proposal_id: str,
    tenant: TenantContext = Depends(get_tenant_context),
    user=Depends(check_permission("blueprint:deploy")),
    db: Session = Depends(get_db),
):
    proposal = (
        db.query(BlueprintProposal)
        .filter(
            BlueprintProposal.id == proposal_id,
            BlueprintProposal.institution_id == tenant.institution_id,
            BlueprintProposal.project_id == tenant.project_id,
        )
        .first()
    )
    if not proposal:
        raise HTTPException(status_code=404, detail="Blueprint proposal not found")

    compiler = BlueprintGenerator()
    validation_result = compiler.validate(proposal.blueprint or {})
    proposal.validation_result = validation_result
    if not validation_result.get("is_valid"):
        proposal.status = "pending"
        db.commit()
        raise HTTPException(status_code=409, detail={"validation_result": validation_result})

    workflow_payload = proposal.blueprint["workflow"]
    latest = (
        db.query(Workflow)
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
            Workflow.name == workflow_payload["name"],
        )
        .order_by(Workflow.version.desc())
        .first()
    )
    version = (latest.version if latest else 0) + 1

    workflow = Workflow(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        name=workflow_payload["name"],
        version=version,
        definition=workflow_payload,
        is_ai_generated=True,
        deployed=True,
        created_by=user.id,
        deployed_at=utcnow_naive(),
    )
    db.add(workflow)

    for role in proposal.blueprint.get("roles", []):
        for permission in role.get("permissions", []):
            db.add(RolePermission(role=role["name"], permission=permission, constraint_json={"project_scoped": True}))

    proposal.status = "deployed"
    proposal.deployed_at = utcnow_naive()
    db.commit()

    event_engine = EventEngine(db)
    await event_engine.emit(
        "ai.blueprint.deployed",
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        data={
            "proposal_id": proposal.id,
            "workflow_id": workflow.id,
            "workflow_name": workflow.name,
            "workflow_version": workflow.version,
        },
    )

    return WorkflowCreate(name=workflow.name, definition=workflow.definition, is_ai_generated=True)

