"""AI blueprint routes for Orquestra — compile and deploy."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.blueprint_generator import BlueprintGenerator
from app.core.rbac_engine import check_permission
from app.core.event_engine import EventEngine
from app.database import get_db
from app.models import BlueprintProposal, Workflow
from app.schemas import BlueprintCompileRequest, BlueprintProposalResponse
from app.security import get_current_user
from app.tenant import get_tenant_context

router = APIRouter()
_generator = BlueprintGenerator()


@router.post("/ai/blueprints/compile", response_model=BlueprintProposalResponse, status_code=201)
def compile_blueprint(
    body: BlueprintCompileRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("blueprint:compile")),
):
    try:
        raw_blueprint = _generator.compile(body.prompt, body.institution_context)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"AI provider unavailable: {exc}") from exc

    # Extract meta and clean blueprint
    meta = raw_blueprint.pop("_meta", {})
    validation = _generator.validate(raw_blueprint)

    proposal = BlueprintProposal(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        prompt=body.prompt,
        status="validated" if validation["is_valid"] else "invalid",
        blueprint=raw_blueprint,
        validation_result=validation,
        provider_used=meta.get("provider_used", "unknown"),
        is_mock=meta.get("is_mock", False),
        compiled_by=current_user.id,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


@router.post("/ai/blueprints/{proposal_id}/deploy", status_code=201)
def deploy_blueprint(
    proposal_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("blueprint:deploy")),
):
    proposal = db.query(BlueprintProposal).filter(
        BlueprintProposal.id == proposal_id,
        BlueprintProposal.institution_id == tenant.institution_id,
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Blueprint proposal not found")
    if proposal.status == "deployed":
        raise HTTPException(status_code=409, detail="Blueprint already deployed")

    # Re-validate before deployment (security invariant)
    validation = _generator.validate(proposal.blueprint)
    if not validation["is_valid"]:
        raise HTTPException(status_code=422, detail="Blueprint failed re-validation — cannot deploy")

    # Create workflow from blueprint
    workflow_def = proposal.blueprint.get("workflow", {})
    workflow_name = workflow_def.get("name", "generated_workflow")

    existing = (
        db.query(Workflow)
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
            Workflow.name == workflow_name,
        )
        .order_by(Workflow.version.desc())
        .first()
    )
    version = (existing.version + 1) if existing else 1

    from app.time_utils import utcnow_naive
    workflow = Workflow(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        name=workflow_name,
        version=version,
        definition=workflow_def,
        is_ai_generated=True,
        deployed=True,
        created_by=current_user.id,
        deployed_at=utcnow_naive(),
    )
    db.add(workflow)

    proposal.status = "deployed"
    from app.time_utils import utcnow_naive as _now
    proposal.deployed_at = _now()
    db.commit()
    db.refresh(workflow)

    # Emit event
    event_engine = EventEngine(db)
    import asyncio
    asyncio.create_task(
        event_engine.emit(
            "ai.blueprint.deployed",
            tenant.institution_id,
            tenant.project_id,
            {"workflow_id": workflow.id, "workflow_name": workflow.name, "proposal_id": proposal_id},
        )
    ) if asyncio.get_event_loop().is_running() else None

    return {
        "workflow_id": workflow.id,
        "workflow_name": workflow.name,
        "version": workflow.version,
        "message": "Blueprint deployed successfully",
    }
