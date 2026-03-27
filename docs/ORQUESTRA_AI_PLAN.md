# Orquestra — AI Implementation Plan

## Relationship to other documents

This document is the third in a trilogy:

- **Prototype Plan v2** (`orquestra_prototype_plan_v2.md`) — covers database schema, service registry, compile endpoint, runtime API, event stream positioning, and production optimization roadmap.
- **Postgres Integration** (`orquestra_postgres_integration_plan.md`) — superseded by prototype plan v2. Use v2 as the source of truth for database changes.
- **This document** — covers everything AI-specific: bug fixes that must land before structural work, provider router alignment, Mode A and Mode B implementation, context-carrying, mock contract normalization, and frontend wiring.

The prototype plan v2 assumes the AI layer works correctly. This document makes that assumption true.

---

## Execution order

This plan has two phases. Phase 0 fixes what's broken in the existing code. Phase 1 builds the new capabilities described in the prototype plan. Phase 0 must complete before Phase 1 begins — the structural work in Phase 1 depends on a correct baseline.

```
Phase 0: Fix existing bugs (unblocks local demo)
  0a. Mock contract alignment (provider_router.py)
  0b. Async deploy fix (routes/ai.py)
  0c. Architect routing + RBAC + fallback (routes/architect.py)
  0d. Rate limiter coverage (middleware/rate_limit.py)
  0e. Frontend type alignment (contracts.ts + architect page)
  0f. Hermetic test environment (.env.test)

Phase 1: Structural additions (from prototype plan v2)
  1a. Service registry (services.py)
  1b. Mode-aware provider router
  1c. Context builder for Mode A
  1d. Schema-in-workflow definition
  1e. Gemini model upgrade
```

---

## Phase 0: Fix existing bugs

### 0a. Mock contract alignment

**File:** `apps/api/app/ai/provider_router.py`

**Bug 2a — Events use wrong key name.**

The `BLUEPRINT_SCHEMA` in `schema_engine.py` requires events with `type` and `version` keys:

```python
# What schema_engine.py BLUEPRINT_SCHEMA expects:
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
```

The mock blueprint in `provider_router.py` currently emits `name` instead of `type`:

```python
# CURRENT (broken):
"events": [
    {"name": "application.submitted", "version": "1.0"},
    {"name": "application.reviewed", "version": "1.0"},
],
```

**Fix — change `name` to `type`:**

```python
# FIXED:
"events": [
    {"type": "application.submitted", "version": "1.0"},
    {"type": "application.reviewed", "version": "1.0"},
],
```

**Bug 2b — Compliance tags are uppercase.**

The `compliance_checker.py` expects lowercase tags:

```python
# What compliance_checker.py checks:
allowed_tags = {"ferpa", "gdpr", "dpdp", "iso27001", "soc2"}
tags = set(blueprint.get("compliance_tags", []))
bad_tags = tags - allowed_tags
# "FERPA" is not in allowed_tags → validation failure
```

The mock emits uppercase:

```python
# CURRENT (broken):
"compliance_tags": ["FERPA"] if institution_type == "university" else ["GDPR"],
```

**Fix — use lowercase:**

```python
# FIXED:
"compliance_tags": ["ferpa"] if institution_type == "university" else ["gdpr"],
```

**Bug 3 — Dotted property access in mock conditions.**

The `condition_parser.py` TOKEN*RE regex only matches identifiers as `[A-Za-z*][A-Za-z0-9_]\*`. A dot is not in that character class. The condition `application_data.score >= 70` fails tokenization before even reaching the explicit dotted-access check. The mock workflow has never been runtime-safe.

```python
# CURRENT (broken):
"under_review": {
    "type": "intermediate",
    "transitions": [
        {"to": "approved", "condition": "application_data.score >= 70", ...},
        {"to": "rejected", "condition": "application_data.score < 70", ...},
    ],
},
```

**Fix — use flat field names:**

```python
# FIXED:
"under_review": {
    "type": "intermediate",
    "transitions": [
        {"to": "approved", "condition": "score >= 70", "emit_event": "application.reviewed"},
        {"to": "rejected", "condition": "score < 70", "emit_event": "application.reviewed"},
    ],
},
```

**Bug 6 — System prompt parameter missing from generate().**

The `ProviderRouter.generate()` method has no way to accept a custom system prompt. The `ERP_SYSTEM_PROMPT` from `erp_schema.py` is imported in `architect.py` but silently ignored because the router always uses its own hardcoded `_build_system_prompt()`.

**Fix — add `system_prompt` parameter to `generate()` and thread it through:**

```python
# In ProviderRouter:

def generate(self, prompt: str, institution_context: dict[str, Any],
             system_prompt: str | None = None) -> dict[str, Any]:
    """
    Generate a blueprint using the provider cascade.
    If system_prompt is provided, it overrides the default workflow prompt.
    This enables Mode B (architect) to use ERP_SYSTEM_PROMPT.
    """
    cache_key = _cache_key(prompt, institution_context)
    # ... cache lookup ...

    result = self._try_gemini(prompt, institution_context, system_prompt)
    if result:
        provider_used = "gemini-2.5-flash"
    else:
        result = self._try_groq(prompt, institution_context, system_prompt)
        if result:
            provider_used = "groq-llama-3.1"
    # ... mock fallback, caching ...


def _try_gemini(self, prompt: str, context: dict,
                system_prompt: str | None = None) -> dict | None:
    if not self._gemini_client:
        return None
    try:
        effective_prompt = system_prompt or self._build_system_prompt()
        user_content = json.dumps({"requirement": prompt, "institution_context": context})
        response = self._gemini_client.generate_content(
            f"{effective_prompt}\n\nRequirement: {user_content}",
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.3,
            },
        )
        text = response.text.strip()
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

**Combined mock fix — the complete corrected `_mock_blueprint`:**

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
        },
        "roles": [
            {"name": "applicant", "permissions": ["application:create", "application:read"]},
            {"name": "reviewer", "permissions": ["application:read", "application:review"]},
            {"name": "admin", "permissions": ["application:*", "workflow:*"]},
        ],
        "events": [
            {"type": "application.submitted", "version": "1.0"},
            {"type": "application.reviewed", "version": "1.0"},
        ],
        "compliance_tags": ["ferpa"] if institution_type == "university" else ["gdpr"],
    }
```

**Verification:** After this fix, calling `POST /api/ai/blueprints/compile` with no AI provider keys should return `status="validated"` instead of `status="invalid"`. This is the single most critical fix — it unblocks local demo and testing.

### 0b. Async deploy fix

**File:** `apps/api/app/routes/ai.py`

**Bug 4 — sync route calling asyncio.create_task().**

The `deploy_blueprint` function is `def` (synchronous) but tries to call `asyncio.create_task()` on an async `EventEngine.emit()`. This crashes because there's no running event loop in a sync FastAPI route handler. The `asyncio.get_event_loop().is_running()` check sometimes returns `False`, silently swallowing the event emission.

```python
# CURRENT (broken):
@router.post("/ai/blueprints/{proposal_id}/deploy", status_code=201)
def deploy_blueprint(...):
    # ... creates workflow ...

    event_engine = EventEngine(db)
    import asyncio
    asyncio.create_task(
        event_engine.emit(...)
    ) if asyncio.get_event_loop().is_running() else None
```

**Fix — make the route async and await directly:**

```python
# FIXED:
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
        ai_prompt=proposal.prompt,  # NEW: store the original prompt
        deployed=True,
        created_by=current_user.id,
        deployed_at=utcnow_naive(),
    )
    db.add(workflow)

    proposal.status = "deployed"
    proposal.deployed_at = utcnow_naive()
    db.commit()
    db.refresh(workflow)

    # Emit event — await directly, no asyncio.create_task
    event_engine = EventEngine(db)
    try:
        await event_engine.emit(
            "ai.blueprint.deployed",
            tenant.institution_id,
            tenant.project_id,
            {"workflow_id": workflow.id, "workflow_name": workflow.name, "proposal_id": proposal_id},
        )
    except Exception:
        pass  # Event emission failure should not block deploy response

    return {
        "workflow_id": workflow.id,
        "workflow_name": workflow.name,
        "version": workflow.version,
        "message": "Blueprint deployed successfully",
    }
```

**Key changes:**

- `def deploy_blueprint` → `async def deploy_blueprint`
- `asyncio.create_task(...)` → `await event_engine.emit(...)`
- Removed `import asyncio` and the `get_event_loop().is_running()` check
- Added `ai_prompt=proposal.prompt` on the Workflow record (connects to prototype plan Part 1a)
- Wrapped the emit in try/except so event failure doesn't crash the deploy

**After the service registry lands (Phase 1a):** replace `EventEngine(db)` with `get_event_engine(db)` from `app.services`.

### 0c. Architect routing, RBAC, and fallback fix

**File:** `apps/api/app/routes/architect.py`

**Bug 5 (backend) — architect prompt calling generic provider without ERP system prompt.**

The `apply_prompt` route calls `router_instance.generate(user_prompt, {"mode": "erp_architect"})` but the generic `generate()` method ignores the mode key and uses the workflow compilation system prompt. The ERP_SYSTEM_PROMPT and ERP_COMPOSITION_SCHEMA are imported but never passed to the provider.

**Fix — pass the ERP system prompt explicitly:**

```python
# In apply_prompt(), change:
response = router_instance.generate(user_prompt, {"mode": "erp_architect"})

# To:
response = router_instance.generate(
    user_prompt,
    {"mode": "erp_architect"},
    system_prompt=ERP_SYSTEM_PROMPT,
)
```

This depends on Bug 6 being fixed first (the `system_prompt` parameter added to `generate()`).

**Bug 8 — RBAC not enforced.**

`check_permission` is imported but never applied to any route. Every architect endpoint is accessible to any authenticated user regardless of role.

**Fix — add RBAC to every route:**

```python
@router.post("/architect", status_code=201)
def create_architecture(
    body: ArchitectureCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),  # ADD THIS
):
    ...

@router.get("/architect")
def get_or_list_architectures(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:read")),  # ADD THIS
):
    ...

@router.get("/architect/{arch_id}")
def get_architecture(
    arch_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:read")),  # ADD THIS
):
    ...

@router.post("/architect/{arch_id}/prompt")
def apply_prompt(
    arch_id: str,
    body: PromptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),  # ADD THIS
):
    ...

@router.post("/architect/{arch_id}/link-workflow")
def link_workflow(
    arch_id: str,
    body: LinkWorkflowRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant=Depends(get_tenant_context),
    _=Depends(check_permission("architect:write")),  # ADD THIS
):
    ...

# GET routes for visualization, versions, available-workflows:
# Add _=Depends(check_permission("architect:read"))
```

**Note:** You also need to add `architect:read` and `architect:write` to the RBAC engine's built-in role permissions. Check `rbac_engine.py` and add these to the `owner` role's permissions list.

**Mock fallback fix — domain name extraction.**

The current fallback takes the last word of the prompt:

```python
# CURRENT (broken):
domain_name = body.prompt.strip().split()[-1].lower().replace(" ", "_")
# "Add admissions and finance domains" → "domains"
```

**Fix — extract meaningful domain names:**

```python
# FIXED:
_STOP_WORDS = {"add", "create", "new", "a", "an", "the", "domain", "domains",
               "for", "with", "and", "to", "from", "in", "of", "my", "our",
               "please", "i", "want", "need", "section", "department"}

def _extract_domain_ids_from_prompt(prompt: str) -> list[str]:
    """Extract likely domain names from a natural language prompt."""
    words = prompt.lower().strip().split()
    candidates = [
        w.replace(",", "").replace(".", "")
        for w in words
        if w.lower().replace(",", "").replace(".", "") not in _STOP_WORDS
        and len(w) > 2
    ]
    return candidates[:5] if candidates else ["general"]
```

Then in the fallback section of `apply_prompt`:

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

    # Apply all extracted domains
    old_graph = copy.deepcopy(arch.graph_json)
    new_graph = arch.graph_json
    for op in operations:
        new_graph = _apply_operation(new_graph, op)

    diff_summary = _compute_diff_summary(old_graph, new_graph)
    # ... rest of version recording and commit ...
```

Now "Add admissions and finance domains" correctly produces two domains: `admissions` and `finance`.

### 0d. Rate limiter coverage

**File:** `apps/api/app/middleware/rate_limit.py`

**Bug 9 — architect routes not rate-limited.**

The rate limiter checks `if "/api/ai/" in path:` which misses `/api/architect/` entirely. Architect prompt calls can be more expensive than blueprint compiles (full ERP composition), yet they fall through to the 600 req/min authenticated bucket.

**Fix — extend the AI rate limit condition:**

```python
# CURRENT:
if "/api/ai/" in path:
    limit_name = "ai"
    limit, window = LIMITS["ai"]
    key = f"orquestra:rl:ai:{ip}"

# FIXED:
if "/api/ai/" in path or "/api/architect/" in path:
    limit_name = "ai"
    limit, window = LIMITS["ai"]
    key = f"orquestra:rl:ai:{ip}"
```

Architect prompt calls now share the same 10 req/min throttle as AI blueprint calls.

### 0e. Frontend type alignment

**File:** `apps/web/src/types/contracts.ts`

Three type drifts between frontend and backend:

**Drift 1 — BlueprintEvent.** Frontend has `emit_on: string`. Backend schema requires `type` + `version`. Fix: change the frontend type to match:

```typescript
// FIXED:
export interface BlueprintEvent {
  type: string; // was "emit_on"
  version: string; // add this
}
```

**Drift 2 — BlueprintRole.** Frontend requires `id: string`. Backend roles never include an id field — only `name` and `permissions`. Fix: make id optional:

```typescript
// FIXED:
export interface BlueprintRole {
  id?: string; // optional, not required
  name: string;
  permissions: string[];
}
```

**Drift 3 — ValidationResult.** Frontend expects `schema.valid`, `graph.valid`, etc. Backend returns `stage_1_schema.valid`, `stage_2_graph_integrity.valid`, etc. Fix: add a backend-compatible type and a mapper:

```typescript
// Add to contracts.ts:
export interface BackendValidationResult {
  stage_1_schema: { valid: boolean; errors: string[] };
  stage_2_graph_integrity: { valid: boolean; errors: string[] };
  stage_3_permission_analysis: { valid: boolean; errors: string[] };
  stage_4_compliance: { valid: boolean; errors: string[] };
  is_valid: boolean;
}

// Add to console-api.ts:
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

**Bug 5 (frontend) — calling wrong endpoint.** The page calls `/api/ai/compile` (Mode A workflow blueprint) instead of `/api/architect/{id}/prompt` (Mode B ERP composition).

**Fix:** Rewire to proper two-step flow:

```typescript
// On mount:
const archRes = await fetch("/api/architect", { headers });
const { architecture } = await archRes.json();
// If null, auto-create:
if (!architecture) {
  await fetch("/api/architect", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Institutional ERP" }),
  });
}

// On generate:
const res = await fetch(`/api/architect/${archId}/prompt`, {
  method: "POST",
  headers,
  body: JSON.stringify({ prompt: userInput }),
});
const result = await res.json();
// result has: type, graph, diff, version, visualization_config
```

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

**Update:** `apps/api/conftest.py` or `pytest.ini` to load this file:

```python
# In conftest.py, at the top:
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_hermetic.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters-long")
os.environ.setdefault("REDIS_URL", "")
```

Tests now run with no Aiven, no Redis, no AI providers. The mock fallback handles AI calls. SQLite handles database. This must work before any structural changes are made.

---

## Phase 1: Structural additions

These connect to the prototype plan v2. The code is specified in detail there. This section explains how the AI layer specifically wires into each structural addition.

### 1a. Service registry — AI-specific wiring

**Prototype plan reference:** Part 10

The service registry (`apps/api/app/services.py`) provides singleton instances of `BlueprintGenerator`, `BlueprintContextBuilder`, and the `ProviderRouter`. After Phase 0 fixes are deployed, update the import pattern in AI routes:

```python
# routes/ai.py — BEFORE (Phase 0 state):
from app.ai.blueprint_generator import BlueprintGenerator
_generator = BlueprintGenerator()

# routes/ai.py — AFTER (Phase 1 state):
from app.services import get_blueprint_generator, get_context_builder, get_event_engine

# In compile_blueprint:
generator = get_blueprint_generator()
context_builder = get_context_builder()
project_context = context_builder.build(db, tenant.institution_id, tenant.project_id)
enriched_prompt = context_builder.enrich_prompt(body.prompt, project_context)
raw_blueprint = generator.compile(enriched_prompt, {**body.institution_context, **project_context})

# In deploy_blueprint:
await get_event_engine(db).emit(...)
```

The `EventEngine(db)` calls in `architect.py` also become `get_event_engine(db)`. The prompt endpoint in architect.py keeps using `get_provider_router()` which already returns a singleton.

### 1b. Mode-aware provider router

**Prototype plan reference:** Part 6 (provider_router.py modifications)

After Bug 6 is fixed in Phase 0 (system_prompt parameter added), the provider router is already mode-aware — callers pass the system prompt explicitly. No further changes needed to the router itself.

What needs to happen in each calling location:

**Mode A (workflow blueprint generation) — `routes/ai.py`:**

Uses the default system prompt (no `system_prompt` parameter). The prototype plan v2 Part 6 adds two lines to the system prompt about schema generation and context respect. Apply those additions to `_build_system_prompt()` in `provider_router.py`:

```python
def _build_system_prompt(self) -> str:
    return """You are an institutional ERP infrastructure compiler for Orquestra.
...existing rules...
- Include a "schema" section in the workflow with fields referenced in conditions
- Each schema field must have: name, type (string|number|boolean), required (true|false)
- Optionally include: min, max, enum, format for validation
- If existing workflows are described in PROJECT CONTEXT, reuse their field names and role names
- Suggest emit_events that could trigger integrations with existing workflows
- Return ONLY the JSON object, no markdown, no explanation"""
```

**Mode B (ERP composition) — `routes/architect.py`:**

Passes `system_prompt=ERP_SYSTEM_PROMPT` explicitly. The `ERP_SYSTEM_PROMPT` in `erp_schema.py` is already correct and doesn't need changes. The fix from Phase 0c makes it actually reach the provider.

**Mode C (template customization) — `ai/template_customizer/customizer.py`:**

Not critical for prototype. The customizer already has its own prompt logic. No changes needed.

### 1c. Context builder for Mode A

**Prototype plan reference:** Part 6

**New file:** `apps/api/app/ai/blueprint/context_builder.py`

The complete implementation is in the prototype plan v2, Part 6. The context builder extracts from existing deployed workflows: field names from conditions, schema field definitions, role names, event names, state names and terminal states.

**How it connects to the provider router:**

The enriched prompt from `context_builder.enrich_prompt()` is passed as the `prompt` argument to `generator.compile()`. It does NOT use the `system_prompt` parameter — it prepends project context to the user prompt itself. The system prompt stays the same (the default Mode A prompt with schema and context instructions from 1b).

This means:

- First workflow generation: plain user prompt → default system prompt → provider
- Second workflow generation: project context + user prompt → default system prompt → provider
- Architect prompt: user prompt → ERP system prompt → provider

Three different inputs to the same provider cascade. Clean separation.

**Also create `apps/api/app/ai/blueprint/__init__.py`:**

```python
"""Mode A — Blueprint generation with project-aware context."""
from app.ai.blueprint.context_builder import BlueprintContextBuilder

__all__ = ["BlueprintContextBuilder"]
```

### 1d. Schema-in-workflow definition

**Prototype plan reference:** Part 2

The system prompt changes from 1b instruct the AI to include a `schema` section in generated workflows. The mock blueprint should also include a schema section for consistency:

```python
# Add to the mock blueprint in provider_router.py:
def _mock_blueprint(prompt: str, context: dict) -> dict[str, Any]:
    return {
        "workflow": {
            "name": "generated_workflow",
            "initial_state": "submitted",
            "states": { ... },  # same as Phase 0a fix
            "schema": {
                "fields": [
                    {"name": "score", "type": "number", "required": True, "min": 0, "max": 100},
                    {"name": "name", "type": "string", "required": True},
                    {"name": "email", "type": "string", "required": True, "format": "email"},
                ]
            },
        },
        # ... roles, events, compliance_tags same as before
    }
```

**Important:** The `BLUEPRINT_SCHEMA` in `schema_engine.py` currently has `"additionalProperties": False` on the top-level object AND on the workflow object. This means adding a `schema` key inside `workflow` will fail validation because it's not listed in `properties`.

**Fix — update `schema_engine.py` to allow the schema key:**

```python
# In BLUEPRINT_SCHEMA, inside the "workflow" properties:
"workflow": {
    "type": "object",
    "required": ["name", "initial_state", "states"],
    "properties": {
        "name": {"type": "string"},
        "initial_state": {"type": "string"},
        "states": {"type": "object", "minProperties": 2},
        "schema": {                          # ADD THIS
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
},
```

Also remove `"additionalProperties": False` from the workflow object (keep it on the top-level to prevent random keys, but the workflow object needs to accept the optional schema). Or explicitly list schema in the properties (preferred, shown above).

### 1e. Gemini model upgrade

**Prototype plan reference:** Part 6 (provider_router.py modifications)

In `_init_clients()`, change:

```python
# CURRENT:
self._gemini_client = genai.GenerativeModel("gemini-1.5-flash")

# FIXED:
self._gemini_client = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")
```

In `_try_gemini()`, add `generation_config` with `response_mime_type` (already shown in Phase 0a fix).

This forces Gemini to return pure JSON without markdown wrapping, eliminating the need for the markdown-stripping code that currently exists:

````python
# REMOVE this from _try_gemini after adding response_mime_type:
if text.startswith("```"):
    lines = text.split("\n")
    text = "\n".join(lines[1:-1])
````

The `response_mime_type: "application/json"` makes the model output raw JSON natively. The stripping code was a workaround for the old model. Keep it as a safety fallback if you want, but it should no longer be needed.

---

## Complete file change summary

### Phase 0 — files modified

| File                                          | Changes                                                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/app/ai/provider_router.py`          | Fix mock (events type, compliance lowercase, flat conditions), add system_prompt parameter to generate/gemini/groq, upgrade Gemini model, add response_mime_type |
| `apps/api/app/routes/ai.py`                   | Make deploy_blueprint async, await emit directly, add ai_prompt to workflow, remove asyncio.create_task                                                          |
| `apps/api/app/routes/architect.py`            | Pass ERP_SYSTEM_PROMPT to generate(), add RBAC on all routes, fix mock fallback domain extraction                                                                |
| `apps/api/app/middleware/rate_limit.py`       | Extend AI rate limit to cover /api/architect/                                                                                                                    |
| `apps/web/src/types/contracts.ts`             | Fix BlueprintEvent type/version, BlueprintRole optional id, add BackendValidationResult                                                                          |
| `apps/web/src/app/console/architect/page.tsx` | Rewire to /api/architect endpoints                                                                                                                               |
| `apps/api/.env.test`                          | New file — hermetic test configuration                                                                                                                           |

### Phase 1 — files created

| File                                           | Purpose                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `apps/api/app/ai/blueprint/__init__.py`        | Module init for blueprint subpackage                          |
| `apps/api/app/ai/blueprint/context_builder.py` | Project-aware context for Mode A (from prototype plan Part 6) |

### Phase 1 — files modified

| File                                 | Changes                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `apps/api/app/routes/ai.py`          | Import from services registry, add context builder enrichment |
| `apps/api/app/ai/provider_router.py` | Add schema/context instructions to default system prompt      |
| `apps/api/app/core/schema_engine.py` | Add schema key to BLUEPRINT_SCHEMA workflow properties        |

### Not changed by this plan (handled by prototype plan v2)

| File                                      | Reason                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/api/app/models/__init__.py`         | Database changes (ArchWorkflow, APIKey columns, ai_prompt) — prototype plan Part 1 |
| `apps/api/app/services.py`                | Service registry — prototype plan Part 10                                          |
| `apps/api/app/core/api_key_utils.py`      | Key generation — prototype plan Part 7                                             |
| `apps/api/app/middleware/api_key_auth.py` | Runtime auth — prototype plan Part 8                                               |
| `apps/api/app/routes/runtime.py`          | Runtime API — prototype plan Part 8                                                |
| `apps/api/app/core/event_engine.py`       | Accept redis_client parameter — prototype plan Part 10                             |
| `apps/api/app/database.py`                | init_db SQLite-only — prototype plan Part 9                                        |

---

## Verification checklist

### Phase 0 verification (run after each fix)

- [ ] `POST /api/ai/blueprints/compile` with no AI keys returns `status="validated"` (not "invalid")
- [ ] Mock blueprint passes all 4 validation stages (schema, graph, permissions, compliance)
- [ ] Mock workflow conditions use flat field names (`score >= 70`, not `application_data.score >= 70`)
- [ ] `POST /api/ai/blueprints/{id}/deploy` completes without asyncio errors
- [ ] Deploy emits `ai.blueprint.deployed` event (visible in event stream or database)
- [ ] Deployed workflow has `ai_prompt` populated
- [ ] `POST /api/architect/{id}/prompt` with "Add admissions and finance domains" creates two domains (not one called "domains")
- [ ] Architect prompt calls use ERP_SYSTEM_PROMPT (verify by checking provider_used in response)
- [ ] Architect routes return 403 for users without architect permissions
- [ ] `/api/architect/` calls are rate-limited at 10 req/min (same as `/api/ai/`)
- [ ] Frontend architect page loads architecture on mount and sends prompts to correct endpoint
- [ ] Frontend blueprint types match backend response shapes
- [ ] Full test suite passes against SQLite with no network access: `pytest apps/api/tests`

### Phase 1 verification

- [ ] Context builder returns empty context for first workflow in project
- [ ] Context builder includes field names and roles from first deployed workflow when generating second
- [ ] AI-generated workflows include `schema.fields` in the definition JSON
- [ ] Mock blueprint includes schema section and passes validation
- [ ] `schema_engine.py` BLUEPRINT_SCHEMA accepts the schema key without validation failure
- [ ] Gemini 2.5 Flash returns raw JSON (no markdown code blocks)

---

## Stale files to clean up (Phase 3 from prototype plan)

These don't affect functionality but create confusion for developers and Claude Code:

| File                                         | Issue                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/app/workflow.py`                   | Old workflow engine at module root. Current engine is `core/workflow_engine.py`. Verify no imports reference it, then delete or move to `archive/`. |
| `apps/api/sql/supabase_rls.sql`              | Supabase is no longer used. Move to `archive/`.                                                                                                     |
| `apps/api/sql/supabase_storage_policies.sql` | Same. Move to `archive/`.                                                                                                                           |
| `apps/api/SUPABASE_RUNBOOK.md`               | Same. Move to `archive/`.                                                                                                                           |
| `README.md`                                  | Still says "OpenAI GPT-4 Turbo." Update to "Gemini 2.5 Flash → Groq → Mock."                                                                        |
| `apps/api/app/config.py`                     | `openai_api_key` and `openai_model` fields. Keep for backward compat but add a comment: "Legacy — not used by current provider cascade."            |
