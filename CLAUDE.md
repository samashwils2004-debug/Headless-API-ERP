# Orquestra — Implementation Guide for Claude Code

This is the authoritative execution guide. Three planning documents have been consolidated here
in the correct dependency order. Follow sections top-to-bottom. Each section references the
source plan in parentheses.

**Repo root:** `apps/api/` (FastAPI) and `apps/web/` (Next.js)

---

## Execution order

```
Phase 0: Fix existing bugs (unblocks local demo — do these FIRST)
  0a. Mock contract alignment              → provider_router.py
  0b. Async deploy fix                     → routes/ai.py
  0c. Architect routing + RBAC + fallback  → routes/architect.py
  0d. Rate limiter coverage                → middleware/rate_limit.py
  0e. Frontend type alignment              → contracts.ts + architect page
  0f. Hermetic test environment            → .env.test + conftest.py

Phase 1: Database changes (run BEFORE structural code)
  1a. Model changes                        → models/__init__.py
  1b. Alembic migration                    → alembic upgrade head

Phase 2: New files (create in this order)
  2a. Service registry                     → app/services.py
  2b. Context builder                      → app/ai/blueprint/context_builder.py
  2c. API key utilities                    → app/core/api_key_utils.py
  2d. Runtime auth middleware              → app/middleware/api_key_auth.py
  2e. Runtime API routes                   → app/routes/runtime.py

Phase 3: Modify existing backend files
  3a. EventEngine constructor              → app/core/event_engine.py
  3b. WorkflowEngine — move EventEngine out of loop → app/core/workflow_engine.py
  3c. database.py — SQLite-only auto-create → app/database.py
  3d. schema_engine.py — allow schema key  → app/core/schema_engine.py
  3e. provider_router.py — system prompt + Gemini upgrade
  3f. routes/ai.py — service registry + context builder
  3g. routes/architect.py — compile endpoint + service registry
  3h. main.py — register runtime_router + CSRF skip

Phase 4: Cleanup
  4a. Archive stale files
  4b. Update README.md
```

---

## Phase 0: Fix existing bugs

### 0a. Mock contract alignment

**File:** `apps/api/app/ai/provider_router.py`

Replace the entire `_mock_blueprint` function with this corrected version:

```python
def _mock_blueprint(prompt: str, context: dict) -> dict[str, Any]:
    """Returns a deterministic mock blueprint that passes all 4 validation stages."""
    institution_type = context.get("institution_type", "university")
    return {
        "workflow": {
            "name": "generated_workflow",
            "initial_state": "submitted",
            "states": {
                "submitted": {
                    "type": "initial",
                    "transitions": [
                        {"to": "under_review", "condition": None, "emit_event": "application.submitted"}
                    ],
                },
                "under_review": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "approved", "condition": "score >= 70", "emit_event": "application.reviewed"},
                        {"to": "rejected", "condition": "score < 70", "emit_event": "application.reviewed"},
                    ],
                },
                "approved": {"type": "terminal", "transitions": []},
                "rejected": {"type": "terminal", "transitions": []},
            },
            "schema": {
                "fields": [
                    {"name": "score", "type": "number", "required": True, "min": 0, "max": 100},
                    {"name": "name", "type": "string", "required": True},
                    {"name": "email", "type": "string", "required": True, "format": "email"},
                ]
            },
        },
        "roles": [
            {"name": "applicant", "permissions": ["application:create", "application:read"]},
            {"name": "reviewer", "permissions": ["application:read", "application:review"]},
            {"name": "admin", "permissions": ["application:*", "workflow:*"]},
        ],
        "events": [
            {"type": "application.submitted", "version": "1.0"},   # FIXED: was "name"
            {"type": "application.reviewed", "version": "1.0"},
        ],
        "compliance_tags": ["ferpa"] if institution_type == "university" else ["gdpr"],  # FIXED: lowercase
    }
```

Three bugs fixed: `name` → `type` in events; uppercase `"FERPA"` → `"ferpa"`; dotted conditions
(`application_data.score >= 70`) → flat field names (`score >= 70`).

Add `system_prompt` parameter to `generate()`, `_try_gemini()`, and `_try_groq()`:

```python
def generate(self, prompt: str, institution_context: dict[str, Any],
             system_prompt: str | None = None) -> dict[str, Any]:
    cache_key = _cache_key(prompt, institution_context)
    # ... existing cache lookup ...
    result = self._try_gemini(prompt, institution_context, system_prompt)
    if result:
        provider_used = "gemini-2.5-flash"
    else:
        result = self._try_groq(prompt, institution_context, system_prompt)
        if result:
            provider_used = "groq-llama-3.1"
    # ... existing mock fallback and caching ...


def _try_gemini(self, prompt: str, context: dict,
                system_prompt: str | None = None) -> dict | None:
    if not self._gemini_client:
        return None
    try:
        effective_prompt = system_prompt or self._build_system_prompt()
        user_content = json.dumps({"requirement": prompt, "institution_context": context})
        response = self._gemini_client.generate_content(
            f"{effective_prompt}\n\nRequirement: {user_content}",
            generation_config={"response_mime_type": "application/json", "temperature": 0.3},
        )
        text = response.text.strip()
        # Remove markdown stripping code — response_mime_type gives raw JSON
        return json.loads(text)
    except Exception as e:
        logger.warning("Gemini provider failed: %s", e)
        return None


def _try_groq(self, prompt: str, context: dict,
              system_prompt: str | None = None) -> dict | None:
    if not self._groq_client:
        return None
    try:
        effective_prompt = system_prompt or self._build_system_prompt()
        user_content = json.dumps({"requirement": prompt, "institution_context": context})
        response = self._groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": effective_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        text = response.choices[0].message.content
        return json.loads(text)
    except Exception as e:
        logger.warning("Groq provider failed: %s", e)
        return None
```

**Verification:** `POST /api/ai/blueprints/compile` with no AI keys must return `status="validated"`.

---

### 0b. Async deploy fix

**File:** `apps/api/app/routes/ai.py`

Change `deploy_blueprint` from `def` to `async def` and await the event emit directly:

```python
@router.post("/ai/blueprints/{proposal_id}/deploy", status_code=201)
async def deploy_blueprint(
    proposal_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("blueprint:deploy")),
):
    proposal = db.query(BlueprintProposal).filter(
        BlueprintProposal.id == proposal_id,
        BlueprintProposal.institution_id == tenant.institution_id,
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Blueprint proposal not found")
    if proposal.status == "deployed":
        raise HTTPException(status_code=409, detail="Blueprint already deployed")

    validation = _generator.validate(proposal.blueprint)
    if not validation["is_valid"]:
        raise HTTPException(status_code=422, detail="Blueprint failed re-validation — cannot deploy")

    workflow_def = proposal.blueprint.get("workflow", {})
    workflow_name = workflow_def.get("name", "generated_workflow")

    existing = (
        db.query(Workflow)
        .filter(
            Workflow.institution_id == tenant.institution_id,
            Workflow.project_id == tenant.project_id,
            Workflow.name == workflow_name,
        )
        .order_by(Workflow.version.desc())
        .first()
    )
    version = (existing.version + 1) if existing else 1

    from app.time_utils import utcnow_naive
    workflow = Workflow(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        name=workflow_name,
        version=version,
        definition=workflow_def,
        is_ai_generated=True,
        ai_prompt=proposal.prompt,  # store original prompt
        deployed=True,
        created_by=current_user.id,
        deployed_at=utcnow_naive(),
    )
    db.add(workflow)
    proposal.status = "deployed"
    proposal.deployed_at = utcnow_naive()
    db.commit()
    db.refresh(workflow)

    event_engine = EventEngine(db)
    try:
        await event_engine.emit(
            "ai.blueprint.deployed",
            tenant.institution_id,
            tenant.project_id,
            {"workflow_id": workflow.id, "workflow_name": workflow.name, "proposal_id": proposal_id},
        )
    except Exception:
        pass  # event failure must not block deploy

    return {
        "workflow_id": workflow.id,
        "workflow_name": workflow.name,
        "version": workflow.version,
        "message": "Blueprint deployed successfully",
    }
```

Remove any `import asyncio` and `asyncio.create_task` / `asyncio.get_event_loop()` calls from this file.

---

### 0c. Architect routing, RBAC, and fallback fix

**File:** `apps/api/app/routes/architect.py`

**Fix 1 — pass ERP system prompt to generate():**

```python
# Change:
response = router_instance.generate(user_prompt, {"mode": "erp_architect"})

# To:
response = router_instance.generate(
    user_prompt,
    {"mode": "erp_architect"},
    system_prompt=ERP_SYSTEM_PROMPT,
)
```

**Fix 2 — add RBAC to every route.** Add `_=Depends(check_permission("architect:write"))` to all
POST/PUT routes and `_=Depends(check_permission("architect:read"))` to all GET routes. The
`check_permission` dependency is already imported but unused.

Also add `architect:read` and `architect:write` to the `owner` role's permissions in `rbac_engine.py`.

**Fix 3 — domain name extraction in mock fallback:**

```python
_STOP_WORDS = {"add", "create", "new", "a", "an", "the", "domain", "domains",
               "for", "with", "and", "to", "from", "in", "of", "my", "our",
               "please", "i", "want", "need", "section", "department"}

def _extract_domain_ids_from_prompt(prompt: str) -> list[str]:
    words = prompt.lower().strip().split()
    candidates = [
        w.replace(",", "").replace(".", "")
        for w in words
        if w.lower().replace(",", "").replace(".", "") not in _STOP_WORDS
        and len(w) > 2
    ]
    return candidates[:5] if candidates else ["general"]
```

In the fallback block of `apply_prompt`, replace the current single-domain extraction with:

```python
if is_mock or not isinstance(raw_result, dict):
    domain_ids = _extract_domain_ids_from_prompt(body.prompt)
    operations = []
    for domain_id in domain_ids:
        operations.append({
            "operation": "add_domain",
            "domain": {
                "id": domain_id,
                "label": domain_id.replace("_", " ").title(),
            },
            "rationale": f"Added domain '{domain_id}' based on: {body.prompt[:100]}",
        })
    old_graph = copy.deepcopy(arch.graph_json)
    new_graph = arch.graph_json
    for op in operations:
        new_graph = _apply_operation(new_graph, op)
    # ... continue with existing diff + commit logic
```

**Verification:** "Add admissions and finance domains" must create two domains, not one called "domains".

---

### 0d. Rate limiter coverage

**File:** `apps/api/app/middleware/rate_limit.py`

```python
# Change:
if "/api/ai/" in path:

# To:
if "/api/ai/" in path or "/api/architect/" in path:
```

---

### 0e. Frontend type alignment

**File:** `apps/web/src/types/contracts.ts`

```typescript
// Fix BlueprintEvent — was "emit_on", backend expects "type" + "version":
export interface BlueprintEvent {
  type: string;
  version: string;
}

// Fix BlueprintRole — id is optional (backend never sends it):
export interface BlueprintRole {
  id?: string;
  name: string;
  permissions: string[];
}

// Add BackendValidationResult (backend's actual shape):
export interface BackendValidationResult {
  stage_1_schema: { valid: boolean; errors: string[] };
  stage_2_graph_integrity: { valid: boolean; errors: string[] };
  stage_3_permission_analysis: { valid: boolean; errors: string[] };
  stage_4_compliance: { valid: boolean; errors: string[] };
  is_valid: boolean;
}
```

**File:** `apps/web/src/lib/console-api.ts` (or wherever API helpers live)

```typescript
export function mapValidationResult(
  backend: BackendValidationResult,
): ValidationResult {
  return {
    schema: backend.stage_1_schema,
    graph: backend.stage_2_graph_integrity,
    permissions: backend.stage_3_permission_analysis,
    compliance: backend.stage_4_compliance,
    all_passed: backend.is_valid,
  };
}
```

**File:** `apps/web/src/app/console/architect/page.tsx`

Rewire to the correct endpoints:

```typescript
// On mount — load or auto-create architecture:
const archRes = await fetch("/api/architect", { headers });
const { architecture } = await archRes.json();
if (!architecture) {
  await fetch("/api/architect", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Institutional ERP" }),
  });
}

// On generate — use architect prompt endpoint (NOT /api/ai/compile):
const res = await fetch(`/api/architect/${archId}/prompt`, {
  method: "POST",
  headers,
  body: JSON.stringify({ prompt: userInput }),
});
```

---

### 0f. Hermetic test environment

**Create:** `apps/api/.env.test`

```bash
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=sqlite:///./test_hermetic.db
SECRET_KEY=test-secret-key-that-is-at-least-32-characters-long
REDIS_URL=
GEMINI_API_KEY=
GROQ_API_KEY=
CORS_ORIGINS=["http://localhost:3000"]
```

**Update:** `apps/api/conftest.py` — add at top before any other imports:

```python
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_hermetic.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters-long")
os.environ.setdefault("REDIS_URL", "")
```

**Verification:** `pytest apps/api/tests` must pass with no Aiven, Redis, or AI provider access.

---

## Phase 1: Database changes

### 1a. Model changes

**File:** `apps/api/app/models/__init__.py`

**Add column to `Workflow` class** (after `is_ai_generated`):

```python
ai_prompt = Column(Text, nullable=True)
```

**Add columns to `APIKey` class:**

```python
project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)
architecture_version_id = Column(String, ForeignKey("architecture_versions.id"), nullable=True, index=True)
webhook_secret_hash = Column(String(64), nullable=True)
webhook_secret_prefix = Column(String(24), nullable=True)

# Relationships:
architecture_version = relationship("ArchitectureVersion", backref="api_key")
project = relationship("Project", backref="api_keys")
```

**Add new `ArchWorkflow` class** (after `ArchitectureVersion`):

```python
class ArchWorkflow(Base):
    """Junction: links an architecture version to its constituent workflows."""
    __tablename__ = "arch_workflows"
    __table_args__ = (
        UniqueConstraint(
            "architecture_version_id", "workflow_id",
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

**Important:** Do NOT add an `environment` column to `APIKey`. The prototype has no test/production
split — all keys are production keys. Removing this keeps the schema clean.

### 1b. Alembic migration

```bash
cd apps/api

# If the database was previously created by init_db() (create_all), stamp first:
alembic stamp head

# Generate migration:
alembic revision --autogenerate -m "add arch_workflows junction, link api_keys to architecture, add ai_prompt"

# Review the generated file in alembic/versions/ — verify it shows:
# - CREATE TABLE arch_workflows
# - ALTER TABLE api_keys ADD COLUMN project_id
# - ALTER TABLE api_keys ADD COLUMN architecture_version_id
# - ALTER TABLE api_keys ADD COLUMN webhook_secret_hash
# - ALTER TABLE api_keys ADD COLUMN webhook_secret_prefix
# - ALTER TABLE workflows ADD COLUMN ai_prompt

# Apply to Aiven:
alembic upgrade head
```

Also reduce pool size in `.env` to stay under Aiven free tier 20-connection ceiling:

```
DB_POOL_SIZE=3
DB_MAX_OVERFLOW=2
```

---

## Phase 2: New files

### 2a. Service registry

**Create:** `apps/api/app/services.py`

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

# ── Redis: single shared connection ──────────────────────────────
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
        _redis_client = redis_lib.Redis.from_url(settings.redis_url, decode_responses=True)
        _redis_client.ping()
        logger.info("Redis connected: %s", settings.redis_url[:30])
    except Exception as e:
        logger.warning("Redis unavailable, running without cache: %s", e)
        _redis_client = None
    return _redis_client


# ── EventEngine: shared Redis, per-request DB ────────────────────
def get_event_engine(db: "Session"):
    """Returns EventEngine reusing shared Redis. DB is per-request."""
    from app.core.event_engine import EventEngine
    engine = EventEngine.__new__(EventEngine)
    engine.db = db
    engine.settings = settings
    engine.redis_client = get_redis()
    return engine


# ── ProviderRouter: singleton ────────────────────────────────────
def get_provider_router():
    from app.ai.provider_router import get_provider_router as _get
    return _get()


# ── BlueprintGenerator: singleton ────────────────────────────────
_blueprint_generator = None

def get_blueprint_generator():
    global _blueprint_generator
    if _blueprint_generator is None:
        from app.ai.blueprint_generator import BlueprintGenerator
        _blueprint_generator = BlueprintGenerator()
    return _blueprint_generator


# ── BlueprintContextBuilder: singleton ───────────────────────────
_context_builder = None

def get_context_builder():
    global _context_builder
    if _context_builder is None:
        from app.ai.blueprint.context_builder import BlueprintContextBuilder
        _context_builder = BlueprintContextBuilder()
    return _context_builder


# ── WorkflowEngine: per-request (needs DB session) ───────────────
def get_workflow_engine(db: "Session"):
    from app.core.workflow_engine import WorkflowEngine
    return WorkflowEngine(db)
```

---

### 2b. Context builder

**Create:** `apps/api/app/ai/blueprint/__init__.py`

```python
"""Mode A — Blueprint generation with project-aware context."""
from app.ai.blueprint.context_builder import BlueprintContextBuilder
__all__ = ["BlueprintContextBuilder"]
```

**Create:** `apps/api/app/ai/blueprint/context_builder.py`

```python
"""
Project-aware context builder for Mode A blueprint generation.
Reads existing deployed workflows, extracts field/role/event info,
enriches the AI prompt so workflows are consistent across a project.
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

        # Deduplicate by name — latest version only
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

        combined = sorted(set(context.get("known_schema_fields", [])) | set(context.get("known_fields", [])))
        if combined:
            lines.append(f"\nFields already defined across workflows: {', '.join(combined)}")
            lines.append("IMPORTANT: Reuse these exact field names where they apply. Do not invent synonyms.")

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

---

### 2c. API key utilities

**Create:** `apps/api/app/core/api_key_utils.py`

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

**Also update** any existing code in `routes/api_keys.py` that generates keys with `sk_live_*` prefix
to use `generate_api_key()` from this module so the prefix becomes `sk_erp_v{n}_*`.

---

### 2d. Runtime auth middleware

**Create:** `apps/api/app/middleware/api_key_auth.py`

```python
"""
Runtime API authentication via versioned API key.
Used exclusively by /api/v1/ endpoints — not console JWT auth.
"""
from __future__ import annotations
import hashlib
from dataclasses import dataclass, field
from typing import Optional
from fastapi import HTTPException, Header
from sqlalchemy.orm import Session
from app.models import APIKey, ArchWorkflow
from app.time_utils import utcnow_naive


@dataclass
class RuntimeAuthContext:
    institution_id: str
    project_id: str
    architecture_version_id: str
    accessible_workflow_ids: list[str] = field(default_factory=list)
    api_key_id: str = ""


def authenticate_runtime_key(
    authorization: Optional[str],
    db: Session,
) -> RuntimeAuthContext:
    """
    Validates Authorization: Bearer sk_erp_v{n}_... header.
    Returns RuntimeAuthContext with accessible workflow IDs.
    Raises HTTPException on failure.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    raw_key = authorization.removeprefix("Bearer ").strip()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    api_key = db.query(APIKey).filter(
        APIKey.key_hash == key_hash,
        APIKey.is_active == True,  # noqa: E712
    ).first()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    if api_key.expires_at and api_key.expires_at < utcnow_naive():
        raise HTTPException(status_code=401, detail="API key has expired")

    # Load accessible workflow IDs from the architecture version
    arch_workflows = db.query(ArchWorkflow).filter(
        ArchWorkflow.architecture_version_id == api_key.architecture_version_id
    ).all()
    accessible_ids = [aw.workflow_id for aw in arch_workflows]

    # Update last_used_at
    api_key.last_used_at = utcnow_naive()
    db.commit()

    return RuntimeAuthContext(
        institution_id=api_key.institution_id,
        project_id=api_key.project_id or "",
        architecture_version_id=api_key.architecture_version_id or "",
        accessible_workflow_ids=accessible_ids,
        api_key_id=api_key.id,
    )
```

---

### 2e. Runtime API routes

**Create:** `apps/api/app/routes/runtime.py`

```python
"""
External-facing runtime API.
Authenticated by versioned API key, not JWT.
Routes: POST /v1/applications, GET /v1/applications/{id}, GET /v1/applications
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.api_key_auth import authenticate_runtime_key, RuntimeAuthContext
from app.models import Workflow, Application
from app.services import get_event_engine, get_workflow_engine
from app.time_utils import utcnow_naive

router = APIRouter(tags=["Runtime API"])


# ── Auth dependency ──────────────────────────────────────────────
def get_runtime_auth(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> RuntimeAuthContext:
    return authenticate_runtime_key(authorization, db)


# ── Request/Response models ──────────────────────────────────────
class SubmitApplicationRequest(BaseModel):
    workflow_id: str
    applicant_data: dict


class ApplicationResponse(BaseModel):
    application_id: str
    workflow_id: str
    current_state: str
    status: str
    message: str


# ── POST /api/v1/applications ────────────────────────────────────
@router.post("/v1/applications", status_code=201)
async def submit_application(
    body: SubmitApplicationRequest,
    auth: RuntimeAuthContext = Depends(get_runtime_auth),
    db: Session = Depends(get_db),
):
    # Verify workflow is accessible via this API key's architecture
    if body.workflow_id not in auth.accessible_workflow_ids:
        raise HTTPException(
            status_code=403,
            detail="Workflow not available in this architecture version"
        )

    # Load workflow
    workflow = db.query(Workflow).filter(
        Workflow.id == body.workflow_id,
        Workflow.institution_id == auth.institution_id,
    ).first()
    if not workflow or not workflow.deployed:
        raise HTTPException(status_code=404, detail="Workflow not found or not deployed")

    # Validate applicant_data against embedded schema (if present)
    definition = workflow.definition or {}
    schema = definition.get("schema")
    if schema and schema.get("fields"):
        errors = _validate_schema(body.applicant_data, schema["fields"])
        if errors:
            raise HTTPException(status_code=422, detail={"schema_errors": errors})

    # Create application
    initial_state = definition.get("initial_state", "submitted")
    application = Application(
        institution_id=auth.institution_id,
        project_id=auth.project_id,
        workflow_id=body.workflow_id,
        workflow_version=workflow.version,
        applicant_data=body.applicant_data,
        current_state=initial_state,
        status="active",
        submitted_at=utcnow_naive(),
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Execute workflow engine
    engine = get_workflow_engine(db)
    try:
        result = await engine.execute_until_wait(application.id)
        final_state = result.get("current_state", initial_state)
    except Exception as e:
        final_state = initial_state

    # Emit events
    event_engine = get_event_engine(db)
    try:
        await event_engine.emit(
            "application.submitted",
            auth.institution_id,
            auth.project_id,
            {"application_id": application.id, "workflow_id": body.workflow_id,
             "initial_state": initial_state},
        )
        if final_state != initial_state:
            await event_engine.emit(
                "workflow.transitioned",
                auth.institution_id,
                auth.project_id,
                {"application_id": application.id, "from_state": initial_state,
                 "to_state": final_state},
            )
    except Exception:
        pass

    return ApplicationResponse(
        application_id=application.id,
        workflow_id=body.workflow_id,
        current_state=final_state,
        status=application.status,
        message="Application submitted successfully",
    )


# ── GET /api/v1/applications/{id} ───────────────────────────────
@router.get("/v1/applications/{application_id}")
def get_application(
    application_id: str,
    auth: RuntimeAuthContext = Depends(get_runtime_auth),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.institution_id == auth.institution_id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return {
        "id": application.id,
        "workflow_id": application.workflow_id,
        "current_state": application.current_state,
        "status": application.status,
        "applicant_data": application.applicant_data,
        "submitted_at": application.submitted_at,
    }


# ── GET /api/v1/applications ─────────────────────────────────────
@router.get("/v1/applications")
def list_applications(
    workflow_id: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    auth: RuntimeAuthContext = Depends(get_runtime_auth),
    db: Session = Depends(get_db),
):
    query = db.query(Application).filter(
        Application.institution_id == auth.institution_id
    )
    if workflow_id:
        query = query.filter(Application.workflow_id == workflow_id)
    if state:
        query = query.filter(Application.current_state == state)
    total = query.count()
    items = query.order_by(Application.submitted_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {"id": a.id, "workflow_id": a.workflow_id, "current_state": a.current_state,
             "status": a.status, "submitted_at": a.submitted_at}
            for a in items
        ],
    }


# ── Schema validation helper ─────────────────────────────────────
def _validate_schema(data: dict, fields: list[dict]) -> list[str]:
    errors = []
    for field_def in fields:
        name = field_def["name"]
        ftype = field_def.get("type", "string")
        required = field_def.get("required", False)
        value = data.get(name)

        if required and value is None:
            errors.append(f"Missing required field: {name}")
            continue
        if value is None:
            continue

        if ftype == "number" and not isinstance(value, (int, float)):
            errors.append(f"Field '{name}' must be a number")
        elif ftype == "string" and not isinstance(value, str):
            errors.append(f"Field '{name}' must be a string")
        elif ftype == "boolean" and not isinstance(value, bool):
            errors.append(f"Field '{name}' must be a boolean")

        if isinstance(value, (int, float)):
            if field_def.get("min") is not None and value < field_def["min"]:
                errors.append(f"Field '{name}' below minimum {field_def['min']}")
            if field_def.get("max") is not None and value > field_def["max"]:
                errors.append(f"Field '{name}' above maximum {field_def['max']}")

        if field_def.get("enum") and value not in field_def["enum"]:
            errors.append(f"Field '{name}' must be one of {field_def['enum']}")

    return errors
```

---

## Phase 3: Modify existing backend files

### 3a. EventEngine constructor

**File:** `apps/api/app/core/event_engine.py`

Change `__init__` to accept optional `redis_client` parameter:

```python
def __init__(self, db: Session, redis_client=None):
    self.db = db
    self.settings = get_settings()
    self.redis_client = redis_client
    # Backward compat: create own connection only if not provided
    if self.redis_client is None and redis and self.settings.redis_url:
        try:
            self.redis_client = redis.Redis.from_url(
                self.settings.redis_url, decode_responses=True
            )
        except Exception:
            self.redis_client = None
```

Old `EventEngine(db)` calls still work — backward compatible.

---

### 3b. WorkflowEngine — fix Redis connection leak

**File:** `apps/api/app/core/workflow_engine.py`

Move EventEngine instantiation OUT of the transition loop:

```python
# In execute_until_wait (or equivalent method):

# Add import at top of file:
from app.services import get_event_engine

# Before the while loop:
event_engine = get_event_engine(self.db)  # ONE instance, reused across all transitions

while True:
    ...
    for transition in transitions:
        ...
        await event_engine.emit(...)   # reuse, no new Redis connections
```

---

### 3c. database.py — SQLite-only auto-create

**File:** `apps/api/app/database.py`

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

PostgreSQL tables are now managed exclusively by `alembic upgrade head`.

---

### 3d. schema_engine.py — allow schema key in workflow

**File:** `apps/api/app/core/schema_engine.py`

In `BLUEPRINT_SCHEMA`, inside the `"workflow"` object's `"properties"`, add the `"schema"` key and
remove `"additionalProperties": False` from the workflow object (keep it on the top-level):

```python
"workflow": {
    "type": "object",
    "required": ["name", "initial_state", "states"],
    "properties": {
        "name": {"type": "string"},
        "initial_state": {"type": "string"},
        "states": {"type": "object", "minProperties": 2},
        "schema": {
            "type": "object",
            "properties": {
                "fields": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "type"],
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string", "enum": ["string", "number", "boolean"]},
                            "required": {"type": "boolean"},
                            "min": {"type": "number"},
                            "max": {"type": "number"},
                            "enum": {"type": "array", "items": {"type": "string"}},
                            "format": {"type": "string"},
                        },
                    },
                },
            },
        },
    },
    # Do NOT add "additionalProperties": False here — it would block the schema key
},
```

---

### 3e. provider_router.py — system prompt + Gemini upgrade

**File:** `apps/api/app/ai/provider_router.py`

In `_init_clients()`, upgrade model:

```python
# Change:
self._gemini_client = genai.GenerativeModel("gemini-1.5-flash")
# To:
self._gemini_client = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")
```

Add to the END of `_build_system_prompt()` return value:

```
- Include a "schema" section in the workflow with fields referenced in conditions
- Each schema field must have: name, type (string|number|boolean), required (true|false)
- Optionally include: min, max, enum, format for validation
- If existing workflows are described in PROJECT CONTEXT, reuse their field names and role names
- Suggest emit_events that could trigger integrations with existing workflows
- Return ONLY the JSON object, no markdown, no explanation
```

---

### 3f. routes/ai.py — service registry + context builder

**File:** `apps/api/app/routes/ai.py`

Add imports:

```python
from app.services import get_blueprint_generator, get_context_builder, get_event_engine
```

Replace module-level `_generator = BlueprintGenerator()` with:

```python
_generator = get_blueprint_generator()
_context_builder = get_context_builder()
```

In `compile_blueprint`, before the try block, add context enrichment:

```python
project_context = _context_builder.build(db, tenant.institution_id, tenant.project_id)
enriched_prompt = _context_builder.enrich_prompt(body.prompt, project_context)
full_context = {**body.institution_context, **project_context}

# Then pass enriched_prompt and full_context to the generator:
raw_blueprint = _generator.compile(enriched_prompt, full_context)
```

In `deploy_blueprint`, swap `EventEngine(db)` with `get_event_engine(db)`.

---

### 3g. routes/architect.py — compile endpoint + service registry

**File:** `apps/api/app/routes/architect.py`

Add imports:

```python
from pydantic import BaseModel
from app.core.api_key_utils import generate_api_key, generate_webhook_secret
from app.models import ArchWorkflow, ArchitectureVersion, APIKey, Workflow
from app.services import get_event_engine
```

Add request/response models:

```python
class CompileRequest(BaseModel):
    workflow_ids: list[str]
    key_name: str = "Default API Key"
```

Add compile endpoint:

```python
@router.post("/architect/{arch_id}/compile", status_code=201)
async def compile_architecture(
    arch_id: str,
    body: CompileRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),
):
    if not body.workflow_ids:
        raise HTTPException(status_code=400, detail="At least one workflow must be selected")

    # Load architecture
    arch = db.query(InstitutionArchitecture).filter(
        InstitutionArchitecture.id == arch_id,
        InstitutionArchitecture.institution_id == tenant.institution_id,
    ).first()
    if not arch:
        raise HTTPException(status_code=404, detail="Architecture not found")

    # Validate workflows
    workflows = db.query(Workflow).filter(
        Workflow.id.in_(body.workflow_ids),
        Workflow.institution_id == tenant.institution_id,
        Workflow.project_id == tenant.project_id,
    ).all()

    found_ids = {w.id for w in workflows}
    missing = set(body.workflow_ids) - found_ids
    if missing:
        raise HTTPException(status_code=404, detail=f"Workflows not found: {missing}")

    undeployed = [w.name for w in workflows if not w.deployed]
    if undeployed:
        raise HTTPException(status_code=400, detail=f"Workflows not deployed: {undeployed}")

    # Get next version number
    last_version = db.query(ArchitectureVersion).filter(
        ArchitectureVersion.architecture_id == arch_id
    ).order_by(ArchitectureVersion.version.desc()).first()
    version_number = (last_version.version + 1) if last_version else 1

    # Create ArchitectureVersion
    from app.time_utils import utcnow_naive
    arch_version = ArchitectureVersion(
        architecture_id=arch_id,
        institution_id=tenant.institution_id,
        version=version_number,
        graph_snapshot=arch.graph_json,
        created_by=current_user.id,
        created_at=utcnow_naive(),
    )
    db.add(arch_version)
    db.flush()  # get arch_version.id

    # Create ArchWorkflow junction records
    for i, wf in enumerate(workflows):
        db.add(ArchWorkflow(
            architecture_version_id=arch_version.id,
            workflow_id=wf.id,
            workflow_version=wf.version,
            display_order=i,
        ))

    # Generate API key and webhook secret
    key_data = generate_api_key(version_number)
    secret_data = generate_webhook_secret()

    api_key = APIKey(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        architecture_version_id=arch_version.id,
        name=body.key_name,
        key_hash=key_data["key_hash"],
        key_prefix=key_data["key_prefix"],
        webhook_secret_hash=secret_data["secret_hash"],
        webhook_secret_prefix=secret_data["secret_prefix"],
        is_active=True,
        created_by=current_user.id,
    )
    db.add(api_key)
    db.commit()

    # Emit event
    try:
        await get_event_engine(db).emit(
            "architecture.compiled",
            tenant.institution_id,
            tenant.project_id,
            {
                "architecture_version_id": arch_version.id,
                "version_number": version_number,
                "workflows_linked": len(workflows),
            },
        )
    except Exception:
        pass

    return {
        "architecture_version_id": arch_version.id,
        "version_number": version_number,
        "workflows_linked": len(workflows),
        "api_key": key_data["raw_key"],          # shown once — never stored raw
        "api_key_prefix": key_data["key_prefix"],
        "webhook_secret": secret_data["raw_secret"],  # shown once
        "webhook_secret_prefix": secret_data["secret_prefix"],
        "message": f"Architecture v{version_number} compiled. Save these credentials — they won't be shown again.",
    }
```

Also swap any remaining `EventEngine(db)` calls in this file to `get_event_engine(db)`.

---

### 3h. main.py — register runtime router + CSRF skip

**File:** `apps/api/app/main.py`

Add runtime router:

```python
from app.routes.runtime import router as runtime_router
app.include_router(runtime_router, prefix="/api", tags=["Runtime API"])
```

Add CSRF skip for runtime routes in the security middleware:

```python
if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path.startswith("/api"):
    if not request.url.path.startswith("/api/v1/"):
        # CSRF check only for console routes
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        if csrf_cookie and csrf_header and csrf_cookie != csrf_header:
            return JSONResponse(status_code=403, content={"detail": "CSRF token mismatch"})
```

---

## Phase 4: Cleanup

### 4a. Archive stale files

```bash
cd apps/api
mkdir -p archive
git mv app/workflow.py archive/workflow.py.archived
git mv sql/supabase_rls.sql archive/
git mv sql/supabase_storage_policies.sql archive/
git mv SUPABASE_RUNBOOK.md archive/
```

Before archiving `app/workflow.py`, verify with `grep -r "from app.workflow" apps/api/app/` that
nothing imports from it. Current engine is `app/core/workflow_engine.py`.

### 4b. Update README.md

Change any references to:

- "OpenAI GPT-4 Turbo" → "Gemini 2.5 Flash → Groq → Mock cascade"
- "Supabase" → remove or replace with "Aiven PostgreSQL"

In `apps/api/app/config.py`, add a comment on `openai_api_key` and `openai_model` fields:

```python
openai_api_key: str = ""  # Legacy — not used by current provider cascade
openai_model: str = ""    # Legacy — not used by current provider cascade
```

---

## Verification checklist

Run after completing all phases:

### Phase 0 (run after each fix)

- [ ] `POST /api/ai/blueprints/compile` with no AI keys → `status="validated"` (not "invalid")
- [ ] Mock blueprint passes all 4 stages: schema, graph, permissions, compliance
- [ ] Mock conditions use flat field names (`score >= 70`, not `application_data.score >= 70`)
- [ ] `POST /api/ai/blueprints/{id}/deploy` completes without asyncio errors
- [ ] Deploy emits `ai.blueprint.deployed` event
- [ ] Deployed workflow has `ai_prompt` populated
- [ ] `POST /api/architect/{id}/prompt` "Add admissions and finance domains" → creates two domains
- [ ] Architect routes return 403 for users without architect permissions
- [ ] `/api/architect/` calls are rate-limited (same bucket as `/api/ai/`)
- [ ] Frontend architect page loads architecture on mount, sends prompts to correct endpoint
- [ ] `pytest apps/api/tests` passes with no network access

### Phase 1 (database)

- [ ] `alembic upgrade head` succeeds against Aiven
- [ ] `arch_workflows` table visible in PG Studio
- [ ] `api_keys` has columns: `project_id`, `architecture_version_id`, `webhook_secret_hash`, `webhook_secret_prefix`
- [ ] `workflows` has `ai_prompt` column
- [ ] Existing data preserved
- [ ] Backend starts: `uvicorn app.main:app --reload` → no errors
- [ ] `GET /api/health` → 200

### Phase 2+3 (structural)

- [ ] `POST /api/architect/{id}/compile` with valid deployed workflow IDs → 201 with raw API key
- [ ] Response contains `sk_erp_v{n}_...` and `whsec_erp_...` (shown once)
- [ ] Compiling with undeployed workflow → 400
- [ ] `POST /api/v1/applications` with `Authorization: Bearer sk_erp_v1_...` → 201
- [ ] Invalid API key → 401
- [ ] Workflow not in architecture → 403
- [ ] Schema validation rejects invalid `applicant_data` → 422
- [ ] Application created with correct initial state
- [ ] Events emitted: `application.submitted`, `workflow.transitioned`
- [ ] `GET /api/v1/applications/{id}` → correct data
- [ ] Context builder: second workflow generation includes first workflow's fields

### End-to-end demo sequence

- [ ] Create project → generate workflow with AI (includes schema) → deploy
- [ ] Open Architect → describe domains → Apply → link deployed workflow → Compile
- [ ] Copy `sk_erp_v1_...` key
- [ ] `curl -X POST /api/v1/applications -H "Authorization: Bearer sk_erp_v1_..." -d '{"workflow_id":"...","applicant_data":{"score":85,...}}'`
- [ ] Application created → events visible in console event stream via WebSocket

---

## What this plan does NOT cover (post-prototype scope)

- Webhook delivery to developer endpoints (retry logic, signing verification)
- SDK generation (JS/Python client libraries)
- Manual state transition endpoint
- Batch application processing
- Rate limiting per API key
- API key rotation/revocation UI
- Template customization as standalone feature (Mode C)
- Test/production environment isolation — intentionally omitted
- Multi-node deployment
- Compliance dashboard (FERPA/DPDP reporting)
- Modular workflow chaining
