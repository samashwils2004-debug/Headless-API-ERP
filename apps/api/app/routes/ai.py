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
from app.time_utils import utcnow_naive

router = APIRouter()
_generator = BlueprintGenerator()

try:
    from app.ai.blueprint.context_builder import BlueprintContextBuilder
    _context_builder = BlueprintContextBuilder()
except ImportError:
    _context_builder = None


@router.post("/ai/blueprints/compile", response_model=BlueprintProposalResponse, status_code=201)
def compile_blueprint(
    body: BlueprintCompileRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("blueprint:compile")),
):
    prompt = body.prompt
    institution_context = body.institution_context

    # Enrich prompt with project context if builder is available
    if _context_builder is not None:
        project_context = _context_builder.build(db, tenant.institution_id, tenant.project_id)
        prompt = _context_builder.enrich_prompt(prompt, project_context)
        institution_context = {**institution_context, **project_context}

    try:
        raw_blueprint = _generator.compile(prompt, institution_context)
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
async def deploy_blueprint(
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

    workflow = Workflow(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        name=workflow_name,
        version=version,
        definition=workflow_def,
        is_ai_generated=True,
        ai_prompt=proposal.prompt,
        deployed=True,
        created_by=current_user.id,
        deployed_at=utcnow_naive(),
    )
    db.add(workflow)

    proposal.status = "deployed"
    proposal.deployed_at = utcnow_naive()
    db.commit()
    db.refresh(workflow)

    # Emit event
    event_engine = EventEngine(db)
    await event_engine.emit(
        "ai.blueprint.deployed",
        tenant.institution_id,
        tenant.project_id,
        {"workflow_id": workflow.id, "workflow_name": workflow.name, "proposal_id": proposal_id},
    )

    return {
        "workflow_id": workflow.id,
        "workflow_name": workflow.name,
        "version": workflow.version,
        "message": "Blueprint deployed successfully",
    }
