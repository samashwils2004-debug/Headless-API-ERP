"""ERP composition function schema for Gemini/Groq function calling (Mode B)."""

ERP_COMPOSITION_SCHEMA = {
    "name": "compose_erp_architecture",
    "description": (
        "Compose or modify an institutional ERP domain structure. "
        "Structural description only — no execution logic, no workflow state machines."
    ),
    "parameters": {
        "type": "object",
        "required": ["operation", "rationale"],
        "properties": {
            "operation": {
                "type": "string",
                "enum": [
                    "create_system",
                    "add_domain",
                    "add_module_to_domain",
                    "add_integration",
                    "remove_domain",
                    "update_domain",
                    "link_workflow",
                    "link_template",
                ],
            },
            "domain": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9_]*$",
                        "description": "Lowercase snake_case identifier e.g. 'admissions'",
                    },
                    "label": {"type": "string", "maxLength": 60},
                    "icon": {"type": "string"},
                    "color": {
                        "type": "string",
                        "pattern": "^#[0-9a-fA-F]{6}$",
                        "description": "Hex color code for the domain card",
                    },
                    "modules": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "label": {"type": "string"},
                                "metric_type": {
                                    "type": "string",
                                    "enum": [
                                        "count", "percentage", "duration",
                                        "currency", "boolean", "list",
                                    ],
                                },
                                "visualization_hint": {
                                    "type": "string",
                                    "enum": [
                                        "card", "chart_line", "chart_bar",
                                        "chart_donut", "table", "calendar",
                                        "activity_feed", "stat_counter",
                                    ],
                                },
                            },
                        },
                    },
                    "requires_workflow": {"type": "boolean"},
                },
            },
            "integration": {
                "type": "object",
                "properties": {
                    "from_domain": {"type": "string"},
                    "to_domain": {"type": "string"},
                    "trigger_event": {
                        "type": "string",
                        "description": "e.g. 'application.accepted'",
                    },
                    "description": {"type": "string"},
                },
            },
            "workflow_link": {
                "type": "object",
                "properties": {
                    "domain_id": {"type": "string"},
                    "workflow_id": {"type": "string"},
                    "workflow_name": {"type": "string"},
                },
            },
            "rationale": {
                "type": "string",
                "description": "Plain English explanation of what was added/changed and why.",
            },
        },
    },
}

ERP_SYSTEM_PROMPT = """You are an institutional ERP architecture assistant for Orquestra.
Modify the domain graph structure based on the user's intent.

Rules:
- Domains represent departments (Admissions, Finance, HR, Scholarship, Academics...)
- Modules are capabilities within a domain (e.g., Application Tracking, Fee Processing)
- Integrations are data flows triggered by workflow events between domains
- NEVER create workflow execution logic or state machines — only domain structure
- NEVER suggest deploying or compiling — one structural change at a time
- Output ONLY via the compose_erp_architecture function call"""
