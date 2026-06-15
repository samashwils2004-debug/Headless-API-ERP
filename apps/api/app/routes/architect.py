"""
Architect routes — Mode B ERP domain graph composition.
Handles CRUD for institution architectures plus AI-driven NLP prompts.
"""
from __future__ import annotations

import copy
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.ai.erp_agent_evaluator import get_erp_agent_evaluator
from app.ai.architect.erp_schema import ERP_SYSTEM_PROMPT
from app.ai.architect.nlp_intent_parser import NLPIntentParser
from app.ai.architect.prompt_factory import ERPPromptFactory
from app.ai.architect.visualization_generator import ERPVisualizationGenerator
from app.ai.provider_router import get_provider_router
from app.core.api_key_utils import generate_api_key, generate_webhook_secret
from app.core.event_engine import EventEngine
from app.core.rbac_engine import check_permission
from app.database import get_db
from app.models import APIKey, ArchWorkflow, ArchitectureVersion, InstitutionArchitecture, Workflow
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

_STOP_WORDS = {
    "add", "create", "new", "a", "an", "the", "domain", "domains",
    "for", "with", "and", "to", "from", "in", "of", "my", "our",
    "please", "i", "want", "need", "section", "department",
}


class CompileRequest(BaseModel):
    workflow_ids: list[str]
    key_name: str = "Default API Key"


class CompileResponse(BaseModel):
    architecture_version_id: str
    version_number: int
    workflows_linked: int
    api_key: str
    api_key_prefix: str
    webhook_secret: str
    webhook_secret_prefix: str
    message: str


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


def _extract_domain_ids_from_prompt(prompt: str) -> list[str]:
    """Extract likely domain names from a natural language prompt using stop-word filtering."""
    words = prompt.lower().strip().split()
    candidates = [
        w.replace(",", "").replace(".", "")
        for w in words
        if w.lower().replace(",", "").replace(".", "") not in _STOP_WORDS
        and len(w) > 2
    ]
    return candidates[:5] if candidates else ["general"]


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
    _=Depends(check_permission("architect:write")),
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
    _=Depends(check_permission("architect:read")),
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
    _=Depends(check_permission("architect:read")),
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
    _=Depends(check_permission("architect:write")),
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
    response = router_instance.generate(
        user_prompt,
        {"mode": "erp_architect"},
        system_prompt=ERP_SYSTEM_PROMPT,
    )

    raw_result = response["result"]
    from_cache = response["cached"]
    is_mock = response["is_mock"]

    if is_mock or not isinstance(raw_result, dict):
        # Fallback: extract meaningful domain names using stop-word filtering
        domain_ids = _extract_domain_ids_from_prompt(body.prompt)
        operations = [
            {
                "operation": "add_domain",
                "domain": {
                    "id": domain_id,
                    "label": domain_id.replace("_", " ").title(),
                },
                "rationale": f"Added domain '{domain_id}' based on: {body.prompt[:100]}",
            }
            for domain_id in domain_ids
        ]

        old_graph = copy.deepcopy(arch.graph_json)
        new_graph = arch.graph_json
        for op in operations:
            new_graph = _apply_operation(new_graph, op)

        diff_summary = _compute_diff_summary(old_graph, new_graph)
        operation = operations[0] if operations else {}
    else:
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
    _=Depends(check_permission("architect:write")),
):
    """Link a deployed workflow to a domain in the architecture."""
    arch = _get_arch_or_404(arch_id, tenant, db)

    wf = db.query(Workflow).filter(
        Workflow.id == body.workflow_id,
        Workflow.institution_id == tenant.institution_id,
        Workflow.project_id == tenant.project_id,
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found in this project")

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


@router.post("/architect/{arch_id}/compile", response_model=CompileResponse, status_code=201)
async def compile_architecture(
    arch_id: str,
    body: CompileRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),
):
    """Compile architecture into an immutable version, generate API key and webhook secret."""
    arch = _get_arch_or_404(arch_id, tenant, db)

    if not body.workflow_ids:
        raise HTTPException(status_code=400, detail="At least one workflow must be selected")

    # Validate all workflows
    workflows: list[Workflow] = []
    for wf_id in body.workflow_ids:
        wf = db.query(Workflow).filter(
            Workflow.id == wf_id,
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
        ).first()
        if not wf:
            raise HTTPException(status_code=404, detail=f"Workflow {wf_id} not found in this project")
        if not wf.deployed:
            raise HTTPException(status_code=400, detail=f"Workflow '{wf.name}' must be deployed before compiling")
        workflows.append(wf)

    # Determine next version number
    latest_version = (
        db.query(ArchitectureVersion)
        .filter(ArchitectureVersion.architecture_id == arch.id)
        .order_by(ArchitectureVersion.version.desc())
        .first()
    )
    version_number = (latest_version.version + 1) if latest_version else 1

    # Create immutable architecture version
    arch_version = ArchitectureVersion(
        architecture_id=arch.id,
        version=version_number,
        prompt=f"Compile: {body.key_name}",
        graph_snapshot=arch.graph_json,
        diff_summary=f"Compiled with {len(workflows)} workflow(s)",
    )
    db.add(arch_version)
    db.flush()  # Get arch_version.id

    # Create ArchWorkflow junction records
    for idx, wf in enumerate(workflows):
        arch_wf = ArchWorkflow(
            architecture_version_id=arch_version.id,
            workflow_id=wf.id,
            workflow_version=wf.version,
            display_order=idx,
        )
        db.add(arch_wf)

    # Generate API key and webhook secret
    key_data = generate_api_key(version_number)
    secret_data = generate_webhook_secret()

    api_key = APIKey(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        architecture_version_id=arch_version.id,
        key_hash=key_data["key_hash"],
        key_prefix=key_data["key_prefix"],
        name=body.key_name,
        scopes=["runtime:submit", "runtime:read"],
        is_active=True,
        created_by=current_user.id,
        webhook_secret_hash=secret_data["secret_hash"],
        webhook_secret_prefix=secret_data["secret_prefix"],
    )
    db.add(api_key)
    db.commit()
    db.refresh(arch_version)

    # Emit event — failure must never block compile response
    try:
        event_engine = EventEngine(db)
        await event_engine.emit(
            "architecture.compiled",
            tenant.institution_id,
            tenant.project_id,
            {
                "architecture_version_id": arch_version.id,
                "version_number": version_number,
                "workflows_linked": len(workflows),
                "key_prefix": key_data["key_prefix"],
            },
        )
    except Exception as _emit_err:
        logger.warning("Event emission failed during compile (non-fatal): %s", _emit_err)

    return CompileResponse(
        architecture_version_id=arch_version.id,
        version_number=version_number,
        workflows_linked=len(workflows),
        api_key=key_data["raw_key"],
        api_key_prefix=key_data["key_prefix"],
        webhook_secret=secret_data["raw_secret"],
        webhook_secret_prefix=secret_data["secret_prefix"],
        message=f"Architecture v{version_number} compiled. {len(workflows)} workflow(s) linked. Key issued once — copy it now.",
    )


@router.get("/architect/{arch_id}/visualization")
def get_visualization(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:read")),
):
    arch = _get_arch_or_404(arch_id, tenant, db)
    return {"visualization_config": arch.visualization_config, "version": arch.version}


@router.get("/architect/{arch_id}/versions")
def list_versions(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:read")),
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


class DesignRequest(BaseModel):
    prompt: str = "Generate ERP design"


_ERP_DESIGN_SYSTEM_PROMPT = """You are an ERP design architect for Orquestra.
Given a domain graph and deployed workflow schemas, produce a JSON ERP design spec
that will render as a fully interactive ERP application mockup.

Output ONLY valid JSON with this exact structure:
{
  "system_name": "string",
  "modules": [
    {
      "id": "string",
      "domain_id": "string",
      "label": "string",
      "description": "string",
      "icon": "string",
      "color": "#hex",
      "primary_entity": "string",
      "fields": [{"name": "string", "type": "string", "label": "string"}],
      "actions": ["string"],
      "nav_position": number,
      "stats": [
        {"label": "string", "value": "string", "trend": "up|down|flat"}
      ],
      "table_columns": [
        {"key": "string", "label": "string", "type": "text|number|badge|date", "badge_values": ["string"]}
      ]
    }
  ],
  "relationships": [
    {
      "from_module": "string",
      "to_module": "string",
      "type": "one_to_many|many_to_many|one_to_one",
      "label": "string"
    }
  ],
  "nav_groups": [{"label": "string", "module_ids": ["string"]}],
  "layout": "sidebar_nav",
  "rationale": "string"
}

Rules:
- One module per domain that has a linked workflow
- Fields come from the workflow schema fields
- Actions come from the workflow states (e.g. Submit, Approve, Reject)
- Relationships come from domain integrations
- nav_position is 1-based ordering
- stats: exactly 4 KPI cards per module with realistic institutional values
  (e.g. "1,247", "89%", "$2.4M", "342"). Include a trend direction.
- table_columns: 4-6 columns per module describing the data table.
  Use type "badge" for status columns and provide badge_values matching workflow states
  (e.g. ["Submitted", "Under Review", "Approved", "Rejected"]).
  Use type "date" for timestamps, "number" for numeric fields, "text" for everything else.
- Return ONLY the JSON, no markdown"""


@router.post("/architect/{arch_id}/generate-design")
async def generate_design(
    arch_id: str,
    body: DesignRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),
):
    """Use the AI provider cascade to generate an ERP design spec from the architecture graph + workflow schemas."""
    import json as _json

    arch = _get_arch_or_404(arch_id, tenant, db)
    domains = arch.graph_json.get("erp_system", {}).get("domains", [])

    workflow_schemas = []
    for domain in domains:
        wf_id = domain.get("workflow_id")
        if not wf_id:
            continue
        wf = db.query(Workflow).filter(
            Workflow.id == wf_id,
            Workflow.institution_id == tenant.institution_id,
        ).first()
        if wf and wf.definition:
            schema = wf.definition.get("schema", {})
            states = list(wf.definition.get("states", {}).keys())
            workflow_schemas.append({
                "domain_id": domain["id"],
                "domain_label": domain.get("label", domain["id"]),
                "workflow_name": wf.name,
                "schema_fields": schema.get("fields", []),
                "states": states,
                "color": domain.get("color"),
            })

    context = {
        "system_name": arch.name,
        "domains": [{"id": d["id"], "label": d.get("label", d["id"])} for d in domains],
        "integrations": arch.graph_json.get("erp_system", {}).get("integrations", []),
        "workflow_schemas": workflow_schemas,
    }

    router_instance = get_provider_router()
    user_prompt = (
        f"Design an ERP for: {arch.name}\n\n"
        f"Context: {_json.dumps(context)[:3000]}"
    )

    response = router_instance.generate(
        user_prompt,
        {"mode": "erp_design"},
        system_prompt=_ERP_DESIGN_SYSTEM_PROMPT,
    )

    design_spec = response["result"]

    arch.visualization_config = {
        **(arch.visualization_config or {}),
        "design_spec": design_spec,
        "design_generated_at": utcnow_naive().isoformat(),
        "provider_used": response["provider_used"],
    }
    db.commit()

    return {
        "design_spec": design_spec,
        "provider_used": response["provider_used"],
        "is_mock": response["is_mock"],
    }

@router.post("/architect/{arch_id}/generate-design")
async def generate_design(
    arch_id: str,
    body: DesignRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),
):
    """Use multi-agent pipeline to generate and validate ERP design spec."""
    arch = _get_arch_or_404(arch_id, tenant, db)
    domains = arch.graph_json.get("erp_system", {}).get("domains", [])

    # Build context for agents
    workflow_schemas = []
    for domain in domains:
        wf_id = domain.get("workflow_id")
        if not wf_id:
            continue
        wf = db.query(Workflow).filter(
            Workflow.id == wf_id,
            Workflow.institution_id == tenant.institution_id,
        ).first()
        if wf and wf.definition:
            schema = wf.definition.get("schema", {})
            states = list(wf.definition.get("states", {}).keys())
            workflow_schemas.append({
                "domain_id": domain["id"],
                "domain_label": domain.get("label", domain["id"]),
                "workflow_name": wf.name,
                "schema_fields": schema.get("fields", []),
                "states": states,
                "color": domain.get("color"),
            })

    context = {
        "system_name": arch.name,
        "domains": [
            {"id": d["id"], "label": d.get("label", d["id"])}
            for d in domains
        ],
        "integrations": arch.graph_json.get("erp_system", {}).get("integrations", []),
        "workflow_schemas": workflow_schemas,
    }

    # Run multi-agent pipeline
    evaluator = get_erp_agent_evaluator()
    result = await evaluator.generate(context)

    design_spec = result["spec"]

    # Persist to architecture
    arch.visualization_config = {
        **(arch.visualization_config or {}),
        "design_spec": design_spec,
        "design_generated_at": utcnow_naive().isoformat(),
        "provider_used": result["provider"],
        "reviewer_changes": result.get("reviewer_changes", []),
    }
    db.commit()

    return {
        "design_spec": design_spec,
        "provider_used": result["provider"],
        "reviewer_status": result.get("reviewer_status", "fallback"),
        "reviewer_changes": result.get("reviewer_changes", []),
        "is_mock": result["provider"] == "fallback",
    }

@router.get("/architect/{arch_id}/available-workflows")
def available_workflows(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:read")),
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

class DeleteDomainRequest(BaseModel):
    domain_id: str

@router.delete("/architect/{arch_id}/domains/{domain_id}", status_code=200)
def delete_domain(
    arch_id: str,
    domain_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),
):
    """Delete a domain from architecture"""
    arch = _get_arch_or_404(arch_id, tenant, db)
    
    old_graph = copy.deepcopy(arch.graph_json)
    new_graph = _apply_operation(arch.graph_json, {
        "operation": "delete_domain",
        "domain_id": {"id": domain_id},
        "rationale": f"Domain '{domain_id}' deleted by user {current_user.username}",
    })

    arch.graph_json = new_graph
    arch.version += 1
    arch.updated_at = utcnow_naive()

    # Record version
    diff_summary = _compute_diff_summary(old_graph, new_graph)
    version_record = ArchitectureVersion(
        architecture_id=arch.id,
        version=arch.version,
        prompt=f"Deleted domain: {domain_id}",
        graph_snapshot=new_graph,
        diff_summary=diff_summary,
    )
    db.add(version_record)

    # Regenerate visualization
    linked = _linked_workflows(arch)
    arch.visualization_config = _viz_generator.generate(new_graph, linked)

    db.commit()

    return {
        "graph": new_graph,
        "version": arch.version,
        "diff": {"summary": diff_summary},
        "visualization_config": arch.visualization_config,
    } 
    