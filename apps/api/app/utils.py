"""Utility helpers for prototype."""
import json
from typing import Any


def safe_json_loads(s: str | None) -> dict:
    if not s:
        return {}
    try:
        return json.loads(s) if isinstance(s, str) else s
    except (json.JSONDecodeError, TypeError):
        return {}


def safe_json_dumps(obj: Any) -> str:
    if obj is None:
        return "{}"
    if isinstance(obj, str):
        return obj
    try:
        return json.dumps(obj)
    except (TypeError, ValueError):
        return "{}"


def validate_schema_fields(data: dict[str, Any], fields: list[dict]) -> list[str]:
    """Validate *data* against a workflow schema field list.

    Returns a list of human-readable error strings (empty = valid).
    Used by both WorkflowEngine (engine-side) and the runtime API (request-side)
    so the rules are applied consistently in both paths.
    """
    errors: list[str] = []
    for field_def in fields:
        field_name = field_def["name"]
        field_type = field_def.get("type", "string")
        required = field_def.get("required", False)
        value = data.get(field_name)

        if required and value is None:
            errors.append(f"Missing required field: {field_name}")
            continue

        if value is None:
            continue

        if field_type == "number" and not isinstance(value, (int, float)):
            errors.append(f"Field '{field_name}' must be a number")
        elif field_type == "string" and not isinstance(value, str):
            errors.append(f"Field '{field_name}' must be a string")
        elif field_type == "boolean" and not isinstance(value, bool):
            errors.append(f"Field '{field_name}' must be a boolean")

        if isinstance(value, (int, float)):
            if field_def.get("min") is not None and value < field_def["min"]:
                errors.append(f"Field '{field_name}' below minimum {field_def['min']}")
            if field_def.get("max") is not None and value > field_def["max"]:
                errors.append(f"Field '{field_name}' above maximum {field_def['max']}")

        if field_def.get("enum") and value not in field_def["enum"]:
            errors.append(f"Field '{field_name}' must be one of {field_def['enum']}")

    return errors

