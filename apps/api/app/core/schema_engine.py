"""Schema validation for applicant/application payloads and AI blueprint structures."""
from __future__ import annotations

from jsonschema import Draft202012Validator

APPLICANT_SCHEMA = {
    "type": "object",
    "required": ["name", "email"],
    "additionalProperties": False,
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "email": {"type": "string", "format": "email"},
        "phone": {"type": "string"},
    },
}

APPLICATION_SCHEMA = {
    "type": "object",
    "required": ["workflow_name", "applicant_data", "application_data"],
    "additionalProperties": False,
    "properties": {
        "workflow_name": {"type": "string", "minLength": 1},
        "applicant_data": APPLICANT_SCHEMA,
        "application_data": {"type": "object"},
    },
}

BLUEPRINT_SCHEMA = {
    "type": "object",
    "required": ["workflow", "roles", "events", "compliance_tags"],
    "additionalProperties": False,
    "properties": {
        "workflow": {
            "type": "object",
            "required": ["name", "initial_state", "states"],
            "properties": {
                "name": {"type": "string"},
                "initial_state": {"type": "string"},
                "states": {"type": "object", "minProperties": 2},
            },
        },
        "roles": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "permissions"],
                "properties": {
                    "name": {"type": "string"},
                    "permissions": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "events": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["type", "version"],
                "properties": {
                    "type": {"type": "string"},
                    "version": {"type": "string"},
                },
            },
        },
        "compliance_tags": {"type": "array", "items": {"type": "string"}},
    },
}


class SchemaEngine:
    def __init__(self) -> None:
        self._application_validator = Draft202012Validator(APPLICATION_SCHEMA)
        self._blueprint_validator = Draft202012Validator(BLUEPRINT_SCHEMA)

    def validate_application(self, payload: dict) -> list[str]:
        errors = self._application_validator.iter_errors(payload)
        return [error.message for error in errors]

    def validate_blueprint(self, payload: dict) -> list[str]:
        errors = self._blueprint_validator.iter_errors(payload)
        return [error.message for error in errors]

