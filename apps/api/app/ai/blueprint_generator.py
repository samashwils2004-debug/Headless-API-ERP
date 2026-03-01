"""AI blueprint generator — uses ProviderRouter cascade with 4-stage validation."""
from __future__ import annotations

import json
from typing import Any

from app.ai.validators import analyze_graph, analyze_permissions, check_compliance, validate_schema
from app.config import get_settings
from app.core.schema_engine import SchemaEngine
from app.observability import BLUEPRINT_VALIDATION_FAILURES

try:
    from app.ai.provider_router import get_provider_router
    _provider_router_available = True
except Exception:
    _provider_router_available = False


class BlueprintGenerator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.schema_engine = SchemaEngine()

    def compile(self, prompt: str, institution_context: dict[str, Any]) -> dict[str, Any]:
        """
        Generate a blueprint via the provider cascade (Gemini → Groq → Mock).
        Returns the blueprint dict. Raises RuntimeError on complete failure.
        """
        router = get_provider_router()
        response = router.generate(prompt, institution_context)
        result = response["result"]
        # Attach metadata for tracking
        result["_meta"] = {
            "provider_used": response["provider_used"],
            "is_mock": response["is_mock"],
            "cached": response["cached"],
        }
        return result

    def validate(self, blueprint: dict[str, Any]) -> dict[str, Any]:
        # Strip meta before validation
        clean_blueprint = {k: v for k, v in blueprint.items() if k != "_meta"}

        schema_errors = validate_schema(self.schema_engine, clean_blueprint)
        graph_errors = analyze_graph(clean_blueprint)
        permission_errors = analyze_permissions(clean_blueprint)
        compliance_errors = check_compliance(clean_blueprint)

        result = {
            "stage_1_schema": {"valid": len(schema_errors) == 0, "errors": schema_errors},
            "stage_2_graph_integrity": {"valid": len(graph_errors) == 0, "errors": graph_errors},
            "stage_3_permission_analysis": {"valid": len(permission_errors) == 0, "errors": permission_errors},
            "stage_4_compliance": {"valid": len(compliance_errors) == 0, "errors": compliance_errors},
            "is_valid": not any([schema_errors, graph_errors, permission_errors, compliance_errors]),
        }
        if schema_errors:
            BLUEPRINT_VALIDATION_FAILURES.labels(stage="schema").inc()
        if graph_errors:
            BLUEPRINT_VALIDATION_FAILURES.labels(stage="graph").inc()
        if permission_errors:
            BLUEPRINT_VALIDATION_FAILURES.labels(stage="permission").inc()
        if compliance_errors:
            BLUEPRINT_VALIDATION_FAILURES.labels(stage="compliance").inc()
        return result


# Backward-compat alias
BlueprintCompiler = BlueprintGenerator
