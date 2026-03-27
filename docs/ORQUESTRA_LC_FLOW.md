# Orquestra — Functional Prototype Plan (v2)

## Vision anchor

Orquestra is headless, API-first infrastructure that lets developers define, deploy, and execute institutional workflows as versioned, deterministic state machines. AI generates infrastructure, not UI. Workflows are immutable once deployed. Every transition emits structured events. This plan does not alter any of these invariants.

---

## Prototype flow

```
Create Project → Select Project → Build Workflows (with embedded schema + AI)
  → Architect (link workflows) → Compile → Versioned API Key → Runtime API
```

**What the developer experiences:**

1. Logs in, creates or selects a project.
2. Builds one or more workflows inside that project — either manually on the React Flow canvas or via AI generation. Each workflow includes its own application schema (the fields that applicant data must contain).
3. Deploys each workflow when satisfied (deployed = immutable).
4. Opens the Architect page, sees all deployed workflows in the project, selects which ones to include, clicks Compile.
5. Backend creates an immutable architecture version, links the selected workflows, issues a versioned API key and webhook secret. Both shown once, then masked.
6. Developer copies the key into their institution backend's environment variables.
7. Their backend calls the Orquestra runtime API to create applications, fetch status, and receive events.

---

## Part 1: Database changes

All changes to `apps/api/app/models/__init__.py`.

### 1a. Add `ai_prompt` to Workflow

Store the original AI prompt on the workflow itself (not just on BlueprintProposal) so the workflow builder UI can show "Generated from: ..." and enable prompt-based regeneration.

```python
# Add after: is_ai_generated = Column(Boolean, default=False, nullable=False)
ai_prompt = Column(Text, nullable=True)
```

Also update `routes/ai.py` deploy_blueprint to populate this:

```python
workflow = Workflow(
    ...
    is_ai_generated=True,
    ai_prompt=proposal.prompt,
    ...
)
```

### 1b. Add ArchWorkflow junction table

Links architecture versions to their constituent workflows at compile time. Stores the exact workflow version that was pinned — if the developer later creates workflow v2, the compiled architecture still references v1.

```python
class ArchWorkflow(Base):
    """Junction: links an architecture version to its constituent workflows."""
    __tablename__ = "arch_workflows"
    __table_args__ = (
        UniqueConstraint(
            "architecture_version_id",
            "workflow_id",
            name="uq_arch_version_workflow",
        ),
        Index("ix_arch_workflows_version", "architecture_version_id"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    architecture_version_id = Column(
        String, ForeignKey("architecture_versions.id"),
        nullable=False, index=True,
    )
    workflow_id = Column(
        String, ForeignKey("workflows.id"),
        nullable=False, index=True,
    )
    workflow_version = Column(Integer, nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)

    architecture_version = relationship("ArchitectureVersion", backref="linked_workflows")
    workflow = relationship("Workflow")
```

### 1c. Add columns to APIKey

Link API keys to architecture versions and projects. No `environment` field — see Part 3 for reasoning.

```python
# Add to existing APIKey class:
project_id = Column(
    String, ForeignKey("projects.id"),
    nullable=True, index=True,
)
architecture_version_id = Column(
    String, ForeignKey("architecture_versions.id"),
    nullable=True, index=True,
)
webhook_secret_hash = Column(String(64), nullable=True)
webhook_secret_prefix = Column(String(24), nullable=True)

# Add relationships:
architecture_version = relationship("ArchitectureVersion", backref="api_key")
project = relationship("Project", backref="api_keys")
```

### 1d. Migration

```bash
cd apps/api
alembic revision --autogenerate -m "add arch_workflows junction, link api_keys to architecture, add ai_prompt"
# Review the generated file
alembic upgrade head
```

If the database was previously created by `init_db()` (via `Base.metadata.create_all`), stamp Alembic to sync tracking before generating:

```bash
alembic stamp head
# Then make your model changes
# Then generate the migration
```

---

## Part 2: Schema embedded in workflow definition

### Philosophy

The blueprint generator (Mode A) currently produces a full blueprint with workflow + roles + events + schema as a separate artifact. This plan embeds schema directly inside the workflow definition JSON. The blueprint section does not become a separate page — its logic lives inside the workflow creation flow.

### Schema structure inside workflow definition

Every workflow's `definition` JSON gains an optional `schema` key:

```json
{
  "initial_state": "submitted",
  "states": {
    "submitted": {
      "type": "initial",
      "transitions": [
        {
          "to": "auto_accepted",
          "condition": "percentage >= 90",
          "emit_event": "application.auto_accepted"
        },
        {
          "to": "under_review",
          "condition": "percentage < 90",
          "emit_event": "application.under_review"
        }
      ]
    },
    "auto_accepted": { "type": "terminal", "transitions": [] },
    "under_review": {
      "type": "intermediate",
      "transitions": [
        {
          "to": "accepted",
          "condition": "committee_decision == approved",
          "emit_event": "application.accepted"
        },
        {
          "to": "rejected",
          "condition": "committee_decision == rejected",
          "emit_event": "application.rejected"
        }
      ]
    },
    "accepted": { "type": "terminal", "transitions": [] },
    "rejected": { "type": "terminal", "transitions": [] }
  },
  "schema": {
    "fields": [
      { "name": "name", "type": "string", "required": true },
      {
        "name": "email",
        "type": "string",
        "required": true,
        "format": "email"
      },
      {
        "name": "percentage",
        "type": "number",
        "required": true,
        "min": 0,
        "max": 100
      },
      {
        "name": "program",
        "type": "string",
        "required": true,
        "enum": ["btech-cse", "btech-ece", "mba"]
      },
      {
        "name": "sat_score",
        "type": "number",
        "required": false,
        "min": 400,
        "max": 1600
      }
    ]
  },
  "roles": [
    {
      "id": "admissions_officer",
      "name": "Admissions Officer",
      "permissions": ["application:read", "application:approve"]
    },
    {
      "id": "reviewer",
      "name": "Reviewer",
      "permissions": ["application:read", "application:recommend"]
    }
  ],
  "events": [
    {
      "type": "application.auto_accepted",
      "emit_on": "transition to auto_accepted"
    },
    {
      "type": "application.under_review",
      "emit_on": "transition to under_review"
    },
    { "type": "application.accepted", "emit_on": "transition to accepted" },
    { "type": "application.rejected", "emit_on": "transition to rejected" }
  ]
}
```

The schema, roles, and events travel WITH the workflow definition. When the workflow is version-pinned to an architecture, the schema is pinned too. No separate schema versioning needed. No separate tables needed. The `definition` column already stores JSON/JSONB — it just gains more structure.

### How the schema gets created

**Path A — Manual build on canvas:**

Developer builds states and transitions on the React Flow canvas. When they write a condition like `percentage >= 90`, the frontend auto-detects `percentage` as a field and adds it to the schema editor as type `number`. The schema editor lives in the right-side detail panel (visible when nothing is selected on the canvas). The developer sees auto-detected fields and can add, remove, or modify them — add validation rules, mark fields as required, set enums.

Auto-inference logic (frontend-side, simple regex):

```typescript
function inferFieldsFromConditions(
  states: Record<string, StateDefinition>,
): SchemaField[] {
  const fields = new Map<string, SchemaField>();
  const numericOps = [">=", "<=", ">", "<"];

  for (const state of Object.values(states)) {
    for (const transition of state.transitions || []) {
      if (!transition.condition) continue;

      // Split on and/or
      const parts = transition.condition.split(/\band\b|\bor\b/i);
      for (const part of parts) {
        for (const op of [">=", "<=", "!=", "==", ">", "<"]) {
          if (part.includes(op)) {
            const field = part.split(op)[0].trim();
            if (
              field &&
              !["true", "false", "null"].includes(field.toLowerCase())
            ) {
              const isNumeric = numericOps.includes(op);
              if (!fields.has(field)) {
                fields.set(field, {
                  name: field,
                  type: isNumeric ? "number" : "string",
                  required: true,
                });
              }
            }
            break;
          }
        }
      }
    }
  }
  return Array.from(fields.values());
}
```

**Path B — AI generation:**

Developer types a natural language prompt. The AI generates the complete definition including schema, roles, and events. The canvas populates with states and transitions. The schema editor populates with the AI-suggested fields. Roles appear in the collapsible roles section. Events appear in the bottom bar. Everything is editable.

The AI prompt template (in `context_builder.py`) instructs the model to include schema:

```
Generate a complete workflow definition including:
- states and transitions with conditions
- schema: the application fields referenced in conditions, with types and validation
- roles: who can act on each state
- events: emitted on each transition
```

The provider_router's system prompt is updated to include schema in the expected output format:

```json
{
  "workflow": {
    "name": "string",
    "initial_state": "string",
    "states": { ... },
    "schema": {
      "fields": [
        {"name": "string", "type": "string|number|boolean", "required": true, "min": null, "max": null, "enum": null, "format": null}
      ]
    }
  },
  "roles": [...],
  "events": [...]
}
```

### Schema validation at runtime

When an external application is submitted via the runtime API, the workflow engine validates incoming `applicant_data` against the embedded schema BEFORE executing transitions.

Add to `WorkflowEngine.execute_until_wait`, before the transition loop:

```python
# Validate applicant data against embedded schema
schema = definition.get("schema")
if schema and schema.get("fields"):
    validation_errors = []
    for field_def in schema["fields"]:
        field_name = field_def["name"]
        field_type = field_def.get("type", "string")
        required = field_def.get("required", False)
        value = application.applicant_data.get(field_name)

        if required and value is None:
            validation_errors.append(f"Missing required field: {field_name}")
            continue

        if value is not None:
            if field_type == "number" and not isinstance(value, (int, float)):
                validation_errors.append(f"Field {field_name} must be a number")
            elif field_type == "string" and not isinstance(value, str):
                validation_errors.append(f"Field {field_name} must be a string")

            if field_def.get("min") is not None and isinstance(value, (int, float)):
                if value < field_def["min"]:
                    validation_errors.append(f"Field {field_name} below minimum {field_def['min']}")
            if field_def.get("max") is not None and isinstance(value, (int, float)):
                if value > field_def["max"]:
                    validation_errors.append(f"Field {field_name} above maximum {field_def['max']}")
            if field_def.get("enum") and value not in field_def["enum"]:
                validation_errors.append(f"Field {field_name} must be one of {field_def['enum']}")

    if validation_errors:
        raise WorkflowExecutionError(f"Application data validation failed: {validation_errors}")
```

This means: if a developer defines `percentage` as type `number`, required, min 0, max 100, and an institution backend sends `{"percentage": "ninety-two"}`, the runtime API returns a 422 with a clear error. The schema enforces data quality at the infrastructure level.

### What happens to BlueprintProposal

The `BlueprintProposal` model and the `/api/ai/blueprints/compile` + `/api/ai/blueprints/{id}/deploy` routes remain as-is. They still work. But the primary user-facing path for workflow creation is now the workflow canvas with embedded schema — not the separate blueprint page. The blueprint routes become a backend utility that the workflow section calls internally, not a standalone page the developer navigates to.

The frontend change: the "Generate with AI" button on the workflow canvas calls the existing blueprint compile endpoint, receives the result, unpacks the workflow definition (including schema), and populates the canvas. The developer never sees a "Blueprint" page — they see it as "AI generated my workflow."

---

## Part 3: No test/production environment split

### Reasoning

The test/production distinction in products like Stripe exists because production actions have real-world consequences — real charges, real emails. In Orquestra, the workflow engine is deterministic and produces identical output regardless of environment. There are no external side effects to protect against at the infrastructure level (sending acceptance letters is the institution's responsibility via webhooks, not Orquestra's).

What Orquestra already has is the correct safety boundary: **draft vs deployed workflow status**. A draft workflow can be edited and tested. A deployed workflow is immutable and can be compiled into an architecture. That IS the test/production split — it just operates at the workflow level, not the environment level.

### What this means for API keys

Keys do not carry `test` or `live` prefixes. The format is:

```
sk_erp_v{version}_{32_hex_chars}
```

Example: `sk_erp_v1_a8f3c2d1e9b4f7a2c3d1e9b4f7a2c3d1`

The version number in the key tells the developer which architecture version they're running against. That's the meaningful differentiation — not test vs production.

### What this means for the database

The `environment` column added to `APIKey` in Part 1c is removed. The key format in `api_key_utils.py` drops the environment prefix:

```python
def generate_api_key(version_number: int) -> dict:
    random_part = secrets.token_hex(16)
    raw_key = f"sk_erp_v{version_number}_{random_part}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:16] + "..."
    return {"raw_key": raw_key, "key_hash": key_hash, "key_prefix": key_prefix}
```

### If you need environment separation later

Add it when there's a real reason — for example, when you build webhook delivery and want test webhooks to go to a sandbox URL. At that point, add the `environment` column, the key prefix, and a toggle in the console. But don't build it now.

---

## Part 4: API key re-versioning on schema or workflow changes

### The invariant

Deployed workflows are immutable. This is a core invariant and this plan does not change it.

If a developer needs to change a workflow's schema (add a field, change a validation rule, modify a condition), they cannot edit the deployed workflow. They must:

1. Create a new workflow version (the UI can pre-fill from the existing definition)
2. Modify the schema/conditions in the new version
3. Deploy the new version
4. Recompile the architecture (selecting the new workflow version)
5. Receive a new versioned API key (`sk_erp_v2_...`)

### The flow in detail

```
Workflow "Admissions" v1 (deployed, immutable)
  └─ Compiled into Architecture v1 → API Key sk_erp_v1_...

Developer realizes they need a "phone" field in the schema.

Workflow "Admissions" v2 (draft, editable)
  └─ Developer adds "phone" field to schema
  └─ Deploys v2 (now immutable)

Architect page: developer sees both v1 and v2 of "Admissions"
  └─ Selects v2 for the new compilation
  └─ Clicks Compile
  └─ Architecture v2 created → API Key sk_erp_v2_...

Old key (v1) still works → routes to v1 schema (no phone field)
New key (v2) works → routes to v2 schema (phone field required)
```

The developer switches their backend's environment variable from the v1 key to the v2 key when they're ready to migrate. No downtime. No breaking changes for existing integrations.

### Frontend implication

The workflow list page should show all versions of a workflow grouped by name:

```
Admissions
  └─ v2 (deployed) — current
  └─ v1 (deployed) — compiled in Architecture v1

Fee Payment
  └─ v1 (deployed) — compiled in Architecture v1
```

The "Edit" button on a deployed workflow should say "Create New Version" and clone the definition into a draft v(n+1). This already aligns with your existing `create_workflow` route which auto-increments the version.

---

## Part 5: Event stream positioning

### What events are and who they serve

Events are structured records emitted on every significant action: workflow deployments, architecture compilations, application submissions, state transitions. They are append-only and immutable.

Events serve two purposes in the prototype:

**Purpose 1: Developer observability (console event stream page)**

The event stream page in the console shows the developer that their infrastructure is alive and responding. Without it, the headless API is invisible — the developer deploys a workflow and has no feedback. The event stream is the feedback loop.

Critical events the developer sees:

- `workflow.deployed` — confirms their workflow is live
- `architecture.compiled` — confirms the compile succeeded and key was issued
- `application.submitted` — shows that external applications are coming in
- `workflow.transitioned` — shows that the workflow engine is executing and moving applications between states
- `workflow.execution.slow` — alerts if a transition took too long

For the prototype demo, the event stream is the "wow moment." Developer submits an application via curl → the event appears in the console UI in real time via WebSocket. This proves the system is event-native, not batch-processed.

**Purpose 2: Integration trigger (post-prototype)**

Events are what external systems subscribe to via webhooks. When `application.accepted` fires, the institution's system sends an acceptance email. When `application.submitted` fires, it updates their CRM. For the prototype, this is documented but not built — the events are emitted and stored, but webhook delivery is post-prototype scope.

### How the event stream page fits in the console flow

The event stream page is accessible from the console sidebar as "Events" or "Activity." It is not a step in the prototype flow — it's a parallel observability surface that the developer can check at any time.

```
Console Sidebar:
  Projects        ← Step 1
  Workflows       ← Step 2
  Templates       ← Shortcut to pre-built workflows
  Architect       ← Step 3
  API Keys        ← Step 4 (shown after compile)
  Events          ← Always visible, shows real-time activity
  Docs            ← Integration guide
```

### How events connect to each step

| User action                        | Event emitted           | What the developer sees in event stream                    |
| ---------------------------------- | ----------------------- | ---------------------------------------------------------- |
| Deploys a workflow                 | `workflow.deployed`     | "Undergraduate Admissions v1 deployed"                     |
| Generates blueprint via AI         | `ai.blueprint.deployed` | "AI blueprint deployed as Fee Payment v1"                  |
| Compiles architecture              | `architecture.compiled` | "Architecture v2 compiled, 3 workflows linked, key issued" |
| External app submits application   | `application.submitted` | "New application received, initial state: submitted"       |
| Workflow transitions application   | `workflow.transitioned` | "Application moved from submitted → auto_accepted"         |
| Application reaches terminal state | `application.completed` | "Application completed in state: accepted"                 |

### Event stream UI behavior

The event stream page shows events in reverse chronological order (newest first). Each event row shows: timestamp, event type (color-coded badge), a human-readable summary, and an expandable JSON payload.

Live events appear at the top of the list via WebSocket push — no page refresh needed. A subtle pulse animation or highlight on new events draws attention.

The page should support filtering by event type (workflow events, application events, system events) and by time range. For the prototype, a simple type filter dropdown is sufficient.

### Where the event stream adds demo value

In the 5-minute demo, the event stream page is shown twice:

Minute 3 (after deploying workflows): Switch to the Events page, show `workflow.deployed` events confirming the deployments happened.

Minute 5 (after calling the runtime API): Show the Events page updating in real time as applications are submitted and transitions happen. This is the visual proof that the entire system works end-to-end.

---

## Part 6: AI context-carrying between workflows

### Problem

When a developer creates their first workflow, the AI has no context. When they create their second workflow in the same project, the AI should know about the first one — reusing field names, suggesting integration events, maintaining role consistency.

### Solution

New file: `apps/api/app/ai/blueprint/context_builder.py`

This mirrors the Mode B `prompt_factory.py` pattern: reads existing deployed workflows in the project, extracts field names from conditions, role names, event names, and builds a compact context summary prepended to the AI prompt.

```python
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
                Workflow.deployed == True,
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
            schema_str = ", ".join(wf["schema_fields"]) if wf.get("schema_fields") else "none"
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
```

### Modifications to existing files

**`apps/api/app/routes/ai.py`** — compile endpoint:

```python
# Add import:
from app.ai.blueprint.context_builder import BlueprintContextBuilder

_context_builder = BlueprintContextBuilder()

# In compile_blueprint, before the try block:
project_context = _context_builder.build(db, tenant.institution_id, tenant.project_id)
enriched_prompt = _context_builder.enrich_prompt(body.prompt, project_context)
full_context = {**body.institution_context, **project_context}

# Change the compile call:
raw_blueprint = _generator.compile(enriched_prompt, full_context)
```

**`apps/api/app/ai/provider_router.py`** — system prompt update:

Add to the end of `_build_system_prompt`:

```
- Include a "schema" section in the workflow with fields referenced in conditions
- Each field must have: name, type (string|number|boolean), required (true|false)
- Optionally include: min, max, enum, format for validation
- If existing workflows are described in PROJECT CONTEXT, reuse their field names and role names
- Suggest emit_events that could trigger integrations with existing workflows
```

Update the Gemini model and add response_mime_type:

```python
# In _init_clients:
self._gemini_client = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")

# In _try_gemini, add generation_config:
response = self._gemini_client.generate_content(
    f"{self._build_system_prompt()}\n\nRequirement: {user_content}",
    generation_config={"response_mime_type": "application/json", "temperature": 0.3},
)
```

---

## Part 7: API key generation and compile endpoint

### New file: `apps/api/app/core/api_key_utils.py`

```python
"""API key and webhook secret generation. Keys shown once, only hashes stored."""
import hashlib
import secrets


def generate_api_key(version_number: int) -> dict:
    random_part = secrets.token_hex(16)
    raw_key = f"sk_erp_v{version_number}_{random_part}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:16] + "..."
    return {"raw_key": raw_key, "key_hash": key_hash, "key_prefix": key_prefix}


def generate_webhook_secret() -> dict:
    random_part = secrets.token_hex(16)
    raw_secret = f"whsec_erp_{random_part}"
    secret_hash = hashlib.sha256(raw_secret.encode()).hexdigest()
    secret_prefix = raw_secret[:16] + "..."
    return {"raw_secret": raw_secret, "secret_hash": secret_hash, "secret_prefix": secret_prefix}


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    return hashlib.sha256(raw_key.encode()).hexdigest() == stored_hash
```

### Compile endpoint: `apps/api/app/routes/architect.py`

Your existing `architect.py` is 16KB and already handles Mode B AI composition. The compile endpoint should be added to this file. The compile endpoint:

1. Loads the architecture and validates tenant ownership
2. Validates all selected workflow IDs exist, are deployed, and belong to the project
3. Creates an immutable ArchitectureVersion with a graph_snapshot
4. Creates ArchWorkflow junction records linking the version to specific workflows (with version pinning)
5. Generates API key and webhook secret (hashed, raw shown once)
6. Creates APIKey record linked to the architecture version
7. Emits `architecture.compiled` event
8. Returns raw key and secret in the response (shown once, then masked)

The compile request body:

```python
class CompileRequest(BaseModel):
    workflow_ids: list[str]
    key_name: str = "Default API Key"
```

The compile response:

```python
class CompileResponse(BaseModel):
    architecture_version_id: str
    version_number: int
    workflows_linked: int
    api_key: str              # Raw key — shown once
    api_key_prefix: str       # Masked for future display
    webhook_secret: str       # Raw secret — shown once
    webhook_secret_prefix: str
    message: str
```

Key validation rules in the compile endpoint:

- At least one workflow must be selected
- All workflows must be deployed (not draft)
- All workflows must belong to the same project as the architecture
- Compiling with undeployed workflow returns 400 with clear message
- Compiling with workflow from different project returns 404

---

## Part 8: Runtime API

### New file: `apps/api/app/middleware/api_key_auth.py`

Authenticates external API calls using the versioned key. Not JWT — API key in the Authorization header. Loads the architecture version to determine which workflows are accessible.

Flow:

1. Extract key from `Authorization: Bearer sk_erp_v1_...`
2. Hash it with SHA-256
3. Look up `api_keys WHERE key_hash = ? AND is_active = true`
4. If not found or expired → 401
5. Load ArchWorkflow records for the architecture version → list of accessible workflow IDs
6. Return a `RuntimeAuthContext` with institution_id, project_id, accessible_workflow_ids
7. Update `last_used_at` on the API key

### New file: `apps/api/app/routes/runtime.py`

Three endpoints:

**`POST /api/v1/applications`** — submit a new application

1. Verify workflow_id is in the accessible list (from API key's architecture version)
2. Load the workflow definition
3. Validate `applicant_data` against the embedded schema
4. Create Application record with initial_state
5. Execute workflow via `WorkflowEngine(db).execute_until_wait(application.id)`
6. Emit `application.submitted` and `workflow.transitioned` events
7. Return application_id, current_state

**`GET /api/v1/applications/{id}`** — get application status

**`GET /api/v1/applications`** — list applications with optional workflow_id, state, limit, offset filters

### Router registration in `main.py`

```python
from app.routes.runtime import router as runtime_router
app.include_router(runtime_router, prefix="/api", tags=["Runtime API"])
```

### CSRF exemption for runtime routes

The existing security_middleware checks CSRF for all `/api` POST requests. Runtime API calls come from external backends with no cookies. The current logic passes because it only rejects on cookie-header mismatch (not absence), so no code change is strictly needed. But for clarity, add a skip:

```python
if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path.startswith("/api"):
    if not request.url.path.startswith("/api/v1/"):
        # CSRF check only for console routes, not runtime API
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        if csrf_cookie and csrf_header and csrf_cookie != csrf_header:
            return JSONResponse(status_code=403, content={"detail": "CSRF token mismatch"})
```

---

## Part 9: init_db and Alembic coexistence

The `init_db()` function calls `Base.metadata.create_all()` on every server startup. This works alongside Alembic because SQLAlchemy's `create_all` uses `CREATE TABLE IF NOT EXISTS` — it won't conflict with tables Alembic already created.

However, for clean migration tracking on PostgreSQL, change `init_db()` to only auto-create for SQLite:

```python
def init_db():
    """Initialize database tables."""
    from app import models  # noqa: F401
    settings = get_settings()
    if "sqlite" in settings.database_url:
        Base.metadata.create_all(bind=engine)
        if settings.environment == "development":
            safe_url = make_url(settings.database_url).render_as_string(hide_password=True)
            print(f"Database initialized (SQLite): {safe_url}")
    else:
        if settings.environment == "development":
            safe_url = make_url(settings.database_url).render_as_string(hide_password=True)
            print(f"Database connected (PostgreSQL — managed by Alembic): {safe_url}")
```

PostgreSQL tables are managed exclusively by `alembic upgrade head`. SQLite auto-creates for local dev convenience. This is the positioning you described: PostgreSQL as primary, SQLite as optional local bootstrap.

---

## Part 10: Service registry — shared component instances

### Problem

Across the codebase, every file that needs EventEngine, BlueprintGenerator, or ProviderRouter creates its own instance. The most damaging case is EventEngine, which opens a new Redis connection on every instantiation. In `workflow_engine.py`, this happens inside the transition loop — 3 automatic transitions means 3 new Redis connections opened and never explicitly closed. The compile endpoint emits events. The runtime endpoint emits 2-3 events per submission. During a demo with 5 rapid submissions, that's 15+ Redis connections abandoned.

The same pattern appears with BlueprintGenerator (creates a new ProviderRouter internally) and will appear with the new ContextBuilder. Each new route or service added to the plan compounds the problem.

### Solution: `apps/api/app/services.py`

One file that creates shared instances once. Every other file imports from it instead of constructing its own. Expensive resources (Redis connections, AI clients) are singletons. Cheap resources (database sessions) remain per-request.

```python
"""
Shared service instances — created once, imported everywhere.

No file should instantiate EventEngine, BlueprintGenerator,
ProviderRouter, or Redis clients directly. Import from here.

Expensive resources (Redis, AI clients) = singleton.
Cheap resources (DB session) = per-request via FastAPI Depends.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.config import get_settings

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
settings = get_settings()


# ──────────────────────────────────────────────
# Redis: single shared connection
# ──────────────────────────────────────────────
_redis_client = None
_redis_initialized = False


def get_redis():
    """Returns a shared Redis client or None if unavailable."""
    global _redis_client, _redis_initialized
    if _redis_initialized:
        return _redis_client
    _redis_initialized = True

    if not settings.redis_url:
        return None
    try:
        import redis as redis_lib
        _redis_client = redis_lib.Redis.from_url(
            settings.redis_url, decode_responses=True
        )
        _redis_client.ping()
        logger.info("Redis connected: %s", settings.redis_url[:30])
    except Exception as e:
        logger.warning("Redis unavailable, running without cache: %s", e)
        _redis_client = None
    return _redis_client


# ──────────────────────────────────────────────
# EventEngine: shared Redis, per-request DB
# ──────────────────────────────────────────────

def get_event_engine(db: "Session"):
    """
    Returns an EventEngine that reuses the shared Redis connection.
    DB session is per-request (transaction isolation).
    Redis client is shared (connection efficiency).
    """
    from app.core.event_engine import EventEngine
    engine = EventEngine.__new__(EventEngine)
    engine.db = db
    engine.settings = settings
    engine.redis_client = get_redis()
    return engine


# ──────────────────────────────────────────────
# ProviderRouter: singleton (AI provider cascade)
# ──────────────────────────────────────────────

def get_provider_router():
    """Re-exports the existing singleton from provider_router.py."""
    from app.ai.provider_router import get_provider_router as _get
    return _get()


# ──────────────────────────────────────────────
# BlueprintGenerator: singleton
# ──────────────────────────────────────────────
_blueprint_generator = None


def get_blueprint_generator():
    global _blueprint_generator
    if _blueprint_generator is None:
        from app.ai.blueprint_generator import BlueprintGenerator
        _blueprint_generator = BlueprintGenerator()
    return _blueprint_generator


# ──────────────────────────────────────────────
# BlueprintContextBuilder: singleton
# ──────────────────────────────────────────────
_context_builder = None


def get_context_builder():
    global _context_builder
    if _context_builder is None:
        from app.ai.blueprint.context_builder import BlueprintContextBuilder
        _context_builder = BlueprintContextBuilder()
    return _context_builder


# ──────────────────────────────────────────────
# WorkflowEngine: per-request (needs DB session)
# ──────────────────────────────────────────────

def get_workflow_engine(db: "Session"):
    """
    Returns a WorkflowEngine with the given DB session.
    Lightweight — the DB session is the expensive resource
    and is managed by FastAPI's dependency injection.
    """
    from app.core.workflow_engine import WorkflowEngine
    return WorkflowEngine(db)
```

### Modify EventEngine to accept external Redis client

Change `apps/api/app/core/event_engine.py` constructor to accept an optional Redis client. When provided, it reuses it instead of creating its own connection:

```python
class EventEngine:
    def __init__(self, db: Session, redis_client=None):
        self.db = db
        self.settings = get_settings()
        self.redis_client = redis_client
        # Backward compat: only create own connection if not provided
        if self.redis_client is None and redis and self.settings.redis_url:
            try:
                self.redis_client = redis.Redis.from_url(
                    self.settings.redis_url, decode_responses=True
                )
            except Exception:
                self.redis_client = None
```

The old `EventEngine(db)` still works (creates its own connection as fallback). The preferred path through `get_event_engine(db)` reuses the shared connection.

### How files change

**New files from this plan use the registry from the start:**

```python
# routes/runtime.py — uses registry
from app.services import get_event_engine, get_workflow_engine

@router.post("/v1/applications", status_code=201)
async def submit_application(body, auth, db: Session = Depends(get_db)):
    engine = get_workflow_engine(db)
    result = await engine.execute_until_wait(application.id)
    await get_event_engine(db).emit("application.submitted", ...)
```

```python
# routes/architect.py — compile endpoint uses registry
from app.services import get_event_engine

async def compile_architecture(...):
    ...
    await get_event_engine(db).emit("architecture.compiled", ...)
```

```python
# routes/ai.py — uses registry for generator and context
from app.services import get_blueprint_generator, get_context_builder, get_event_engine

_generator = get_blueprint_generator()
_context_builder = get_context_builder()

def compile_blueprint(...):
    context = _context_builder.build(db, ...)
    raw_blueprint = _generator.compile(enriched_prompt, full_context)
```

**Existing files migrate gradually:**

The old pattern still works — `EventEngine(db)` creates its own Redis connection as before. No existing code breaks. But as you touch each file for other reasons, swap to the registry import:

| File                      | Before                             | After                                               |
| ------------------------- | ---------------------------------- | --------------------------------------------------- |
| `routes/workflows.py`     | `EventEngine(db)`                  | `get_event_engine(db)`                              |
| `routes/ai.py` deploy     | `EventEngine(db)`                  | `get_event_engine(db)`                              |
| `core/workflow_engine.py` | `EventEngine(self.db)` inside loop | `get_event_engine(self.db)` once before loop, reuse |

The workflow engine fix is the most impactful — move the EventEngine instantiation out of the transition loop:

```python
# Before (in execute_until_wait):
while True:
    ...
    for transition in transitions:
        ...
        event_engine = EventEngine(self.db)  # NEW instance per transition
        await event_engine.emit(...)

# After:
event_engine = get_event_engine(self.db)  # ONE instance before loop
while True:
    ...
    for transition in transitions:
        ...
        await event_engine.emit(...)  # reuse
```

### What this solves

| Problem            | Before                                                      | After                                        |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------- |
| Redis connections  | New connection per EventEngine instantiation (15+ per demo) | One shared connection for entire application |
| BlueprintGenerator | New instance per route file that imports it                 | One singleton, consistent provider state     |
| ContextBuilder     | New instance per AI call                                    | One singleton                                |
| Import consistency | Routes import from scattered internal modules               | All imports from `app.services`              |
| Testing            | Must mock EventEngine in every file that uses it            | Override `get_event_engine` in one place     |

---

## Part 11: Complete file inventory

### New files (5)

| File                                           | Purpose                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/api/app/services.py`                     | Shared service registry — singleton Redis, EventEngine factory, BlueprintGenerator, ContextBuilder |
| `apps/api/app/ai/blueprint/context_builder.py` | Project-aware context for Mode A AI generation                                                     |
| `apps/api/app/core/api_key_utils.py`           | Key and webhook secret generation + verification                                                   |
| `apps/api/app/middleware/api_key_auth.py`      | Runtime API authentication via API key                                                             |
| `apps/api/app/routes/runtime.py`               | External-facing runtime API endpoints                                                              |

### Modified files (6)

| File                                 | Change                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `apps/api/app/models/__init__.py`    | Add `ArchWorkflow` class, add columns to `APIKey` (no environment), add `ai_prompt` to `Workflow` |
| `apps/api/app/core/event_engine.py`  | Accept optional `redis_client` parameter in constructor for shared connection                     |
| `apps/api/app/routes/ai.py`          | Import from services registry, enrich prompt with project context                                 |
| `apps/api/app/routes/architect.py`   | Add compile endpoint, use services registry                                                       |
| `apps/api/app/ai/provider_router.py` | Update system prompt for schema + context, upgrade Gemini model, add response_mime_type           |
| `apps/api/app/main.py`               | Register runtime_router, CSRF skip for /api/v1/, import runtime routes                            |
| `apps/api/app/database.py`           | Modify init_db to only auto-create for SQLite                                                     |

### Unchanged

All core engines except event_engine.py constructor change. All Mode B architect files. All validators. All middleware except the CSRF tweak. All frontend enforcement guards. All existing routes except the noted modifications. Existing routes continue working with direct instantiation — migration to registry is gradual.

---

## Part 12: Verification checklist

### Database

- [ ] Migration generates cleanly
- [ ] Migration applies to Aiven PostgreSQL
- [ ] `arch_workflows` table exists
- [ ] `api_keys` has project_id, architecture_version_id, webhook fields (no environment column)
- [ ] `workflows` has ai_prompt column

### Schema in workflow

- [ ] Workflow definition JSON can include a `schema` key with fields array
- [ ] Canvas auto-infers fields from conditions (frontend)
- [ ] AI-generated workflows include schema in the definition
- [ ] Runtime API validates applicant_data against embedded schema
- [ ] Invalid data returns 422 with field-specific errors

### AI context-carrying

- [ ] First workflow generation works with empty context
- [ ] Second workflow generation receives context about first workflow
- [ ] Field names from first workflow appear in second workflow's schema
- [ ] Mock fallback still works

### Compile flow

- [ ] POST /api/architect/{id}/compile with valid workflow IDs returns 201
- [ ] Response contains raw API key (sk*erp_v{n}*...) and webhook secret (whsec*erp*...)
- [ ] API key hash stored in database, raw key not stored
- [ ] Compiling with undeployed workflow returns 400
- [ ] Second compile creates v2 with new key
- [ ] Old v1 key still works against v1 workflows

### Runtime API

- [ ] POST /api/v1/applications with valid key returns 201
- [ ] Invalid key returns 401
- [ ] Workflow not in architecture returns 403
- [ ] Schema validation rejects invalid applicant_data with 422
- [ ] Application record created with correct initial state
- [ ] Events emitted: application.submitted, workflow.transitioned
- [ ] GET /api/v1/applications/{id} returns correct data
- [ ] GET /api/v1/applications with filters works
- [ ] last_used_at updates on API key

### Event stream

- [ ] workflow.deployed events appear when workflows are deployed
- [ ] architecture.compiled events appear on compile
- [ ] application.submitted and workflow.transitioned appear on runtime API calls
- [ ] Events visible in console event stream page via WebSocket
- [ ] Events filterable by type

### Service registry

- [ ] `services.py` exists and imports cleanly
- [ ] `get_redis()` returns the same client instance on multiple calls
- [ ] `get_event_engine(db)` reuses the shared Redis connection
- [ ] `get_blueprint_generator()` returns the same instance on multiple calls
- [ ] `get_context_builder()` returns the same instance on multiple calls
- [ ] EventEngine still works with direct instantiation `EventEngine(db)` as fallback
- [ ] New files (runtime.py, architect compile, ai.py) use registry imports
- [ ] No new Redis connections opened during a 5-submission demo sequence

### End-to-end

- [ ] Create project → generate workflow with AI (includes schema) → deploy → compile → call runtime API with key → application created → events visible in console
- [ ] Second workflow generation references fields from first workflow
- [ ] Schema change requires new workflow version → redeploy → recompile → new key

---

## Part 13: What this plan does NOT cover (post-prototype)

- Webhook delivery to developer endpoints (retry logic, signing verification)
- SDK generation (JS/Python client libraries)
- Dedicated API request/failure dashboard (separate from event stream)
- Manual state transition endpoint (for applications needing human action)
- Batch application processing
- Rate limiting per API key (currently per IP/user)
- API key rotation/revocation UI
- Template customization flow (Mode C) as a standalone feature
- Survey-based context engineering (Eraser-style onboarding)
- NLP composition in the Architect (currently manual selection)
- Test/production environment isolation
- Multi-node deployment (horizontal scaling)
- Compliance dashboard (FERPA/DPDP reporting)
- Modular workflow chaining (event-triggered cross-workflow execution)

---

## Appendix A: Production optimization roadmap

These are documented for future reference. None are required for the prototype. Implement in priority order as traffic grows.

### P0 — Fix before any real traffic

Already addressed in this plan:

- [x] EventEngine singleton Redis connection (Part 10 — service registry)
- [x] Service registry for shared component instances (Part 10)

### P1 — Fix before 10+ concurrent users

**Repository pattern for tenant-scoped queries.**

Multiple routes duplicate the same tenant-filtered query. Extract into a repository layer with one base query per model. One place to maintain tenant scoping, one place to add caching later.

```python
# apps/api/app/repositories/workflow_repo.py
class WorkflowRepository:
    def __init__(self, db: Session, tenant: TenantContext):
        self.db = db
        self._base = db.query(Workflow).filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
        )

    def list_deployed(self):
        return self._base.filter(Workflow.deployed == True).all()

    def get_by_id(self, workflow_id: str):
        return self._base.filter(Workflow.id == workflow_id).first()

    def get_next_version(self, name: str) -> int:
        current = (
            self.db.query(func.coalesce(func.max(Workflow.version), 0))
            .filter(
                Workflow.institution_id == self._base.column_descriptions[0]['entity'].institution_id,
                Workflow.project_id == self._base.column_descriptions[0]['entity'].project_id,
                Workflow.name == name,
            )
            .scalar()
        )
        return current + 1
```

**Eager loading on compound queries.**

When the compile endpoint loads workflows + architecture + versions, use joinedload to prevent N+1:

```python
from sqlalchemy.orm import joinedload

db.query(Workflow).options(
    joinedload(Workflow.project),
    joinedload(Workflow.institution),
).filter(...).all()
```

### P2 — Fix before 100+ concurrent users

**Context builder caching.** 60-second in-memory cache per project. Prevents re-querying deployed workflows when the developer is iterating on AI prompts rapidly.

**Response caching on read-heavy endpoints.** Redis-backed, 5-10 second TTL on workflow list and event list. Reduces database load under concurrent console sessions.

**Database connection pool monitoring.** Health endpoint reporting pool status (checked_in, checked_out, overflow). Essential for diagnosing "connection exhausted" errors before they cause downtime.

### P3 — Fix before 1000+ concurrent users

**Read replicas.** Route read queries to a PostgreSQL replica. Write queries to the primary. Aiven supports this on paid tiers.

**Event table partitioning.** Partition by timestamp (monthly). Keeps index sizes manageable as events accumulate over years.

**Redis connection pooling.** Replace single shared connection with `redis.ConnectionPool` (max 10 connections) for concurrent async workers.

### P4 — Fix before enterprise deployment

**AI prompt normalization.** Lowercase, strip punctuation, collapse whitespace before hashing for cache. Improves hit rate on semantically identical prompts.

**Batch application processing.** Accept arrays of applications in a single API call for institutions processing thousands of applicants.

**API key rotation.** Issue new key for same architecture version, deactivate old with grace period. No recompile required.

**Compliance audit export.** Generate reports from event table — all transitions, actors, timestamps — exportable as PDF/CSV for FERPA/DPDP.
