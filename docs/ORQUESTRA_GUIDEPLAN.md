# Orquestra — Build Guide

## The three documents and when to use each

You have three plan documents. They cover different layers of the system and must be executed in a specific order. This guide tells you which document to open, which section to read, and what to do — for every step from broken baseline to functional prototype.

**Document 1: AI Implementation Plan** (`orquestra_ai_implementation_plan.md`)
Covers: bug fixes in the existing AI pipeline, mock contract alignment, async fixes, frontend type drift, provider router mode-awareness, context builder, schema-in-definition support.
Use when: you are working on anything in `app/ai/`, `app/routes/ai.py`, `app/routes/architect.py`, `app/core/schema_engine.py`, `app/middleware/rate_limit.py`, or any frontend file in `console/architect/` or `types/contracts.ts`.

**Document 2: Prototype Plan v2** (`orquestra_prototype_plan_v2.md`)
Covers: database schema changes, service registry, compile endpoint, runtime API, API key generation, event stream positioning, init_db fix, production optimization roadmap.
Use when: you are working on anything in `app/models/`, `app/services.py`, `app/core/api_key_utils.py`, `app/middleware/api_key_auth.py`, `app/routes/runtime.py`, `app/database.py`, or Alembic migrations.

**Document 3: Product Manual** (`orquestra_product_manual.md`)
Covers: vision, three surfaces, complete prototype flow explanation, every step from login to runtime API, event stream purpose, API key re-versioning, database model overview, AI subsystem overview, security model.
Use when: you need to understand WHY something is designed the way it is, when onboarding a new contributor, or when preparing a demo or pitch. This is the reference document, not the implementation document.

---

## Execution order — 20 steps

### Step 0: Verify your starting point

Before writing any code, confirm these:

- [ ] `apps/api/.env` has the Aiven DATABASE_URL configured
- [ ] `pip install -r apps/api/requirements.txt` succeeds (check for psycopg2-binary)
- [ ] `npm run dev` from the repo root starts both frontend and backend without import errors
- [ ] `POST /api/ai/blueprints/compile` returns a response (even if status is "invalid")

If any of these fail, fix the environment first. The plans assume the app starts.

---

### Step 1: Fix the mock contract

**Open:** AI Implementation Plan → Phase 0a

**Files to edit:**

- `apps/api/app/ai/provider_router.py`

**What to do:**
Change the `_mock_blueprint` function. Three changes in one file:

- Events: `"name"` → `"type"`
- Compliance tags: `"FERPA"` → `"ferpa"`, `"GDPR"` → `"gdpr"`
- Conditions: `"application_data.score >= 70"` → `"score >= 70"`

**Verify:**

```bash
cd apps/api && uvicorn app.main:app --reload
# In another terminal:
curl -X POST http://localhost:8000/api/ai/blueprints/compile \
  -H "Authorization: Bearer <your-jwt>" \
  -H "X-Institution-Id: <inst-id>" \
  -H "X-Project-Id: <proj-id>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "simple admissions", "institution_context": {"institution_type": "university"}}'
```

Response should show `"status": "validated"`, not `"status": "invalid"`.

**Do not proceed to Step 2 until this returns "validated".**

---

### Step 2: Fix the async deploy crash

**Open:** AI Implementation Plan → Phase 0b

**Files to edit:**

- `apps/api/app/routes/ai.py`

**What to do:**
Change `def deploy_blueprint` to `async def deploy_blueprint`. Remove the `asyncio.create_task` and `asyncio.get_event_loop()` lines. Replace with direct `await event_engine.emit(...)` wrapped in try/except. Add `ai_prompt=proposal.prompt` to the Workflow constructor.

**Verify:**

```bash
python -m pytest apps/api/tests/integration/test_workflow_and_events.py -v
```

The blueprint deploy test should pass without asyncio errors.

---

### Step 3: Fix the provider router system_prompt parameter

**Open:** AI Implementation Plan → Phase 0a (Bug 6 section)

**Files to edit:**

- `apps/api/app/ai/provider_router.py`

**What to do:**
Add `system_prompt: str | None = None` parameter to `generate()`, `_try_gemini()`, and `_try_groq()`. Each method uses `system_prompt or self._build_system_prompt()` as the effective prompt.

**Verify:**
This is verified in Step 4 when the architect route starts using it.

---

### Step 4: Fix architect routing, RBAC, and fallback

**Open:** AI Implementation Plan → Phase 0c

**Files to edit:**

- `apps/api/app/routes/architect.py`

**What to do:**
Three changes:

1. In `apply_prompt()`, pass `system_prompt=ERP_SYSTEM_PROMPT` to `router_instance.generate()`.
2. Add `_=Depends(check_permission("architect:write"))` or `"architect:read"` to every route.
3. Replace the last-word fallback with `_extract_domain_ids_from_prompt()`.

Also check `app/core/rbac_engine.py` and add `architect:read` and `architect:write` to the owner role's permissions if they're not already there.

**Verify:**

```bash
curl -X POST http://localhost:8000/api/architect/<arch-id>/prompt \
  -H "Authorization: Bearer <jwt>" \
  -H "X-Institution-Id: <inst>" \
  -H "X-Project-Id: <proj>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add admissions and finance domains"}'
```

Response should show two domains: `admissions` and `finance`. Not one domain called `domains`.

---

### Step 5: Fix rate limiter coverage

**Open:** AI Implementation Plan → Phase 0d

**Files to edit:**

- `apps/api/app/middleware/rate_limit.py`

**What to do:**
One line change. Extend `if "/api/ai/" in path:` to `if "/api/ai/" in path or "/api/architect/" in path:`.

**Verify:**
Make 11 rapid requests to `/api/architect/<id>/prompt`. The 11th should return 429.

---

### Step 6: Fix frontend types and architect page

**Open:** AI Implementation Plan → Phase 0e

**Files to edit:**

- `apps/web/src/types/contracts.ts`
- `apps/web/src/app/console/architect/page.tsx`

**What to do:**
Fix the three type drifts in contracts.ts (BlueprintEvent, BlueprintRole, ValidationResult). Rewire the architect page from `/api/ai/compile` to the proper `/api/architect` + `/api/architect/{id}/prompt` flow.

**Verify:**

```bash
cd apps/web && npm run build
```

Should build without type errors. Then manually test: open the console, navigate to Architect, type a prompt, see domains appear.

---

### Step 7: Create hermetic test environment

**Open:** AI Implementation Plan → Phase 0f

**Files to create:**

- `apps/api/.env.test`

**What to do:**
Create the file with SQLite database URL, dummy secret key, empty Redis/AI keys. Update conftest.py to load these defaults.

**Verify:**

```bash
cd apps/api && python -m pytest tests/ -v
```

All tests pass with no network access, no Aiven connection, no Redis.

**Phase 0 is now complete. Every existing bug is fixed. The baseline is correct.**

---

### Step 8: Create the service registry

**Open:** Prototype Plan v2 → Part 10

**Files to create:**

- `apps/api/app/services.py`

**Files to edit:**

- `apps/api/app/core/event_engine.py` (add optional `redis_client` parameter)

**What to do:**
Create `services.py` with singleton Redis, EventEngine factory, BlueprintGenerator singleton, ContextBuilder singleton, WorkflowEngine factory. Modify EventEngine's `__init__` to accept an external Redis client.

**Verify:**

```python
# In a Python shell:
from app.services import get_redis, get_event_engine, get_blueprint_generator
assert get_redis() is get_redis()  # Same instance
assert get_blueprint_generator() is get_blueprint_generator()  # Same instance
```

---

### Step 9: Add database schema changes

**Open:** Prototype Plan v2 → Part 1

**Files to edit:**

- `apps/api/app/models/__init__.py`

**What to do:**
Add `ai_prompt` column to Workflow. Add `ArchWorkflow` class. Add columns to APIKey (project_id, architecture_version_id, webhook_secret_hash, webhook_secret_prefix). No environment column.

**Then run:**

```bash
cd apps/api
alembic revision --autogenerate -m "add arch_workflows junction, link api_keys, add ai_prompt"
# Review the generated migration file in alembic/versions/
alembic upgrade head
```

**Verify:**
Check Aiven PG Studio: `arch_workflows` table exists, `api_keys` has new columns, `workflows` has `ai_prompt`.

---

### Step 10: Create the context builder

**Open:** AI Implementation Plan → Phase 1c (which references Prototype Plan v2 → Part 6)

**Files to create:**

- `apps/api/app/ai/blueprint/__init__.py`
- `apps/api/app/ai/blueprint/context_builder.py`

**What to do:**
Create the BlueprintContextBuilder class that reads existing deployed workflows and builds compact context summaries. The full code is in Prototype Plan v2 Part 6.

**Verify:**

```python
# With one deployed workflow in the project:
from app.services import get_context_builder
from app.database import SessionLocal
db = SessionLocal()
ctx = get_context_builder().build(db, "inst-id", "proj-id")
assert ctx["workflow_count"] >= 1
assert len(ctx["known_fields"]) > 0
```

---

### Step 11: Wire context builder into AI compile route

**Open:** AI Implementation Plan → Phase 1a (which references Prototype Plan v2 → Part 6 modifications to ai.py)

**Files to edit:**

- `apps/api/app/routes/ai.py`

**What to do:**
Import from services registry. In `compile_blueprint()`, build project context, enrich the prompt, merge context into institution_context, pass to generator.

**Verify:**
Deploy one workflow. Then compile a second blueprint. Check the AI prompt logs (or mock response) — the second prompt should reference fields from the first workflow.

---

### Step 12: Update schema engine for embedded schema support

**Open:** AI Implementation Plan → Phase 1d

**Files to edit:**

- `apps/api/app/core/schema_engine.py`

**What to do:**
Add the `schema` key to `BLUEPRINT_SCHEMA`'s workflow properties. This allows AI-generated blueprints to include field definitions without failing JSON Schema validation.

**Also update the mock blueprint** in `provider_router.py` to include a `schema` section.

**Verify:**

```python
from app.core.schema_engine import SchemaEngine
engine = SchemaEngine()
# A blueprint with schema should validate:
blueprint = {
    "workflow": {
        "name": "test",
        "initial_state": "submitted",
        "states": {"submitted": {"type": "initial", "transitions": []}, "done": {"type": "terminal", "transitions": []}},
        "schema": {"fields": [{"name": "score", "type": "number", "required": True}]}
    },
    "roles": [{"name": "admin", "permissions": ["application:*"]}],
    "events": [{"type": "app.submitted", "version": "1.0"}],
    "compliance_tags": ["ferpa"]
}
errors = engine.validate_blueprint(blueprint)
assert errors == []
```

---

### Step 13: Update the default system prompt

**Open:** AI Implementation Plan → Phase 1b

**Files to edit:**

- `apps/api/app/ai/provider_router.py`

**What to do:**
Add schema generation instructions and context-respect instructions to `_build_system_prompt()`. Also upgrade the Gemini model to `gemini-2.5-flash-preview-05-20` and add `response_mime_type: "application/json"` to `_try_gemini()`.

**Verify:**
Set your `GEMINI_API_KEY` in `.env`. Call compile with a real prompt. The response should include a `schema` section in the workflow definition and return raw JSON (no markdown wrapping).

---

### Step 14: Create API key utilities

**Open:** Prototype Plan v2 → Part 7

**Files to create:**

- `apps/api/app/core/api_key_utils.py`

**What to do:**
Create `generate_api_key(version_number)`, `generate_webhook_secret()`, and `verify_api_key(raw_key, stored_hash)`.

**Verify:**

```python
from app.core.api_key_utils import generate_api_key, generate_webhook_secret, verify_api_key
key = generate_api_key(1)
assert key["raw_key"].startswith("sk_erp_v1_")
assert verify_api_key(key["raw_key"], key["key_hash"])
secret = generate_webhook_secret()
assert secret["raw_secret"].startswith("whsec_erp_")
```

---

### Step 15: Build the compile endpoint

**Open:** Prototype Plan v2 → Part 7

**Files to edit:**

- `apps/api/app/routes/architect.py` (add compile endpoint to existing file)

**What to do:**
Add `POST /api/architect/{architecture_id}/compile` to the existing architect routes. This creates ArchitectureVersion, ArchWorkflow junction records, generates API key and webhook secret, emits event, returns raw credentials once. Full code is in Prototype Plan v2 Part 7.

**Verify:**

```bash
curl -X POST http://localhost:8000/api/architect/<arch-id>/compile \
  -H "Authorization: Bearer <jwt>" \
  -H "X-Institution-Id: <inst>" \
  -H "X-Project-Id: <proj>" \
  -H "Content-Type: application/json" \
  -d '{"workflow_ids": ["<deployed-wf-id>"], "key_name": "Test Key"}'
```

Response should contain `api_key` starting with `sk_erp_v1_` and `webhook_secret` starting with `whsec_erp_`.

---

### Step 16: Build the runtime API authentication

**Open:** Prototype Plan v2 → Part 8

**Files to create:**

- `apps/api/app/middleware/api_key_auth.py`

**What to do:**
Create `RuntimeAuthContext` and `get_runtime_auth` dependency that extracts Bearer token, hashes it, looks up APIKey, loads accessible workflow IDs from ArchWorkflow.

**Verify:**
This is verified in Step 17 when the runtime route uses it.

---

### Step 17: Build the runtime API routes

**Open:** Prototype Plan v2 → Part 8

**Files to create:**

- `apps/api/app/routes/runtime.py`

**Files to edit:**

- `apps/api/app/main.py` (register runtime_router, add CSRF skip for /api/v1/)

**What to do:**
Create the three runtime endpoints: POST /api/v1/applications, GET /api/v1/applications/{id}, GET /api/v1/applications. Register in main.py. Add CSRF exemption for /api/v1/ paths.

**Verify:**

```bash
# Use the API key from Step 15:
curl -X POST http://localhost:8000/api/v1/applications \
  -H "Authorization: Bearer sk_erp_v1_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "<wf-id>", "applicant_data": {"name": "Sarah", "score": 92}}'
```

Response should contain `application_id` and `current_state`.

---

### Step 18: Fix init_db for PostgreSQL/Alembic coexistence

**Open:** Prototype Plan v2 → Part 9

**Files to edit:**

- `apps/api/app/database.py`

**What to do:**
Modify `init_db()` to only call `Base.metadata.create_all()` for SQLite. PostgreSQL tables are managed by Alembic only.

**Verify:**
Restart the server with PostgreSQL DATABASE_URL. The startup log should say "Database connected (PostgreSQL — managed by Alembic)" not "Database initialized."

---

### Step 19: Run the full verification checklist

**Open:** Prototype Plan v2 → Part 12, AI Implementation Plan → Verification checklist

Go through every checkbox in both documents. The critical end-to-end test:

1. Create a project
2. Generate a workflow with AI (should include schema in definition)
3. Deploy it
4. Generate a second workflow — AI should reference fields from the first
5. Deploy it
6. Open Architect, create architecture, add domains, link workflows
7. Compile — get API key and webhook secret
8. Call POST /api/v1/applications with the key — application created
9. Check event stream — all events visible

---

### Step 20: Clean up stale files and sync documentation

**Open:** AI Implementation Plan → Stale files section, Prototype Plan v2 → Part 13

**What to do:**

- Delete or archive `apps/api/app/workflow.py` (superseded by `core/workflow_engine.py`)
- Move `apps/api/sql/supabase_*.sql` and `SUPABASE_RUNBOOK.md` to `archive/`
- Update `README.md` to say Gemini 2.5 Flash, not OpenAI GPT-4 Turbo
- Add comment to `config.py` on `openai_api_key`: "Legacy — not used by current provider cascade"
- Update `CLAUDE.md` with the version from the prototype plan discussions
- Verify all docs in `docs/` folder match implemented reality

---

## Quick reference — which document for which file

| File you're editing                      | Open this document                                                   | Section                                      |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| `app/ai/provider_router.py`              | AI Implementation Plan                                               | Phase 0a + 1b + 1e                           |
| `app/ai/blueprint_generator.py`          | AI Implementation Plan                                               | Phase 1a (service registry wiring)           |
| `app/ai/blueprint/context_builder.py`    | Prototype Plan v2                                                    | Part 6 (full code)                           |
| `app/ai/architect/*.py`                  | AI Implementation Plan                                               | Phase 0c (routing fix)                       |
| `app/ai/validators/*.py`                 | AI Implementation Plan                                               | Phase 0a (contract understanding)            |
| `app/core/schema_engine.py`              | AI Implementation Plan                                               | Phase 1d (BLUEPRINT_SCHEMA update)           |
| `app/core/condition_parser.py`           | AI Implementation Plan                                               | Phase 0a (dotted access context)             |
| `app/core/event_engine.py`               | Prototype Plan v2                                                    | Part 10 (redis_client parameter)             |
| `app/core/api_key_utils.py`              | Prototype Plan v2                                                    | Part 7 (full code)                           |
| `app/core/workflow_engine.py`            | Prototype Plan v2                                                    | Part 2 (schema validation at runtime)        |
| `app/models/__init__.py`                 | Prototype Plan v2                                                    | Part 1 (all three changes)                   |
| `app/services.py`                        | Prototype Plan v2                                                    | Part 10 (full code)                          |
| `app/routes/ai.py`                       | AI Implementation Plan                                               | Phase 0b + 1a                                |
| `app/routes/architect.py`                | AI Implementation Plan (bugs) + Prototype Plan v2 (compile endpoint) | Phase 0c + Part 7                            |
| `app/routes/runtime.py`                  | Prototype Plan v2                                                    | Part 8 (full code)                           |
| `app/routes/workflows.py`                | Prototype Plan v2                                                    | Part 10 (service registry migration)         |
| `app/middleware/rate_limit.py`           | AI Implementation Plan                                               | Phase 0d                                     |
| `app/middleware/api_key_auth.py`         | Prototype Plan v2                                                    | Part 8 (full code)                           |
| `app/database.py`                        | Prototype Plan v2                                                    | Part 9                                       |
| `app/main.py`                            | Prototype Plan v2                                                    | Part 8 (register runtime router + CSRF skip) |
| `web/src/types/contracts.ts`             | AI Implementation Plan                                               | Phase 0e                                     |
| `web/src/app/console/architect/page.tsx` | AI Implementation Plan                                               | Phase 0e                                     |
| `CLAUDE.md`                              | Separate file provided                                               | Replace entirely                             |
| `alembic/versions/`                      | Prototype Plan v2                                                    | Part 1d (migration procedure)                |
| `.env.test`                              | AI Implementation Plan                                               | Phase 0f                                     |

## Quick reference — which document for which concept

| Concept                                      | Document               | Section                                     |
| -------------------------------------------- | ---------------------- | ------------------------------------------- |
| Why no test/production split                 | Prototype Plan v2      | Part 3                                      |
| How schema lives in workflow definition      | Prototype Plan v2      | Part 2                                      |
| How API key re-versioning works              | Prototype Plan v2      | Part 4                                      |
| How event streams serve developers           | Prototype Plan v2      | Part 5                                      |
| How context-carrying works between workflows | Prototype Plan v2      | Part 6 (design) + AI Plan Phase 1c (wiring) |
| Why the mock was always returning "invalid"  | AI Implementation Plan | Phase 0a                                    |
| How Mode A vs Mode B use different prompts   | AI Implementation Plan | Phase 1b                                    |
| The complete end-to-end flow explained       | Product Manual         | Sections 4-7                                |
| Production optimization priorities           | Prototype Plan v2      | Appendix A                                  |
| The full database model with all 15 tables   | Product Manual         | Section 10                                  |
| Security model (JWT vs API key)              | Product Manual         | Section 13                                  |
| What the 5-minute demo looks like            | Product Manual         | Section 14                                  |
