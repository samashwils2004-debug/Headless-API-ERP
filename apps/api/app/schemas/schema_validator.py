"""JSON Schema validation utility for Orquestra workflow blueprints.

Usage:
    from app.schemas.schema_validator import validate_workflow_blueprint

    is_valid, errors = validate_workflow_blueprint(blueprint_dict)
    if not is_valid:
        raise ValueError(errors)

Note: jsonschema is an optional dependency. If it is not installed, validation
is skipped and (True, []) is returned so that the application can still start.
Install it with: pip install jsonschema
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

try:
    import jsonschema
    from jsonschema import Draft7Validator
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

_SCHEMA_DIR = Path(__file__).parent


def load_schema(schema_name: str) -> dict:
    """Load a JSON Schema file from the schemas directory by name (without .json).

    Args:
        schema_name: File stem, e.g. "workflow_schema"

    Returns:
        Parsed schema dict.

    Raises:
        FileNotFoundError: If the schema file does not exist.
    """
    schema_path = _SCHEMA_DIR / f"{schema_name}.json"
    with open(schema_path, encoding="utf-8") as f:
        return json.load(f)


def validate_workflow_blueprint(blueprint: dict[str, Any]) -> tuple[bool, list[str]]:
    """Validate a workflow blueprint dict against the canonical JSON Schema.

    This is a lightweight complement to the 4-stage AI validation in
    BlueprintGenerator.validate(). Use it for fast structural checks on
    externally-provided blueprints (e.g. manual workflow creation, template
    deployment) before they touch the state machine engine.

    Args:
        blueprint: The full blueprint dict (must include 'workflow', 'roles',
                   'events', 'compliance_tags' keys).

    Returns:
        (is_valid, errors) — errors is an empty list when is_valid is True.
        If jsonschema is not installed, returns (True, []) to avoid a hard
        dependency in environments that do not use this validator.
    """
    if not HAS_JSONSCHEMA:
        return True, []

    try:
        schema = load_schema("workflow_schema")
        validator = Draft7Validator(schema)
        errors = sorted(validator.iter_errors(blueprint), key=lambda e: list(e.path))
        if errors:
            return False, [_format_error(e) for e in errors]
        return True, []
    except FileNotFoundError as exc:
        return False, [f"Schema file not found: {exc}"]
    except Exception as exc:  # pragma: no cover — unexpected failures
        return False, [f"Validation error: {exc}"]


def _format_error(error: "jsonschema.ValidationError") -> str:
    """Convert a jsonschema ValidationError into a human-readable string."""
    path = " -> ".join(str(p) for p in error.absolute_path) if error.absolute_path else "root"
    return f"{path}: {error.message}"
