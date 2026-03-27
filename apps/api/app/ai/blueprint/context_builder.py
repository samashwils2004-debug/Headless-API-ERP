"""
Project-aware context builder for Mode A blueprint generation.
Reads existing workflows in the project and enriches the AI prompt
so each new workflow maintains field/role/event consistency.
"""
from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.models import Workflow

_OPERATORS = [">=", "<=", "!=", "==", ">", "<"]
_NOISE = {"true", "false", "null", "none", "and", "or", "not"}


def _extract_fields(definition: dict) -> set[str]:
    fields: set[str] = set()
    for state_data in definition.get("states", {}).values():
        for trans in state_data.get("transitions", []):
            condition = trans.get("condition")
            if not condition or not isinstance(condition, str):
                continue
            parts = re.split(r"\band\b|\bor\b", condition, flags=re.IGNORECASE)
            for part in parts:
                part = part.strip()
                for op in _OPERATORS:
                    if op in part:
                        field = part.split(op)[0].strip()
                        if "." in field:
                            field = field.split(".")[-1]
                        if field and field.replace("_", "").isalpha() and field.lower() not in _NOISE:
                            fields.add(field)
                        break
    return fields


def _extract_roles(definition: dict) -> set[str]:
    roles: set[str] = set()
    for r in definition.get("roles", []):
        if isinstance(r, dict):
            name = r.get("name") or r.get("id")
            if name:
                roles.add(name)
    return roles


def _extract_events(definition: dict) -> list[str]:
    events: list[str] = []
    for state_data in definition.get("states", {}).values():
        for trans in state_data.get("transitions", []):
            event = trans.get("emit_event")
            if event and event not in events:
                events.append(event)
    return events


def _extract_schema_fields(definition: dict) -> list[str]:
    schema = definition.get("schema", {})
    return [f["name"] for f in schema.get("fields", []) if f.get("name")]


class BlueprintContextBuilder:
    def build(self, db: Session, institution_id: str, project_id: str) -> dict[str, Any]:
        existing = (
            db.query(Workflow)
            .filter(
                Workflow.institution_id == institution_id,
                Workflow.project_id == project_id,
                Workflow.deployed == True,  # noqa: E712
            )
            .order_by(Workflow.name.asc(), Workflow.version.desc())
            .all()
        )

        if not existing:
            return {
                "existing_workflows": [],
                "known_fields": [],
                "known_schema_fields": [],
                "known_roles": [],
                "known_events": [],
                "workflow_count": 0,
            }

        # Deduplicate by name (latest version only)
        seen: set[str] = set()
        unique: list[Workflow] = []
        for wf in existing:
            if wf.name not in seen:
                seen.add(wf.name)
                unique.append(wf)

        summaries: list[dict] = []
        all_fields: set[str] = set()
        all_schema_fields: set[str] = set()
        all_roles: set[str] = set()
        all_events: list[str] = []

        for wf in unique:
            defn = wf.definition or {}
            states = list(defn.get("states", {}).keys())
            fields = _extract_fields(defn)
            schema_fields = _extract_schema_fields(defn)
            roles = _extract_roles(defn)
            events = _extract_events(defn)

            terminal_states = [
                name for name, data in defn.get("states", {}).items()
                if data.get("type") == "terminal" or not data.get("transitions")
            ]

            all_fields.update(fields)
            all_schema_fields.update(schema_fields)
            all_roles.update(roles)
            for e in events:
                if e not in all_events:
                    all_events.append(e)

            summaries.append({
                "name": wf.name,
                "version": wf.version,
                "states": states[:8],
                "terminal_states": terminal_states,
                "fields_used": sorted(fields),
                "schema_fields": schema_fields,
                "events": events[:6],
                "roles": sorted(roles),
            })

        return {
            "existing_workflows": summaries,
            "known_fields": sorted(all_fields),
            "known_schema_fields": sorted(all_schema_fields),
            "known_roles": sorted(all_roles),
            "known_events": all_events,
            "workflow_count": len(unique),
        }

    def enrich_prompt(self, prompt: str, context: dict[str, Any]) -> str:
        existing = context.get("existing_workflows", [])
        if not existing:
            return prompt

        lines: list[str] = ["PROJECT CONTEXT — existing deployed workflows:"]

        for wf in existing:
            states_str = ", ".join(wf["states"])
            fields_str = ", ".join(wf["fields_used"]) if wf["fields_used"] else "none"
            schema_str = ", ".join(wf.get("schema_fields", [])) if wf.get("schema_fields") else "none"
            terminals_str = ", ".join(wf.get("terminal_states", []))
            lines.append(
                f"  - {wf['name']} v{wf['version']}: "
                f"states=[{states_str}], "
                f"condition_fields=[{fields_str}], "
                f"schema_fields=[{schema_str}], "
                f"terminal_states=[{terminals_str}]"
            )

        known_schema = context.get("known_schema_fields", [])
        known_fields = context.get("known_fields", [])
        combined = sorted(set(known_schema) | set(known_fields))
        if combined:
            lines.append(f"\nFields already defined across workflows: {', '.join(combined)}")
            lines.append(
                "IMPORTANT: Reuse these exact field names where they apply. "
                "Do not invent synonyms."
            )

        known_roles = context.get("known_roles", [])
        if known_roles:
            lines.append(f"Existing roles: {', '.join(known_roles)}")
            lines.append("Reuse existing roles where applicable.")

        known_events = context.get("known_events", [])
        if known_events:
            lines.append(f"Existing events: {', '.join(known_events[:8])}")
            lines.append("Suggest integration events that reference existing terminal states where relevant.")

        lines.append(f"\n--- NEW WORKFLOW REQUEST ---\n{prompt}")
        lines.append(
            "\nInclude a 'schema' section with all fields referenced in conditions, "
            "with type, required, and validation rules."
        )
        return "\n".join(lines)
