"""
Architect routes — Mode B ERP domain graph composition.
Handles CRUD for institution architectures plus AI-driven NLP prompts.
"""
from __future__ import annotations

import copy
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.architect.erp_schema import ERP_COMPOSITION_SCHEMA, ERP_SYSTEM_PROMPT
from app.ai.architect.nlp_intent_parser import NLPIntentParser
from app.ai.architect.prompt_factory import ERPPromptFactory
from app.ai.architect.visualization_generator import ERPVisualizationGenerator
from app.ai.provider_router import get_provider_router
from app.core.rbac_engine import check_permission
from app.database import get_db
from app.models import InstitutionArchitecture, ArchitectureVersion, Workflow
from app.schemas import (
    ArchitectureCreate,
    ArchitectureResponse,
    ArchitectureVersionResponse,
    LinkWorkflowRequest,
    PromptRequest,
)
from app.security import get_current_user
from app.tenant import get_tenant_context
from app.time_utils import utcnow_naive

logger = logging.getLogger(__name__)
router = APIRouter()

_intent_parser = NLPIntentParser()
_prompt_factory = ERPPromptFactory()
_viz_generator = ERPVisualizationGenerator()

# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_arch_or_404(arch_id: str, tenant, db: Session) -> InstitutionArchitecture:
    arch = db.query(InstitutionArchitecture).filter(
        InstitutionArchitecture.id == arch_id,
        InstitutionArchitecture.institution_id == tenant.institution_id,
    ).first()
    if not arch:
        raise HTTPException(status_code=404, detail="Architecture not found")
    return arch


def _linked_workflows(arch: InstitutionArchitecture) -> list[dict]:
    """Extract currently linked workflows from the graph."""
    domains = arch.graph_json.get("erp_system", {}).get("domains", [])
    return [
        {"domain_id": d["id"], "workflow_id": d["workflow_id"], "workflow_name": d.get("workflow_name", "")}
        for d in domains if d.get("workflow_id")
    ]


def _apply_operation(current_graph: dict, operation: dict) -> dict:
    """Apply a single compose_erp_architecture operation to the graph."""
    graph = copy.deepcopy(current_graph)
    erp = graph.setdefault("erp_system", {"name": "Institutional ERP", "domains": [], "integrations": []})
    op = operation.get("operation", "")

    if op == "create_system":
        erp["name"] = operation.get("domain", {}).get("label", "Institutional ERP")

    elif op == "add_domain":
        domain_data = operation.get("domain", {})
        if not domain_data.get("id"):
            return graph
        # Avoid duplicates
        existing_ids = {d["id"] for d in erp.get("domains", [])}
        if domain_data["id"] not in existing_ids:
            erp.setdefault("domains", []).append({
                "id": domain_data["id"],
                "label": domain_data.get("label", domain_data["id"].replace("_", " ").title()),
                "color": domain_data.get("color"),
                "icon": domain_data.get("icon", "cube"),
                "modules": domain_data.get("modules", []),
                "requires_workflow": domain_data.get("requires_workflow", True),
                "workflow_id": None,
                "workflow_name": None,
            })

    elif op == "add_module_to_domain":
        domain_data = operation.get("domain", {})
        target_id = domain_data.get("id")
        new_modules = domain_data.get("modules", [])
        for d in erp.get("domains", []):
            if d["id"] == target_id:
                existing_module_ids = {m["id"] for m in d.get("modules", [])}
                for m in new_modules:
                    if m.get("id") not in existing_module_ids:
                        d.setdefault("modules", []).append(m)
                break

    elif op == "add_integration":
        integration_data = operation.get("integration", {})
        if integration_data.get("from_domain") and integration_data.get("to_domain"):
            erp.setdefault("integrations", []).append({
                "from": integration_data["from_domain"],
                "to": integration_data["to_domain"],
                "trigger_event": integration_data.get("trigger_event", ""),
                "description": integration_data.get("description", ""),
            })

    elif op == "remove_domain":
        domain_id = operation.get("domain", {}).get("id")
        if domain_id:
            erp["domains"] = [d for d in erp.get("domains", []) if d["id"] != domain_id]
            erp["integrations"] = [
                i for i in erp.get("integrations", [])
                if i.get("from") != domain_id and i.get("to") != domain_id
            ]

    elif op == "link_workflow":
        wl = operation.get("workflow_link", {})
        for d in erp.get("domains", []):
            if d["id"] == wl.get("domain_id"):
                d["workflow_id"] = wl.get("workflow_id")
                d["workflow_name"] = wl.get("workflow_name", "")
                break

    return graph


def _compute_diff_summary(old_graph: dict, new_graph: dict) -> str:
    old_domains = {d["id"] for d in old_graph.get("erp_system", {}).get("domains", [])}
    new_domains = {d["id"] for d in new_graph.get("erp_system", {}).get("domains", [])}
    added = new_domains - old_domains
    removed = old_domains - new_domains
    old_ints = len(old_graph.get("erp_system", {}).get("integrations", []))
    new_ints = len(new_graph.get("erp_system", {}).get("integrations", []))

    parts: list[str] = []
    if added:
        parts.append(f"+{len(added)} domain(s): {', '.join(sorted(added))}")
    if removed:
        parts.append(f"-{len(removed)} domain(s): {', '.join(sorted(removed))}")
    if new_ints > old_ints:
        parts.append(f"+{new_ints - old_ints} integration(s)")
    elif new_ints < old_ints:
        parts.append(f"-{old_ints - new_ints} integration(s)")
    return "; ".join(parts) if parts else "No structural changes"


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/architect", status_code=201)
def create_architecture(
    body: ArchitectureCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    """Create a new (empty) architecture for the current project."""
    existing = db.query(InstitutionArchitecture).filter(
        InstitutionArchitecture.institution_id == tenant.institution_id,
        InstitutionArchitecture.project_id == tenant.project_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Architecture already exists for this project")

    arch = InstitutionArchitecture(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        name=body.name,
        graph_json={"erp_system": {"name": body.name, "domains": [], "integrations": []}},
        visualization_config={},
        version=1,
        created_by=current_user.id,
    )
    db.add(arch)
    db.commit()
    db.refresh(arch)
    return ArchitectureResponse.model_validate(arch)


@router.get("/architect")
def get_or_list_architectures(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    """Get the architecture for the current project (at most one per project)."""
    arch = db.query(InstitutionArchitecture).filter(
        InstitutionArchitecture.institution_id == tenant.institution_id,
        InstitutionArchitecture.project_id == tenant.project_id,
    ).first()
    if not arch:
        return {"architecture": None}
    return {"architecture": ArchitectureResponse.model_validate(arch)}


@router.get("/architect/{arch_id}")
def get_architecture(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    arch = _get_arch_or_404(arch_id, tenant, db)
    return ArchitectureResponse.model_validate(arch)


@router.post("/architect/{arch_id}/prompt")
def apply_prompt(
    arch_id: str,
    body: PromptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    """Apply an NLP prompt to the architecture (Mode B main entry point)."""
    arch = _get_arch_or_404(arch_id, tenant, db)
    intent = _intent_parser.parse(body.prompt)

    # ── Non-AI fast paths ────────────────────────────────────────────────────
    if intent.type == "redirect_to_workflow":
        return {
            "type": "redirect",
            "message": intent.message,
            "suggested_action": intent.suggested_action,
            "pre_fill_prompt": intent.pre_fill_prompt,
        }

    if intent.type == "visualize":
        linked = _linked_workflows(arch)
        arch.visualization_config = _viz_generator.generate(arch.graph_json, linked)
        db.commit()
        return {
            "type": "success",
            "graph": arch.graph_json,
            "visualization_config": arch.visualization_config,
            "version": arch.version,
            "intent_classified_as": intent.type,
            "_from_cache": False,
        }

    if intent.type == "compile":
        return {"type": "compile_prompt", "message": "Use the Compile button to issue a versioned API key."}

    # ── AI-requiring paths ───────────────────────────────────────────────────
    router_instance = get_provider_router()
    user_prompt = _prompt_factory.build(body.prompt, arch.graph_json)
    response = router_instance.generate(user_prompt, {"mode": "erp_architect"})

    raw_result = response["result"]
    from_cache = response["cached"]
    is_mock = response["is_mock"]

    # Extract compose operation from result
    # Provider returns blueprint-shaped dict; for architect mode we interpret
    # the top-level as an operation description.
    if is_mock or not isinstance(raw_result, dict):
        # Fallback: treat prompt as "add_domain" when AI returns nothing useful
        domain_name = body.prompt.strip().split()[-1].lower().replace(" ", "_")
        operation = {
            "operation": "add_domain",
            "domain": {
                "id": domain_name,
                "label": body.prompt.strip().split()[-1].title(),
            },
            "rationale": f"Added domain based on: {body.prompt[:100]}",
        }
    else:
        # Try to extract operation from result
        operation = raw_result if "operation" in raw_result else {
            "operation": "add_domain",
            "domain": {
                "id": body.prompt.strip().lower().replace(" ", "_")[:20],
                "label": body.prompt.strip()[:40].title(),
            },
            "rationale": str(raw_result)[:200],
        }

    old_graph = copy.deepcopy(arch.graph_json)
    new_graph = _apply_operation(arch.graph_json, operation)
    diff_summary = _compute_diff_summary(old_graph, new_graph)

    arch.graph_json = new_graph
    arch.version += 1
    arch.updated_at = utcnow_naive()

    # Record version
    version_record = ArchitectureVersion(
        architecture_id=arch.id,
        version=arch.version,
        prompt=body.prompt,
        graph_snapshot=new_graph,
        diff_summary=diff_summary,
    )
    db.add(version_record)

    # Regenerate visualization
    linked = _linked_workflows(arch)
    arch.visualization_config = _viz_generator.generate(new_graph, linked)

    db.commit()

    return {
        "type": "success",
        "graph": new_graph,
        "diff": {"summary": diff_summary, "operation": operation.get("operation")},
        "version": arch.version,
        "rationale": operation.get("rationale", ""),
        "visualization_config": arch.visualization_config,
        "intent_classified_as": intent.type,
        "_from_cache": from_cache,
        "_is_mock": is_mock,
    }


@router.post("/architect/{arch_id}/link-workflow")
def link_workflow(
    arch_id: str,
    body: LinkWorkflowRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    """Link a deployed workflow to a domain in the architecture."""
    arch = _get_arch_or_404(arch_id, tenant, db)

    # Verify workflow belongs to this project
    wf = db.query(Workflow).filter(
        Workflow.id == body.workflow_id,
        Workflow.institution_id == tenant.institution_id,
        Workflow.project_id == tenant.project_id,
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found in this project")

    # Apply link operation
    old_graph = copy.deepcopy(arch.graph_json)
    new_graph = _apply_operation(arch.graph_json, {
        "operation": "link_workflow",
        "workflow_link": {
            "domain_id": body.domain_id,
            "workflow_id": body.workflow_id,
            "workflow_name": body.workflow_name,
        },
        "rationale": f"Linked workflow '{body.workflow_name}' to domain '{body.domain_id}'",
    })

    arch.graph_json = new_graph
    arch.updated_at = utcnow_naive()

    linked = _linked_workflows(arch)
    arch.visualization_config = _viz_generator.generate(new_graph, linked)
    db.commit()

    return {
        "domain_id": body.domain_id,
        "workflow_id": body.workflow_id,
        "workflow_name": body.workflow_name,
        "visualization_config": arch.visualization_config,
    }


@router.get("/architect/{arch_id}/visualization")
def get_visualization(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    arch = _get_arch_or_404(arch_id, tenant, db)
    return {"visualization_config": arch.visualization_config, "version": arch.version}


@router.get("/architect/{arch_id}/versions")
def list_versions(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    arch = _get_arch_or_404(arch_id, tenant, db)
    versions = (
        db.query(ArchitectureVersion)
        .filter(ArchitectureVersion.architecture_id == arch.id)
        .order_by(ArchitectureVersion.version.desc())
        .limit(20)
        .all()
    )
    return {"versions": [ArchitectureVersionResponse.model_validate(v) for v in versions]}


@router.get("/architect/{arch_id}/available-workflows")
def available_workflows(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
):
    """List workflows in this project that can be linked to a domain."""
    arch = _get_arch_or_404(arch_id, tenant, db)
    linked_ids = {d.get("workflow_id") for d in arch.graph_json.get("erp_system", {}).get("domains", []) if d.get("workflow_id")}

    workflows = db.query(Workflow).filter(
        Workflow.institution_id == tenant.institution_id,
        Workflow.project_id == tenant.project_id,
        Workflow.deployed == True,
    ).order_by(Workflow.created_at.desc()).all()

    return {
        "workflows": [
            {
                "id": w.id,
                "name": w.name,
                "version": w.version,
                "is_linked": w.id in linked_ids,
                "is_ai_generated": w.is_ai_generated,
            }
            for w in workflows
        ]
    }
