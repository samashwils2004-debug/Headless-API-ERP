"""
Multi-agent ERP design spec generator and evaluator
using Microsoft Agent Framework 1.0.
Replaces the single-shot AI call in generate-design with a
writer → reviewer → refiner pipeline.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, cast

from agent_framework import Agent, Message
from agent_framework.foundry import FoundryChatClient
from agent_framework.orchestrations import SequentialBuilder
from azure.identity import ClientSecretCredential

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


_WRITER_INSTRUCTIONS = """You are an institutional ERP design architect.
Given a domain graph with workflows, generate a complete ERP design spec as JSON.

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
        {
          "key": "string",
          "label": "string",
          "type": "text|number|badge|date",
          "badge_values": ["string"]
        }
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
- Fields must come from the actual workflow schema fields provided
- Actions must come from the workflow states
- stats: exactly 4 KPI cards per module with realistic institutional values
- table_columns: 4-6 columns, use badge type for status columns
- Return ONLY the JSON, no markdown, no explanation
"""

_REVIEWER_INSTRUCTIONS = """You are a senior ERP architect reviewer.
You will receive a JSON ERP design spec. Your job is to:

1. Check every module has exactly 4 stats entries
2. Check every module has 4-6 table_columns
3. Check every module has at least 2 actions
4. Check badge-type columns have badge_values populated
5. Check all nav_position values are unique and sequential
6. Check no module is missing required fields: id, domain_id, label, color, primary_entity
7. Check relationships reference valid module ids

If the spec is valid, respond with:
{"status": "approved", "spec": <the original spec unchanged>}

If there are issues, respond with:
{"status": "revised", "spec": <corrected spec with all issues fixed>, "changes": ["list of what was fixed"]}

Return ONLY valid JSON, no markdown.
"""


def _build_prompt(context: dict[str, Any]) -> str:
    """Build the initial prompt from the architecture context."""
    system_name = context.get("system_name", "Institutional ERP")
    domains = context.get("domains", [])
    integrations = context.get("integrations", [])
    workflow_schemas = context.get("workflow_schemas", [])

    domain_lines = "\n".join(
        f"  - {d['id']}: {d.get('label', d['id'])}"
        for d in domains
    )
    schema_lines = "\n".join(
        f"  - Domain '{ws['domain_id']}' ({ws['domain_label']}): "
        f"states={ws['states'][:5]}, "
        f"fields={[f['name'] for f in ws.get('schema_fields', [])]}"
        for ws in workflow_schemas
    )
    integration_lines = "\n".join(
        f"  - {i.get('from', '?')} → {i.get('to', '?')} on {i.get('trigger_event', '?')}"
        for i in integrations
    )

    return (
        f"Generate an ERP design spec for: {system_name}\n\n"
        f"Domains:\n{domain_lines or '  (none)'}\n\n"
        f"Workflow Schemas:\n{schema_lines or '  (none)'}\n\n"
        f"Integrations:\n{integration_lines or '  (none)'}"
    )


def _parse_json_from_message(text: str) -> dict | None:
    """Safely parse JSON, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _fallback_spec(context: dict[str, Any]) -> dict[str, Any]:
    """Returns a minimal valid spec when agents fail."""
    domains = context.get("domains", [])
    modules = [
        {
            "id": d["id"],
            "domain_id": d["id"],
            "label": d.get("label", d["id"]),
            "description": f"{d.get('label', d['id'])} management",
            "icon": "layers",
            "color": "#3b82f6",
            "primary_entity": d.get("label", d["id"]),
            "fields": [
                {"name": "name", "type": "string", "label": "Name"},
                {"name": "status", "type": "string", "label": "Status"},
            ],
            "actions": ["Submit", "Approve", "Reject"],
            "nav_position": i + 1,
            "stats": [
                {"label": "Total", "value": "—", "trend": "flat"},
                {"label": "Active", "value": "—", "trend": "flat"},
                {"label": "Pending", "value": "—", "trend": "flat"},
                {"label": "Completed", "value": "—", "trend": "flat"},
            ],
            "table_columns": [
                {"key": "name", "label": "Name", "type": "text"},
                {
                    "key": "status",
                    "label": "Status",
                    "type": "badge",
                    "badge_values": ["Active", "Pending", "Completed", "Rejected"],
                },
                {"key": "created_at", "label": "Created", "type": "date"},
            ],
        }
        for i, d in enumerate(domains[:8])
    ]
    return {
        "system_name": context.get("system_name", "Institutional ERP"),
        "modules": modules,
        "relationships": [],
        "nav_groups": [{"label": "Modules", "module_ids": [m["id"] for m in modules]}],
        "layout": "sidebar_nav",
        "rationale": "Fallback spec — configure Azure credentials for full multi-agent generation.",
    }


class ERPAgentEvaluator:
    """
    Multi-agent ERP design spec generator using Microsoft Agent Framework 1.0.
    Writer generates the spec, Reviewer validates and corrects it.
    """

    def __init__(self) -> None:
        self._client: FoundryChatClient | None = None
        self._init_client()

    def _init_client(self) -> None:
        try:
            credential = ClientSecretCredential(
                tenant_id=settings.azure_tenant_id,
                client_id=settings.azure_client_id,
                client_secret=settings.azure_client_secret,
            )
            self._client = FoundryChatClient(
                project_endpoint="https://orquestra-agent-resource.services.ai.azure.com/api/projects/orquestra-agent",
                credential=credential,
            )
            logger.info("Microsoft Agent Framework client initialized")
        except Exception as e:
            logger.warning("Agent Framework client init failed: %s", e)
            self._client = None

    async def generate(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Run writer → reviewer pipeline to generate and validate a design spec.
        Falls back to deterministic spec if agents are unavailable.
        """
        if not self._client:
            logger.warning("No Agent Framework client — using fallback spec")
            return {
                "spec": _fallback_spec(context),
                "provider": "fallback",
                "reviewer_changes": [],
            }

        prompt = _build_prompt(context)

        try:
            writer = Agent(
                client=self._client,
                instructions=_WRITER_INSTRUCTIONS,
                name="erp_writer",
            )
            reviewer = Agent(
                client=self._client,
                instructions=_REVIEWER_INSTRUCTIONS,
                name="erp_reviewer",
            )

            workflow = SequentialBuilder(
                participants=[writer, reviewer]
            ).build()

            outputs: list[list[Message]] = []
            async for event in workflow.run(prompt, stream=True):
                if event.type == "output":
                    outputs.append(cast(list[Message], event.data))

            if not outputs:
                raise ValueError("No output from agent workflow")

            # Reviewer is last — its output is the final validated spec
            reviewer_messages = outputs[-1]
            reviewer_text = next(
                (m.text for m in reviewer_messages if m.text),
                None,
            )

            if not reviewer_text:
                raise ValueError("Reviewer produced no text output")

            reviewer_result = _parse_json_from_message(reviewer_text)

            if not reviewer_result:
                raise ValueError("Reviewer output was not valid JSON")

            # Extract the spec from reviewer result
            if reviewer_result.get("status") in ("approved", "revised"):
                spec = reviewer_result.get("spec")
                changes = reviewer_result.get("changes", [])
            else:
                # Reviewer returned the spec directly
                spec = reviewer_result
                changes = []

            if not spec or "modules" not in spec:
                raise ValueError("No valid spec in reviewer output")

            return {
                "spec": spec,
                "provider": "agent_framework",
                "reviewer_status": reviewer_result.get("status", "unknown"),
                "reviewer_changes": changes,
            }

        except Exception as exc:
            logger.warning(
                "Agent Framework pipeline failed, using fallback: %s", exc
            )
            return {
                "spec": _fallback_spec(context),
                "provider": "fallback",
                "reviewer_changes": [],
                "error": str(exc),
            }


# Module-level singleton
_evaluator: ERPAgentEvaluator | None = None


def get_erp_agent_evaluator() -> ERPAgentEvaluator:
    global _evaluator
    if _evaluator is None:
        _evaluator = ERPAgentEvaluator()
    return _evaluator