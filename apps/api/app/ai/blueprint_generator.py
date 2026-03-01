"""AI blueprint generator with forced function calling and four-stage validation."""
from __future__ import annotations

import json
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential

from app.ai.validators import analyze_graph, analyze_permissions, check_compliance, validate_schema
from app.config import get_settings
from app.core.schema_engine import SchemaEngine
from app.observability import BLUEPRINT_VALIDATION_FAILURES

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None


BLUEPRINT_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_blueprint",
        "description": "Generate a complete AdmitFlow infrastructure blueprint",
        "parameters": {
            "type": "object",
            "required": ["workflow", "roles", "events", "compliance_tags"],
            "properties": {
                "workflow": {"type": "object"},
                "roles": {"type": "array", "items": {"type": "object"}},
                "events": {"type": "array", "items": {"type": "object"}},
                "compliance_tags": {"type": "array", "items": {"type": "string"}},
            },
            "additionalProperties": False,
        },
    },
}


class BlueprintGenerator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.schema_engine = SchemaEngine()
        self.client = OpenAI(api_key=self.settings.openai_api_key) if OpenAI and self.settings.openai_api_key else None

    @retry(wait=wait_exponential(multiplier=1, min=1, max=8), stop=stop_after_attempt(3), reraise=True)
    def compile(self, prompt: str, institution_context: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            raise RuntimeError("OpenAI client not configured")

        response = self.client.chat.completions.create(
            model=self.settings.openai_model,
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": "You are an infrastructure compiler. Return only tool call arguments.",
                },
                {
                    "role": "user",
                    "content": json.dumps({"prompt": prompt, "institution_context": institution_context}),
                },
            ],
            tools=[BLUEPRINT_TOOL],
            tool_choice={"type": "function", "function": {"name": "generate_blueprint"}},
        )

        tool_calls = response.choices[0].message.tool_calls or []
        if not tool_calls:
            raise ValueError("Free-form response rejected: no function tool call")
        args = tool_calls[0].function.arguments
        return json.loads(args)

    def validate(self, blueprint: dict[str, Any]) -> dict[str, Any]:
        schema_errors = validate_schema(self.schema_engine, blueprint)
        graph_errors = analyze_graph(blueprint)
        permission_errors = analyze_permissions(blueprint)
        compliance_errors = check_compliance(blueprint)

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
