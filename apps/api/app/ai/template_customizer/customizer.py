"""
Mode C - Template customization AI.
Applies a user-described modification to an existing workflow template definition.
Uses Mode A validators to check the result before returning it.
"""
from __future__ import annotations

import copy
import logging
from typing import Any

from app.ai.provider_router import get_provider_router
from app.ai.validators import analyze_graph, analyze_permissions, check_compliance, validate_schema
from app.core.schema_engine import SchemaEngine

logger = logging.getLogger(__name__)

_CUSTOMIZER_SYSTEM_PROMPT = """You are a workflow template customizer for Orquestra.
Apply the user-described modification to the provided workflow definition.

Rules:
- Apply EXACTLY the change described. Nothing more.
- Preserve all states, transitions, and roles not mentioned.
- Conditions: only comparisons (==, !=, >=, <=, >, <), and/or, string literals. No eval.
- If change would create orphaned states or remove all terminal states, explain the problem.

Respond with ONLY a JSON object (no markdown) in this exact structure:
{
  "modified_definition": { ...full updated definition... },
  "change_summary": "Plain English: what was changed and why.",
  "change_type": "modify_condition|add_state|remove_state|add_transition|remove_transition|modify_role|add_role|add_compliance_tag|rename_state|error",
  "error_message": "optional - only if change_type is 'error'"
}"""


def _extract_workflow_definition(definition: dict[str, Any]) -> dict[str, Any]:
    if "workflow" in definition and isinstance(definition["workflow"], dict):
        return definition["workflow"]
    if "workflows" in definition and isinstance(definition["workflows"], dict):
        main = definition["workflows"].get("main")
        if isinstance(main, dict):
            return main
    return definition


def _extract_roles(definition: dict[str, Any]) -> list[dict[str, Any]]:
    roles = definition.get("roles", [])
    return roles if isinstance(roles, list) else []


def _extract_events(definition: dict[str, Any]) -> list[dict[str, Any]]:
    events = definition.get("events", [])
    return events if isinstance(events, list) else []


def _extract_compliance_tags(definition: dict[str, Any]) -> list[str]:
    tags = definition.get("compliance_tags")
    if isinstance(tags, list):
        return [tag for tag in tags if isinstance(tag, str)]

    metadata = definition.get("metadata")
    if isinstance(metadata, dict):
        meta_tags = metadata.get("compliance_tags", [])
        if isinstance(meta_tags, list):
            return [tag for tag in meta_tags if isinstance(tag, str)]

    return []


def _normalize_template_definition(candidate: Any, fallback: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        return copy.deepcopy(fallback)

    workflow = _extract_workflow_definition(candidate)
    if isinstance(workflow, dict) and "initial_state" in workflow and "states" in workflow:
        return copy.deepcopy(workflow)

    return copy.deepcopy(fallback)


def _to_validation_blueprint(definition: dict[str, Any]) -> dict[str, Any]:
    return {
        "workflow": copy.deepcopy(_extract_workflow_definition(definition)),
        "roles": copy.deepcopy(_extract_roles(definition)),
        "events": copy.deepcopy(_extract_events(definition)),
        "compliance_tags": copy.deepcopy(_extract_compliance_tags(definition)),
    }


def _transition_map(workflow: dict[str, Any]) -> dict[str, str]:
    states = workflow.get("states", {})
    if not isinstance(states, dict):
        return {}

    transitions: dict[str, str] = {}
    for from_state, state_def in states.items():
        if not isinstance(state_def, dict):
            continue
        for transition in state_def.get("transitions", []):
            if not isinstance(transition, dict):
                continue
            target = transition.get("to")
            if isinstance(target, str):
                transitions[f"{from_state}->{target}"] = str(transition.get("condition", ""))

    return transitions


def _build_prompt(definition: dict[str, Any], instruction: str) -> str:
    """Token-efficient prompt - sends state names + conditions only, not full JSON."""
    workflow = _extract_workflow_definition(definition)
    states = list(workflow.get("states", {}).keys())
    transitions = [
        f"{key.replace('->', ' -> ')} (when: {condition or 'none'})"
        for key, condition in _transition_map(workflow).items()
    ]
    roles = [role.get("name", "?") for role in _extract_roles(definition) if isinstance(role, dict)]

    return (
        f"Workflow:\n"
        f"States: {', '.join(states)}\n"
        f"Transitions:\n" + "\n".join(f"  {transition}" for transition in transitions) + "\n"
        f"Roles: {', '.join(roles)}\n\n"
        f"Instruction: {instruction[:500]}"
    )


def _mock_customization(definition: dict[str, Any], instruction: str) -> dict[str, Any]:
    """Deterministic mock - applies a plausible no-op change for demo mode."""
    return {
        "modified_definition": definition,
        "change_summary": f"[Demo] Applied: {instruction[:100]}",
        "change_type": "modify_condition",
        "error_message": None,
    }


def _compute_diff(original: dict[str, Any], modified: dict[str, Any]) -> dict[str, Any]:
    """Compute a human-readable diff between two workflow definitions."""
    orig_wf = _extract_workflow_definition(original)
    mod_wf = _extract_workflow_definition(modified)

    orig_transitions = _transition_map(orig_wf)
    mod_transitions = _transition_map(mod_wf)

    changed_conditions = []
    for key in orig_transitions:
        if key in mod_transitions and orig_transitions[key] != mod_transitions[key]:
            changed_conditions.append(
                {
                    "transition": key.replace("->", " -> "),
                    "before": orig_transitions[key],
                    "after": mod_transitions[key],
                }
            )

    orig_states = set(orig_wf.get("states", {}).keys())
    mod_states = set(mod_wf.get("states", {}).keys())

    return {
        "changed_conditions": changed_conditions,
        "added_states": list(mod_states - orig_states),
        "removed_states": list(orig_states - mod_states),
        "summary": _diff_summary(changed_conditions, mod_states - orig_states, orig_states - mod_states),
    }


def _diff_summary(changed: list, added: set, removed: set) -> str:
    parts: list[str] = []
    if changed:
        parts.append(f"{len(changed)} condition(s) updated")
    if added:
        parts.append(f"{len(added)} state(s) added: {', '.join(sorted(added))}")
    if removed:
        parts.append(f"{len(removed)} state(s) removed: {', '.join(sorted(removed))}")
    return "; ".join(parts) if parts else "No structural changes"


class TemplateCustomizer:
    """
    Applies AI-described modifications to a workflow template definition.
    Uses the Mode A 4-stage validator to verify the result.
    """

    def __init__(self) -> None:
        self._schema_engine = SchemaEngine()

    def customize(self, template_definition: dict[str, Any], instruction: str) -> dict[str, Any]:
        router = get_provider_router()
        """
        Returns:
            {
                modified_definition: dict,
                diff: dict,
                validation: dict,
                change_summary: str,
                provider_used: str,
                is_mock: bool,
            }
        """
        router = get_provider_router()
        user_prompt = _build_prompt(template_definition, instruction)

        modified: dict[str, Any] | None = None
        change_summary = ""
        provider_used = "mock"
        is_mock = True

        try:
            result = router.generate(
                prompt=user_prompt,
                institution_context={
                    "mode": "template_customization",
                    "original_definition": template_definition,
                },
                system_prompt=_CUSTOMIZER_SYSTEM_PROMPT,
            )
            raw_result = result["result"]
            provider_used = result["provider_used"]
            is_mock = result["is_mock"]

            if isinstance(raw_result, dict):
                if raw_result.get("change_type") == "error":
                    logger.warning("AI refused customization: %s", raw_result.get("error_message"))
                    modified = copy.deepcopy(template_definition)
                    change_summary = raw_result.get("error_message", "Customization refused by AI")
                elif "modified_definition" in raw_result:
                    modified = _normalize_template_definition(raw_result["modified_definition"], template_definition)
                    change_summary = raw_result.get("change_summary", f"Applied: {instruction[:200]}")
                elif (
                    "workflow" in raw_result
                    or "workflows" in raw_result
                    or ("initial_state" in raw_result and "states" in raw_result)
                ):
                    modified = _normalize_template_definition(raw_result, template_definition)
                    change_summary = f"Applied: {instruction[:200]}"

        except Exception as exc:
            logger.warning("Template customizer provider call failed: %s", exc)

        if modified is None:
            mock = _mock_customization(template_definition, instruction)
            modified = copy.deepcopy(mock["modified_definition"])
            change_summary = mock["change_summary"]

        diff = _compute_diff(template_definition, modified)

        validation_blueprint = _to_validation_blueprint(modified)
        schema_errors = validate_schema(self._schema_engine, validation_blueprint)
        graph_errors = analyze_graph(validation_blueprint)
        permission_errors = analyze_permissions(validation_blueprint)
        compliance_errors = check_compliance(validation_blueprint)

        validation = {
            "schema": {"passed": len(schema_errors) == 0, "errors": schema_errors},
            "graph": {"passed": len(graph_errors) == 0, "errors": graph_errors},
            "permissions": {"passed": len(permission_errors) == 0, "errors": permission_errors},
            "compliance": {"passed": len(compliance_errors) == 0, "errors": compliance_errors},
            "all_passed": not any([schema_errors, graph_errors, permission_errors, compliance_errors]),
        }

        return {
            "modified_definition": modified,
            "diff": diff,
            "validation": validation,
            "change_summary": change_summary,
            "provider_used": provider_used,
            "is_mock": is_mock,
        }
