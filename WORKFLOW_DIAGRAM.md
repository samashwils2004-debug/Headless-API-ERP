# Orquestra ERP — Workflow Diagram Reference

> This document describes every major process flow in the Orquestra monorepo as step-by-step sequences with actors, decision branches, data shapes, and exit conditions. Paste any individual flow into Eraser.io, Lucidchart AI, draw.io AI, Mermaid Live, or FigJam to generate a visual diagram.

---

## Actors Legend

| Actor | What it represents |
|-------|--------------------|
| **Browser** | End-user's browser running the Next.js React app |
| **Zustand** | Client-side state stores (useAuthStore, useProjectContextStore, etc.) |
| **console-api.ts** | Typed API client functions; adds tenant/CSRF headers |
| **Next.js Proxy** | `/api/` route handlers in `apps/web/src/app/api/` |
| **FastAPI** | Backend server (`apps/api/app/main.py`) |
| **Middleware** | CORS → RateLimiter → CSRF → metrics (layered in `main.py`) |
| **Auth Guard** | `get_current_user()` FastAPI dependency in `security.py` |
| **Tenant Guard** | `get_tenant_context()` FastAPI dependency in `tenant.py` |
| **RBAC Guard** | `check_permission()` FastAPI dependency in `rbac_engine.py` |
| **PostgreSQL** | Neon PostgreSQL (prod) or SQLite (dev) via SQLAlchemy |
| **Redis** | Upstash Redis — rate limits, AI response cache, event streams |
| **Claude** | Anthropic Claude Sonnet API (`claude-sonnet-4-5`) |
| **WorkflowEngine** | `apps/api/app/core/workflow_engine.py` |
| **EventEngine** | `apps/api/app/core/event_engine.py` |
| **WebSocket Hub** | `apps/api/app/ws/` — client registry + broadcast |
| **ProviderRouter** | `apps/api/app/ai/provider_router.py` |

---

## Flow 1 — User Authentication & Session Bootstrap

**Trigger:** User navigates to `/login` and submits email + password.

**Actors:** Browser → Next.js Proxy → FastAPI → PostgreSQL → Browser → Zustand

---

### 1.1 Login Request

```
Step 1   Browser
         User fills login form (email, password)
         POST /api/auth/login  [Next.js proxy route]
         Body: { email, password }

Step 2   Next.js Proxy  (apps/web/src/app/api/auth/login/route.ts)
         Forwards to FastAPI: POST http://localhost:8000/api/auth/login
         No auth headers needed (public endpoint)

Step 3   FastAPI Middleware
         ① CORS: origin allowed? → YES (localhost:3000 or Vercel domain)
         ② RateLimit: /api/auth/* tier → max 60 req/min per IP
            → [BLOCKED] → 429 Too Many Requests + Retry-After header
            → [ALLOWED] → continue
         ③ CSRF check: skipped (not a mutation on /api — it's the auth endpoint itself)

Step 4   FastAPI  (apps/api/app/routes/auth.py → POST /api/auth/login)
         Query: SELECT * FROM users WHERE email = ? AND institution_id = ?
         → [NOT FOUND] → 401 Unauthorized: "Invalid credentials"
         → [FOUND] →
             bcrypt.verify(password, user.password_hash)
             → [INVALID] → 401 Unauthorized: "Invalid credentials"
             → [VALID] → continue

Step 5   FastAPI  (apps/api/app/security.py)
         Create access_token (HS256 JWT, 7-day expiry):
         {
           "sub": user.id,
           "institution_id": user.institution_id,
           "role": "owner",
           "type": "access",
           "exp": now + 604800
         }
         Create refresh_token (HS256 JWT, 30-day expiry):
         { "sub": user.id, "type": "refresh", "exp": now + 2592000 }

Step 6   FastAPI → Next.js Proxy
         Response body: { access_token, refresh_token, user: { id, email, name, role } }

Step 7   Next.js Proxy
         Sets cookies on the browser response:
           admitflow_access_token  → HttpOnly, Secure(prod), SameSite=Lax, MaxAge=604800
           refresh_token           → HttpOnly, Secure(prod), SameSite=Lax, MaxAge=2592000
           csrf_token              → readable by JS (NOT HttpOnly), random UUID
           institution_id          → readable, for tenant context fallback

Step 8   Browser receives: { ok: true, user }
         Redirects to /console (or ?next= param if set)
```

### 1.2 Console Bootstrap (on /console page load)

```
Step 9   Browser  (ConsoleProvider mounts — apps/web/src/components/console/ConsoleProvider.tsx)

Step 10  console-api.ts → GET /api/auth/me
         Next.js Proxy reads access_token cookie → Authorization: Bearer header
         FastAPI validates JWT → returns { id, email, name, role, institution_id }
         → Zustand: useAuthStore.setUser(user)

Step 11  console-api.ts → GET /api/projects
         Headers: X-Institution-Id, X-Project-Id, X-CSRF-Token
         FastAPI returns list of projects for institution
         → Zustand: useProjectStore.setProjects(projects)

Step 12  Restore from localStorage:
         useProjectContextStore reads "orquestra-project-context"
         → [FOUND] → context = { projectId, institutionId, projectName, ... }
         → [NOT FOUND] → context = null → user must select project

Step 13  IF context.projectId is set:
         console-api.ts → GET /api/workflows
         Headers: X-Institution-Id (context.institutionId), X-Project-Id (context.projectId)
         FastAPI returns workflows for that project
         → Zustand: useWorkflowStore.setWorkflows(workflows)

Step 14  ConsoleShell renders with populated sidebar
         Project selector dropdown shows active project
         Dashboard stats begin loading
```

**Exit conditions:**
- SUCCESS: Zustand stores populated, /console renders
- FAILURE (wrong password): 401 → error toast on login page
- FAILURE (rate limited): 429 → "Too many attempts" toast
- FAILURE (token expired on /console load): redirect back to /login

---

## Flow 2 — Every Console Request: Security Gauntlet

**Trigger:** Any state-changing action in the console (POST, PUT, PATCH, DELETE).

**Actors:** Browser → console-api.ts → Next.js Proxy → Middleware → Auth Guard → Tenant Guard → RBAC Guard → Route Handler

```
Step 1   Browser / React component
         User takes action (e.g. clicks "Deploy Workflow")
         Calls console-api.ts function, e.g. deployWorkflow(tenant, id)

Step 2   console-api.ts  (apps/web/src/lib/console-api.ts)
         assertTenantContext(tenant) → throws if institutionId or projectId missing
         Reads csrf_token from document.cookie
         fetch("/api/workflows/{id}/deploy", {
           method: "POST",
           headers: {
             "X-Institution-Id": tenant.institutionId,
             "X-Project-Id":     tenant.projectId,
             "X-CSRF-Token":     csrfToken
           }
         })

Step 3   Next.js Proxy  (apps/web/src/app/api/workflows/[id]/deploy/route.ts)
         _utils.ts → proxyJson():
           hasSameOrigin()  → checks Origin header matches Host
           → [FAIL] → 403 CSRF origin mismatch
           hasValidCsrf()   → checks csrf_token cookie == x-csrf-token header
           → [FAIL] → 403 CSRF token invalid
           → [PASS] →
         Reads access_token cookie → Authorization: Bearer {token}
         Reads X-Institution-Id, X-Project-Id from request headers
         Forwards all to FastAPI: POST http://localhost:8000/api/workflows/{id}/deploy

Step 4   FastAPI Middleware  (apps/api/app/main.py)
         ① CORSMiddleware: origin in allow-list?
            → [NO]  → 400 / preflight fails
            → [YES] → continue
         ② RateLimitMiddleware  (apps/api/app/middleware/rate_limit.py)
            Path is /api/workflows/* → "authenticated" tier
            Redis ZREMRANGEBYSCORE (remove expired) + ZADD + ZCARD
            → [OVER LIMIT] → 429 + X-RateLimit-* headers + Retry-After
            → [UNDER LIMIT] → continue
         ③ security_middleware
            Path is /api/* (not /api/v1/*) and method is POST
            csrf_token cookie == X-CSRF-Token header?
            → [MISMATCH] → 403 "CSRF token mismatch"
            → [MATCH or both absent] → continue
         ④ metrics_middleware: record request start time

Step 5   FastAPI Route  →  get_current_user()  (apps/api/app/security.py)
         Authorization header → extract Bearer token
         → [MISSING] → 401 "Not authenticated"
         jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
         → [EXPIRED] → 401 "Token expired"
         → [INVALID] → 401 "Invalid token"
         → [VALID] → payload = { sub, institution_id, role }
         db.query(User).filter(User.id == payload["sub"]).first()
         → [NOT FOUND or inactive] → 401 "User not found"
         → [FOUND] → user object

Step 6   FastAPI Route  →  get_tenant_context()  (apps/api/app/tenant.py)
         X-Institution-Id header present?
         → [MISSING] → 400 "X-Institution-Id header required"
         X-Project-Id header present?
         → [MISSING] → 400 "X-Project-Id header required"
         → [BOTH PRESENT] → TenantContext(institution_id, project_id)

Step 7   FastAPI Route  →  check_permission("workflow:deploy")  (apps/api/app/core/rbac_engine.py)
         user.institution_id == tenant.institution_id?
         → [NO]  → 403 "Cross-tenant access denied"
         → [YES] →
         engine.has_permission(user.role, "workflow:deploy")?
         → [NO]  → 403 "Missing permission: workflow:deploy"
         → [YES] → _cu = user (passed to handler)

Step 8   Route Handler executes
         DB query filtered by tenant.institution_id + tenant.project_id
         Business logic runs
         EventEngine.emit() called
         db.commit()
         Return JSON response

Step 9   metrics_middleware records duration
         Response flows back: FastAPI → Proxy → Browser
         Browser: toast notification + UI re-render
```

**Exit conditions:**
- SUCCESS (200/201): UI updates, toast shown
- FAIL at Step 3: 403 from Next.js proxy (CSRF)
- FAIL at Step 4②: 429 Rate Limited
- FAIL at Step 4③: 403 CSRF mismatch (backend)
- FAIL at Step 5: 401 Unauthorized
- FAIL at Step 6: 400 Missing tenant headers
- FAIL at Step 7: 403 Forbidden (RBAC)

---

## Flow 3 — Mode A: AI Blueprint Generation

**Trigger:** User types a natural language prompt in `/console/ai` or Quick Create panel.

**Actors:** Browser → Next.js Proxy → FastAPI → BlueprintContextBuilder → ProviderRouter → Redis → Claude → 4-Stage Validator → PostgreSQL → EventEngine

```
Step 1   Browser  (/console/ai page or Quick Create panel)
         User types: "Create a student fee payment workflow with document verification"
         Clicks "Generate Blueprint"

Step 2   console-api.ts → POST /api/ai/compile
         Body: { prompt: "Create a student fee...", institution_context: { type: "university" } }
         Headers: X-Institution-Id, X-Project-Id, X-CSRF-Token

Step 3   Security Gauntlet (Flow 2, Steps 3–7)
         Required permission: "blueprint:compile"

Step 4   FastAPI  (apps/api/app/routes/ai.py → POST /api/ai/blueprints/compile)

Step 5   BlueprintContextBuilder.build()  (apps/api/app/ai/blueprint/context_builder.py)
         Query: SELECT * FROM workflows WHERE institution_id=? AND project_id=? AND deployed=true
         For each deployed workflow:
           Extract: schema field names, role names, event types
         Returns context:
         {
           "existing_workflows": [
             { "name": "admissions_v1", "states": [...], "schema_fields": ["score","email"] }
           ],
           "known_fields": ["score", "email", "program"],
           "known_roles": ["reviewer", "applicant"],
           "workflow_count": 1
         }

Step 6   BlueprintContextBuilder.enrich_prompt()
         Prepends context to user prompt:
         "PROJECT CONTEXT — existing workflows: admissions_v1 (fields: score, email)
          IMPORTANT: Reuse these field names where applicable.
          --- NEW WORKFLOW REQUEST ---
          Create a student fee payment workflow..."

Step 7   ProviderRouter.generate(enriched_prompt, context)
         (apps/api/app/ai/provider_router.py)

Step 8   Redis cache check:
         cache_key = SHA256(json({ prompt, context }))
         redis.get(cache_key)
         → [HIT]  → return cached result immediately (skip Steps 9–10)
         → [MISS] → continue to Step 9

Step 9   Try Claude Sonnet:
         model: claude-sonnet-4-5
         max_tokens: 8192
         system: ERP blueprint system prompt (field reuse, schema format rules)
         user: enriched_prompt
         → [API ERROR / TIMEOUT] → log warning, continue to Step 10
         → [SUCCESS] → raw_blueprint JSON (continue to Step 11)

Step 10  Mock fallback:
         _mock_blueprint(prompt, context)
         Returns deterministic admissions workflow with 4 states
         (submitted → under_review → approved / rejected)
         is_mock = True

Step 11  Cache result (if not mock):
         redis.setex(cache_key, 86400, json(raw_blueprint))

Step 12  Raw blueprint returned:
         {
           "workflow": {
             "name": "fee_payment_workflow",
             "initial_state": "submitted",
             "states": {
               "submitted":         { "type": "initial",       "transitions": [{...}] },
               "documents_pending": { "type": "intermediate",  "transitions": [{...}] },
               "payment_verified":  { "type": "intermediate",  "transitions": [{...}] },
               "approved":          { "type": "terminal",      "transitions": [] },
               "rejected":          { "type": "terminal",      "transitions": [] }
             },
             "schema": { "fields": [
               { "name": "fee_amount",  "type": "number",  "required": true, "min": 0 },
               { "name": "student_id",  "type": "string",  "required": true },
               { "name": "doc_verified","type": "boolean", "required": false }
             ]}
           },
           "roles": [{ "name": "accounts_officer", "permissions": ["application:review"] }],
           "events": [{ "type": "fee.submitted", "version": "1.0" }],
           "compliance_tags": ["ferpa"]
         }

Step 13  4-Stage Validation Pipeline  (apps/api/app/ai/blueprint_generator.py)

         STAGE 1 — Schema (apps/api/app/ai/validators/schema_validator.py)
           Validates against JSON Schema Draft 2020-12
           Checks: top-level keys (workflow, roles, events, compliance_tags)
           Checks: workflow has name, initial_state, states (≥ 2)
           → [INVALID] → stage_1 = { valid: false, errors: ["..."] }
           → [VALID]   → stage_1 = { valid: true, errors: [] }

         STAGE 2 — Graph Integrity (apps/api/app/ai/validators/graph_analyzer.py)
           initial_state exists in states?
           All transition.to targets exist as state names?
           At least one state with empty transitions[] (terminal)?
           All states reachable from initial_state? (BFS)
           → [INVALID] → stage_2 = { valid: false, errors: ["unreachable: payment_verified"] }
           → [VALID]   → stage_2 = { valid: true, errors: [] }

         STAGE 3 — Permission Analysis (apps/api/app/ai/validators/permission_analyzer.py)
           All roles have ≥ 1 permission?
           Permission strings are "resource:action" format?
           → [INVALID] → stage_3 = { valid: false, errors: [...] }
           → [VALID]   → stage_3 = { valid: true, errors: [] }

         STAGE 4 — Compliance (apps/api/app/ai/validators/compliance_checker.py)
           compliance_tags is non-empty array?
           Tags are lowercase and in recognized set (ferpa, gdpr, dpdp, hipaa)?
           → [INVALID] → stage_4 = { valid: false, errors: [...] }
           → [VALID]   → stage_4 = { valid: true, errors: [] }

Step 14  BlueprintProposal saved to PostgreSQL:
         status = "validated"  (if all 4 stages pass)
         status = "invalid"    (if any stage fails)
         validation_result = { stage_1_schema, stage_2_graph_integrity,
                                stage_3_permission_analysis, stage_4_compliance,
                                is_valid: true/false }

Step 15  Response to browser:
         { proposal_id, status, blueprint, validation_result, provider_used, is_mock }

Step 16  Browser shows blueprint JSON (Monaco editor) + validation result panel
         → [status="invalid"] → shows errors per stage, user can retry with different prompt
         → [status="validated"] → "Deploy" button enabled

Step 17  User clicks "Deploy"
         POST /api/ai/deploy/{proposal_id}
         Required permission: "blueprint:deploy"

Step 18  FastAPI  (apps/api/app/routes/ai.py → POST /api/ai/blueprints/{id}/deploy)
         Re-validate blueprint (proposal.blueprint) to prevent stale deploy
         → [fails re-validation] → 422 "Blueprint failed re-validation"
         → [passes] →

Step 19  Check existing workflow with same name:
         SELECT * FROM workflows WHERE name=? AND institution_id=? AND project_id=?
         version = existing.version + 1  (or 1 if new)

Step 20  Create Workflow record:
         INSERT INTO workflows (name, version, definition, is_ai_generated=true,
                                ai_prompt, deployed=true, deployed_at=now)

Step 21  Update BlueprintProposal: status = "deployed", deployed_at = now

Step 22  EventEngine.emit("ai.blueprint.deployed", institution_id, project_id, {
           workflow_id, workflow_name, proposal_id
         })

Step 23  Response: { workflow_id, workflow_name, version, message }
         Browser: closes panel, refreshes workflow list, shows success toast
```

**Exit conditions:**
- SUCCESS: Workflow record created and deployed, event emitted
- FAIL (invalid blueprint): User sees per-stage errors, can retry
- FAIL (Claude error): Mock blueprint returned (functional but not AI-tailored)
- FAIL (cache hit): Old cached result returned instantly (user must clear cache to force regeneration)

---

## Flow 4 — Workflow Engine Execution

**Trigger:** Application submitted to a deployed workflow (via console or runtime API).

**Actors:** FastAPI → WorkflowEngine → condition_parser → EventEngine → PostgreSQL

```
Step 1   FastAPI receives application submission
         (via /api/applications POST or /api/v1/applications POST)
         Body: { workflow_id, applicant_data: { score: 85, name: "Alice", email: "alice@inst.edu" } }

Step 2   Load Workflow definition from PostgreSQL:
         SELECT definition FROM workflows WHERE id=? AND deployed=true
         definition = {
           initial_state: "submitted",
           states: { submitted: {...}, under_review: {...}, approved: {...}, rejected: {...} },
           schema: { fields: [{ name: "score", type: "number", min: 0, max: 100 }] }
         }

Step 3   Create Application record:
         INSERT INTO applications (workflow_id, current_state="submitted",
                                   applicant_data, status="active", submitted_at=now)

Step 4   WorkflowEngine.execute_until_wait(application_id)
         (apps/api/app/core/workflow_engine.py)

Step 5   Schema validation:
         For each field in definition.schema.fields:
           Check applicant_data[field.name] exists (if required=true)
           Check type matches (number/string/boolean)
           Check min/max/enum constraints
         → [ERRORS] → raise 422 with list of schema errors
         → [VALID] → continue

Step 6   EXECUTION LOOP:
         current_state = "submitted"

         ITERATION 1:
           state_config = states["submitted"]
           state_config.type = "initial" → NOT terminal → continue
           For each transition in state_config.transitions:
             transition = { to: "under_review", condition: null, emit_event: "application.submitted" }
             condition = null → ALWAYS matches
             → Execute transition:
                 application.current_state = "under_review"
                 await EventEngine.emit("application.submitted", ...)
             break (first match wins)

         ITERATION 2:
           state_config = states["under_review"]
           state_config.type = "intermediate" → NOT terminal → continue
           Transition 1: { to: "approved",  condition: "score >= 70", emit_event: "application.reviewed" }
             condition_parser.evaluate("score >= 70", { score: 85, name: "Alice" })
             → extracts field: "score" → value: 85
             → 85 >= 70 → TRUE
             → Execute transition:
                 application.current_state = "approved"
                 await EventEngine.emit("application.reviewed", ...)
             break

         ITERATION 3:
           state_config = states["approved"]
           state_config.type = "terminal" → EXIT LOOP

Step 7   db.commit()  (application now has current_state = "approved", status = "active")

Step 8   Return application: { application_id, current_state: "approved", status: "active" }
```

**Condition evaluation (condition_parser.py) detail:**
```
Input: "score >= 70", applicant_data = { score: 85 }

Tokenize: ["score", ">=", "70"]
Extract field name: "score"
Lookup in applicant_data: 85
Parse operator: ">="
Parse value: 70 (number)
Evaluate: 85 >= 70 → True
```

**Exit conditions:**
- LOOP EXIT (terminal state): application reaches approved/rejected
- LOOP EXIT (no matching transition): application waits for manual transition
- FAIL (schema validation): 422 returned, application NOT created
- FAIL (workflow not found/deployed): 404

---

## Flow 5 — Mode B: ERP Architecture Composition

**Trigger:** User types a domain description in the Architect page NLP bar.

**Actors:** Browser → Next.js Proxy → FastAPI → NLPIntentParser → PromptFactory → Claude → _apply_operation → VisualizationGenerator → PostgreSQL

```
Step 1   Browser  (/console/architect page)
         User types: "Add admissions, fee management, and student performance modules"
         Clicks "Apply"

Step 2   console-api.ts → POST /api/architect/{id}/prompt
         Body: { prompt: "Add admissions, fee management..." }

Step 3   Security Gauntlet (Flow 2) — required permission: "architect:write"

Step 4   FastAPI  (apps/api/app/routes/architect.py → POST /architect/{id}/prompt)
         Load InstitutionArchitecture from DB:
         SELECT * FROM institution_architecture WHERE id=? AND institution_id=?

Step 5   NLPIntentParser  (apps/api/app/ai/architect/nlp_intent_parser.py)
         Split prompt into phrases, filter stop words
         Extract domain candidates: admissions, fee_management, student_performance
         Build operations list:
         [
           { "operation": "add_domain", "domain": { "id": "admissions",         "label": "Admissions" }},
           { "operation": "add_domain", "domain": { "id": "fee_management",      "label": "Fee Management" }},
           { "operation": "add_domain", "domain": { "id": "student_performance", "label": "Student Performance" }}
         ]

Step 6   PromptFactory.build()  (apps/api/app/ai/architect/prompt_factory.py)
         Builds structured system prompt for ERP composition:
         "You are an ERP domain architect. Current graph: {...}
          Valid operations: add_domain, link_workflow, add_integration, remove_domain
          User intent: Add admissions, fee management, student performance..."

Step 7   Claude Sonnet:
         Returns list of confirmed/enriched graph operations as JSON
         → [ERROR] → use operations from Step 5 directly (fallback)
         → [SUCCESS] → use Claude's operations

Step 8   Apply operations sequentially in memory:
         LOOP for each operation in operations:
           current_graph = _apply_operation(current_graph, operation)
           
           _apply_operation("add_domain"):
             current_graph.erp_system.domains.append({
               "id":    "admissions",
               "label": "Admissions",
               "color": "#3b82f6"   ← auto-assigned from palette
             })

         Final graph_json after all 3 operations:
         {
           "erp_system": {
             "domains": [
               { "id": "admissions",         "label": "Admissions",         "color": "#3b82f6" },
               { "id": "fee_management",      "label": "Fee Management",     "color": "#8b5cf6" },
               { "id": "student_performance", "label": "Student Performance","color": "#10b981" }
             ],
             "integrations": []
           }
         }

Step 9   VisualizationGenerator.generate(graph_json, linked_workflows)
         (apps/api/app/ai/architect/visualization_generator.py)
         Returns visualization_config:
         {
           "nodes": [
             { "id": "admissions",    "x": 100, "y": 200, "color": "#3b82f6" },
             { "id": "fee_management","x": 400, "y": 200, "color": "#8b5cf6" }
           ],
           "edges": []
         }

Step 10  Single DB commit:
         UPDATE institution_architecture SET graph_json=?, visualization_config=?, updated_at=now
         [SINGLE TRANSACTION — all domain additions atomic]

Step 11  Create ArchitectureVersion record:
         INSERT INTO architecture_versions (architecture_id, version=N+1,
                                            graph_snapshot=graph_json, prompt=user_prompt)

Step 12  EventEngine.emit("architecture.updated", ...)

Step 13  Response:
         { graph_json, visualization_config, version, diff_summary }

Step 14  Browser re-renders domain graph with new nodes
```

**Exit conditions:**
- SUCCESS: All domains added, graph updated atomically, visualization refreshed
- FAIL (Claude error): Falls back to NLPIntentParser-extracted operations (still functional)
- FAIL (architecture not found): 404

---

## Flow 6 — Workflow Linking & Bulk Domain-to-Workflow Link

**Trigger:** User clicks "Link to all modules" in the Architect compile panel.

**Actors:** Browser → Next.js Proxy → FastAPI → PostgreSQL

```
Step 1   Browser  (/console/architect page)
         User selects workflow "admissions_workflow" from dropdown
         Clicks "Link to all modules"

Step 2   architect/page.tsx: handleLinkToAllModules(workflowId, workflowName)
         domainIds = arch.graph_json.erp_system.domains.map(d => d.id)
         → ["admissions", "fee_management", "student_performance"]

Step 3   console-api.ts → linkAllWorkflowsToDomains(tenant, archId, {
           domain_ids:    ["admissions", "fee_management", "student_performance"],
           workflow_id:   "wf-uuid-123",
           workflow_name: "admissions_workflow"
         })

Step 4   POST /api/architect/{id}/link-workflow-bulk
         Security Gauntlet (Flow 2) — permission: "architect:write"

Step 5   FastAPI  (apps/api/app/routes/architect.py → BulkLinkWorkflowRequest)
         Validate workflow exists in tenant scope:
         SELECT * FROM workflows WHERE id=? AND institution_id=? AND project_id=?
         → [NOT FOUND] → 404 "Workflow not found in this project"
         → [FOUND] →

Step 6   Apply all domain links IN MEMORY (no DB reads inside loop):
         graph = arch.graph_json  ← loaded ONCE before loop
         for domain_id in ["admissions", "fee_management", "student_performance"]:
           graph = _apply_operation(graph, {
             "operation": "link_workflow",
             "workflow_link": {
               "domain_id":     domain_id,
               "workflow_id":   "wf-uuid-123",
               "workflow_name": "admissions_workflow"
             }
           })
         
         After loop, graph has all 3 domains updated:
         { "id": "admissions", "workflow_id": "wf-uuid-123", "workflow_name": "admissions_workflow" }
         { "id": "fee_management", ... same ... }
         { "id": "student_performance", ... same ... }

Step 7   SINGLE DB commit:
         arch.graph_json = graph        ← single write
         arch.updated_at = now
         db.commit()
         [Prevents race condition: old parallel approach did N reads + N writes,
          last write won. Now: 1 read + 1 write, atomic.]

Step 8   Response: { linked_count: 3, workflow_id, workflow_name, graph }

Step 9   Browser: loadArch() re-fetches architect state → graph re-renders with all 3 links shown
```

**Exit conditions:**
- SUCCESS: All N domains linked to workflow in a single transaction
- FAIL (workflow not in project): 404
- FAIL (arch not found): 404

---

## Flow 7 — Architecture Compile & API Key Generation

**Trigger:** User clicks "Compile Architecture" in the Architect page.

**Actors:** Browser → Next.js Proxy → FastAPI → PostgreSQL → api_key_utils

```
Step 1   Browser  (/console/architect page → compile panel)
         User selects checkboxes for workflows to include:
         ✓ admissions_workflow (v2, deployed)
         ✓ fee_payment_workflow (v1, deployed)
         Clicks "Compile"

Step 2   console-api.ts → compileArchitecture(tenant, archId, {
           workflow_ids: ["wf-uuid-1", "wf-uuid-2"],
           key_name: "Production Key"
         })

Step 3   POST /api/architect/{id}/compile
         Security Gauntlet (Flow 2) — permission: "architect:write"

Step 4   FastAPI  (apps/api/app/routes/architect.py → POST /architect/{id}/compile)

Step 5   Validate all workflow IDs:
         SELECT * FROM workflows WHERE id IN (?) AND institution_id=? AND project_id=?
         → [ANY MISSING] → 404 "Workflows not found: {missing_ids}"
         → [ANY NOT DEPLOYED] → 400 "Workflows not deployed: {names}"
         → [ALL VALID] → continue

Step 6   Get next version number:
         SELECT MAX(version) FROM architecture_versions WHERE architecture_id=?
         version_number = max_version + 1  (or 1 if first compile)

Step 7   Create ArchitectureVersion:
         INSERT INTO architecture_versions (
           architecture_id, institution_id, version=N,
           graph_snapshot=arch.graph_json, created_by=user.id, created_at=now
         )
         db.flush()  ← get arch_version.id without committing

Step 8   Create ArchWorkflow junctions:
         for i, workflow in enumerate(workflows):
           INSERT INTO arch_workflows (
             architecture_version_id, workflow_id,
             workflow_version, display_order=i
           )

Step 9   Generate API key pair  (apps/api/app/core/api_key_utils.py):
         raw_key    = "sk_erp_v{N}_{secrets.token_hex(16)}"
         key_hash   = SHA256(raw_key)      ← stored in DB
         key_prefix = raw_key[:16] + "..."  ← stored for display only
         
         raw_secret    = "whsec_erp_{secrets.token_hex(16)}"
         secret_hash   = SHA256(raw_secret)
         secret_prefix = raw_secret[:16] + "..."

Step 10  Create APIKey record:
         INSERT INTO api_keys (
           institution_id, project_id, architecture_version_id,
           name="Production Key", key_hash, key_prefix,
           webhook_secret_hash, webhook_secret_prefix,
           is_active=true, created_by=user.id
         )
         [RAW KEY AND RAW SECRET ARE NEVER STORED]

Step 11  db.commit()  ← commits ArchitectureVersion + all ArchWorkflows + APIKey atomically

Step 12  EventEngine.emit("architecture.compiled", institution_id, project_id, {
           architecture_version_id, version_number, workflows_linked: 2
         })

Step 13  Response (raw values shown ONCE only):
         {
           "architecture_version_id": "av-uuid",
           "version_number": 3,
           "workflows_linked": 2,
           "api_key":              "sk_erp_v3_a1b2c3d4e5f6...",  ← SHOWN ONCE
           "api_key_prefix":       "sk_erp_v3_a1b2...",
           "webhook_secret":       "whsec_erp_x7y8z9...",         ← SHOWN ONCE
           "webhook_secret_prefix":"whsec_erp_x7y...",
           "message": "Architecture v3 compiled. Save these credentials."
         }

Step 14  Browser: shows raw key + secret in a "copy before dismissing" modal
         After user dismisses: only prefix shown in API Keys page (full key gone forever)
```

**Exit conditions:**
- SUCCESS: ArchitectureVersion + ArchWorkflows + APIKey created; raw credentials shown once
- FAIL (undeployed workflow): 400
- FAIL (workflow not in project): 404

---

## Flow 8 — ERP UI Mockup Generation

**Trigger:** User clicks "Generate UI Mockup" on the Architect page.

**Actors:** Browser → Next.js Proxy → FastAPI → PostgreSQL → Claude → ERPDesign component

```
Step 1   Browser  (/console/architect page)
         Architecture has 5 domains, 3 with linked workflows
         User clicks "Generate UI Mockup"

Step 2   console-api.ts → generateERPDesign(tenant, archId)
         POST /api/architect/{id}/generate-design

Step 3   Security Gauntlet — permission: "architect:write"

Step 4   FastAPI  (apps/api/app/routes/architect.py → POST /architect/{id}/generate-design)
         Load arch.graph_json → domains list (ALL 5 domains)

Step 5   Build compact domain context (no truncation):
         For EACH domain in domains:
           entry = { id, label, color }
           IF domain has workflow_id:
             Load workflow from DB
             IF workflow.definition has schema:
               compact_fields = [{ name, type } for each field]  ← minimal, saves tokens
             entry.workflow = { name, states: [...], fields: compact_fields }
           domain_context.append(entry)
         
         context = {
           system_name: "MCC Undergraduate ERP",
           total_domains: 5,
           domains: [
             { id: "admissions", label: "Admissions", color: "#3b82f6",
               workflow: { name: "admissions_workflow",
                          states: ["submitted","under_review","approved","rejected"],
                          fields: [{ name: "score", type: "number" }] }},
             { id: "fee_management", label: "Fee Management", color: "#8b5cf6",
               workflow: { ... }},
             { id: "student_performance", label: "Student Performance", color: "#10b981",
               workflow: { ... }},
             { id: "library",    label: "Library",    color: "#f59e0b" },  ← no workflow
             { id: "counseling", label: "Counseling", color: "#ef4444" }   ← no workflow
           ],
           integrations: [{ from: "admissions", to: "fee_management" }]
         }

Step 6   User prompt sent to Claude:
         "Design an ERP UI mockup for: MCC Undergraduate ERP
          There are 5 domains total — you MUST generate one module for each.
          Domain and workflow data: {full context JSON, no truncation}"
         
         System prompt rules (key rules):
         "- CRITICAL: Generate exactly ONE module for EVERY domain in the domains array
          - For domains with a linked workflow: use workflow states for actions[], schema fields for fields[]
          - For domains WITHOUT a linked workflow: infer fields/actions from domain label
          - nav_position is 1-based, every module gets a unique position from 1 to N"

Step 7   Claude returns DesignSpec:
         {
           "system_name": "MCC Undergraduate ERP",
           "modules": [
             {
               "id": "mod_admissions",  "domain_id": "admissions",
               "label": "Admissions",   "nav_position": 1,
               "color": "#3b82f6",      "icon": "GraduationCap",
               "primary_entity": "Application",
               "fields": [{ "name": "score", "type": "number", "label": "Entrance Score" }],
               "actions": ["Submit", "Review", "Approve", "Reject"],
               "stats": [
                 { "label": "Total Applications", "value": "1,247", "trend": "up" },
                 { "label": "Approval Rate",      "value": "68%",   "trend": "flat" },
                 { "label": "Pending Review",     "value": "342",   "trend": "down" },
                 { "label": "Avg Score",          "value": "74.2",  "trend": "up" }
               ],
               "table_columns": [
                 { "key": "name",   "label": "Applicant",  "type": "text" },
                 { "key": "score",  "label": "Score",      "type": "number" },
                 { "key": "status", "label": "Status",     "type": "badge",
                   "badge_values": ["Submitted","Under Review","Approved","Rejected"] },
                 { "key": "date",   "label": "Submitted",  "type": "date" }
               ]
             },
             { ... module for fee_management ... },
             { ... module for student_performance ... },
             { ... module for library (inferred from label) ... },
             { ... module for counseling (inferred from label) ... }
           ],
           "relationships": [
             { "from_module": "mod_admissions", "to_module": "mod_fee_management",
               "type": "one_to_many", "label": "triggers payment" }
           ],
           "nav_groups": [
             { "label": "Academic",     "module_ids": ["mod_admissions","mod_student_performance"] },
             { "label": "Finance",      "module_ids": ["mod_fee_management"] },
             { "label": "Student Life", "module_ids": ["mod_library","mod_counseling"] }
           ],
           "layout": "sidebar_nav"
         }

Step 8   Save to DB:
         arch.visualization_config = {
           ...existing_config,
           "design_spec": design_spec,
           "design_generated_at": now,
           "provider_used": "claude-sonnet-4-5"
         }
         db.commit()

Step 9   Response: { design_spec, provider_used, is_mock }

Step 10  Browser: ERPDesign component renders
         (apps/web/src/components/console/ERPDesign.tsx)
         Module carousel with 5 tabs (one per domain)
         Each tab: 4 KPI stat cards + field list + action buttons + data table
         Table rows: seeded deterministic fake data (RNG seed = module.id)
```

**Exit conditions:**
- SUCCESS: All N domains rendered as modules (even those without linked workflows)
- FAIL (Claude error): Mock ERP spec or empty response; user retries

---

## Flow 9 — Mode C: Template Customization & Deployment

**Trigger:** User browses pre-built templates and customizes one with AI.

**Actors:** Browser → Next.js Proxy → FastAPI → TemplateCustomizer → Claude → 4-Stage Validator → PostgreSQL

```
Step 1   Browser  (/console/templates page)
         Templates loaded: GET /api/templates?category=higher_ed
         User sees: "Student Admissions", "Fee Payment", "Attendance Tracking"
         User clicks "Customize" on "Student Admissions"

Step 2   User types customization instruction:
         "Add a GRE score field, a departmental approval step before final decision,
          and rename 'applicant' role to 'candidate'"

Step 3   console-api.ts → customizeTemplate(tenant, templateId, instruction)
         POST /api/templates/{id}/customize
         Body: { instruction: "Add a GRE score field..." }

Step 4   Security Gauntlet — permission: "template:read"

Step 5   FastAPI  (apps/api/app/routes/templates.py)
         Load template from DB: SELECT * FROM workflow_templates WHERE id=?

Step 6   TemplateCustomizer  (apps/api/app/ai/template_customizer/customizer.py)
         Sends to Claude:
           system: "You are an ERP workflow customizer. Modify the given workflow definition
                    according to the instruction. Return modified_definition + change_summary + diff."
           user: json({ original_definition: template.definition, instruction })

Step 7   Claude returns:
         {
           "modified_definition": {
             ... original states + new "department_review" state inserted ...
             schema.fields: [...original, { name: "gre_score", type: "number" }],
             roles: [{ name: "candidate", permissions: [...] }]   ← renamed from "applicant"
           },
           "change_summary": "Added GRE score field, inserted department_review state...",
           "diff_json": { "added_states": ["department_review"], "renamed_roles": [...] }
         }

Step 8   4-Stage Validation on modified_definition (same pipeline as Flow 3, Step 13)
         All 4 stages run against modified_definition

Step 9   Save TemplateCustomization:
         INSERT INTO template_customizations (
           template_id, institution_id, project_id,
           instruction, modified_definition, diff_json,
           validation_result, change_summary,
           provider_used, is_mock, created_by
         )

Step 10  Response: { customization_id, modified_definition, validation_result, change_summary }

Step 11  Browser shows diff view (original vs modified) + validation panel
         → [invalid] → shows errors, user can retry
         → [valid]   → "Deploy as Workflow" button enabled

Step 12  User clicks "Deploy"
         POST /api/templates/{id}/deploy
         Required permission: "template:deploy"

Step 13  FastAPI creates Workflow record from modified_definition
         Workflow is deployed=true immediately (template deploys are always deployed)
         EventEngine.emit("template.deployed", ...)

Step 14  Browser: redirects to /console/workflows, shows new workflow in list
```

**Exit conditions:**
- SUCCESS: Customized workflow created and deployed
- FAIL (invalid after customization): User sees validation errors, can retry with different instruction
- FAIL (Claude error): Falls back to original template without modification

---

## Flow 10 — Runtime API: External Application Submission

**Trigger:** External developer system submits an application via REST API using an API key.

**Actors:** External App → FastAPI → api_key_auth → ArchWorkflow → WorkflowEngine → EventEngine → PostgreSQL

```
Step 1   External system sends:
         POST https://api.orquestra.app/api/v1/applications
         Authorization: Bearer sk_erp_v3_a1b2c3d4e5f6...
         Content-Type: application/json
         {
           "workflow_id":    "wf-uuid-admissions",
           "applicant_data": { "score": 85, "name": "Bob Smith", "email": "bob@student.edu" }
         }

Step 2   FastAPI Middleware (main.py)
         ① CORS: allowed
         ② RateLimitMiddleware: "authenticated" tier (1200 req/min)
         ③ security_middleware: PATH starts with /api/v1/ → CSRF CHECK SKIPPED
         ④ metrics_middleware: record

Step 3   FastAPI Route  (apps/api/app/routes/runtime.py → POST /v1/applications)
         get_runtime_auth(authorization="Bearer sk_erp_v3_...", db)
         → authenticate_runtime_key()  (apps/api/app/middleware/api_key_auth.py)

Step 4   API key authentication:
         raw_key = "sk_erp_v3_a1b2c3d4e5f6..."
         key_hash = SHA256(raw_key)
         SELECT * FROM api_keys WHERE key_hash=? AND is_active=true
         → [NOT FOUND]    → 401 "Invalid or inactive API key"
         → [FOUND] →
         api_key.expires_at < now?
         → [EXPIRED] → 401 "API key has expired"
         → [VALID] →
         Update: api_key.last_used_at = now

Step 5   Load accessible workflow IDs:
         SELECT workflow_id FROM arch_workflows
         WHERE architecture_version_id = api_key.architecture_version_id
         accessible_ids = { "wf-uuid-admissions", "wf-uuid-fee-payment" }

Step 6   Validate access:
         body.workflow_id ("wf-uuid-admissions") IN accessible_ids?
         → [NO]  → 403 "Workflow not available in this architecture version"
         → [YES] → continue

Step 7   Load Workflow:
         SELECT * FROM workflows WHERE id=? AND institution_id=? AND deployed=true
         → [NOT FOUND or not deployed] → 404
         → [FOUND] →

Step 8   Schema validation (if workflow has embedded schema):
         Validate body.applicant_data against workflow.definition.schema.fields
         → [ERRORS] → 422 { "schema_errors": ["Missing required field: score"] }
         → [VALID] →

Step 9   Create Application:
         initial_state = workflow.definition.initial_state  ("submitted")
         INSERT INTO applications (institution_id, project_id, workflow_id,
                                   workflow_version, applicant_data,
                                   current_state="submitted", status="active", submitted_at=now)

Step 10  WorkflowEngine.execute_until_wait(application.id)
         (Full execution — see Flow 4)
         final_state = "approved"  (if score >= 70)

Step 11  EventEngine.emit("application.submitted", institution_id, project_id, {
           application_id, workflow_id, initial_state
         })
         IF final_state != initial_state:
           EventEngine.emit("workflow.transitioned", ..., {
             application_id, from_state: "submitted", to_state: "approved"
           })

Step 12  Response 201:
         {
           "application_id": "app-uuid-xyz",
           "workflow_id":    "wf-uuid-admissions",
           "current_state":  "approved",
           "status":         "active",
           "message":        "Application submitted successfully"
         }
```

**Exit conditions:**
- SUCCESS (201): Application created, workflow executed, events emitted
- FAIL (401): Invalid/expired API key
- FAIL (403): Workflow not in this architecture version
- FAIL (404): Workflow not deployed
- FAIL (422): Schema validation errors in applicant_data

---

## Flow 11 — Real-Time Event System: Three-Channel Cascade

**Trigger:** Any EventEngine.emit() call (from workflow transitions, blueprint deploys, architecture compiles, etc.).

**Actors:** EventEngine → PostgreSQL → Redis → WebSocket Hub → useEventStream → useEventStore → Browser

```
Step 1   EventEngine.emit() called with:
         event_type      = "application.reviewed"
         institution_id  = "inst-uuid"
         project_id      = "proj-uuid"
         data            = { application_id: "app-uuid", from: "submitted", to: "approved" }
         version         = "1.0"
         (apps/api/app/core/event_engine.py)

Step 2   CHANNEL 1 — PostgreSQL (CRITICAL / BLOCKING):
         Generate event_id = UUID
         INSERT INTO events (id, type, version, timestamp=now,
                             institution_id, project_id, data)
         → [DB ERROR] → raise exception (blocks caller, event is NOT emitted further)
         → [SUCCESS]  → event_id available, continue

Step 3   CHANNEL 2 — Redis Stream (GRACEFUL / NON-BLOCKING):
         redis.xadd(
           name=f"events:{institution_id}:{project_id}",
           fields={ id, type, version, timestamp, data_json },
           maxlen=20000, approximate=True
         )
         → [REDIS UNAVAILABLE] → log warning, continue (does NOT fail caller)
         → [SUCCESS] → event in Redis stream

Step 4   CHANNEL 3 — WebSocket Hub (GRACEFUL / NON-BLOCKING):
         hub.broadcast(institution_id, project_id, event_json)
         Looks up connected clients for (institution_id, project_id) key
         For each connected WebSocket:
           await ws.send_json(event_data)
           → [CLIENT DISCONNECTED] → remove from registry, continue
           → [SEND ERROR] → log warning, continue
         → [HUB ERROR] → log warning, continue (does NOT fail caller)

Step 5   useEventStream hook receives message  (browser side)
         (apps/web/src/lib/hooks/useEventStream.ts)
         WebSocket.onmessage handler fires
         event_data = JSON.parse(message.data)

Step 6   useEventStore.pushEvent(event_data)
         (apps/web/src/lib/stores/event-store.ts)
         Check: events.find(e => e.id === event_data.id) — deduplicate
         → [DUPLICATE] → ignore
         → [NEW] →
             events = [event_data, ...events].slice(0, 400)  ← keep newest 400

Step 7   /console/events page re-renders
         New event appears at top of list
         Filtered by: event type selector, time range (1h / 6h / 24h)
```

**Failure modes and graceful degradation:**
```
PostgreSQL DOWN → emit() throws → caller receives 500 error → no event stored anywhere
Redis DOWN      → Step 3 skipped silently → DB event saved, WS broadcast happens, no stream
WebSocket DOWN  → Step 4 skipped silently → DB event saved, Redis stream written
Browser offline → Events accumulate in DB/Redis → backfill on reconnect (Flow 12)
```

---

## Flow 12 — WebSocket Connection & Event Stream Backfill

**Trigger:** User navigates to `/console/events` or any console page that subscribes to events.

**Actors:** Browser → Next.js (REST) → FastAPI (REST) → PostgreSQL → Browser → FastAPI (WebSocket) → WebSocket Hub

```
Step 1   Browser navigates to /console/events
         useEventStream hook mounts  (apps/web/src/lib/hooks/useEventStream.ts)

Step 2   REST BACKFILL (immediate):
         GET /api/events?limit=200
         Next.js Proxy → FastAPI → PostgreSQL:
           SELECT * FROM events
           WHERE institution_id=? AND project_id=?
           ORDER BY timestamp DESC LIMIT 200
         Response: { events: [...200 most recent events] }
         useEventStore.setEvents(events)  ← replaces current list

Step 3   WebSocket CONNECTION:
         ws = new WebSocket(
           "ws://localhost:8000/api/events/ws?institution_id=X&project_id=Y"
         )

Step 4   WebSocket.onopen:
         Hub registers this client:
           hub.clients[(institution_id, project_id)].add(ws)
         (Future events will be broadcast to this ws)

Step 5   STEADY STATE:
         New events arrive via ws.onmessage → useEventStore.pushEvent() (Flow 11, Steps 5–7)

Step 6   WebSocket.onclose (disconnection):
         Reconnect with exponential backoff:
         attempt 1: wait 1.5s
         attempt 2: wait 1.5 × 1.5 = 2.25s
         attempt 3: wait 3.375s
         ... up to a maximum delay cap
         Go back to Step 3

Step 7   On reconnect (after gap):
         Re-run REST backfill (Step 2) to fetch events missed during disconnection
         Then re-establish WebSocket (Steps 3–5)
```

**Exit conditions:**
- NORMAL: WebSocket stays connected, events stream in real time
- RECONNECT: Automatic backoff reconnect on any disconnection
- OFFLINE: Events accumulate in PostgreSQL; backfill catches up on next connect

---

## Flow 13 — Canvas Builder: Manual Workflow Creation

**Trigger:** User opens `/console/workflows/new` to build a workflow visually without AI.

**Actors:** Browser (ReactFlow) → console-api.ts → Next.js Proxy → FastAPI → BlueprintGenerator → PostgreSQL

```
Step 1   Browser navigates to /console/workflows/new
         ReactFlow canvas renders empty
         (apps/web/src/app/console/workflows/new/page.tsx)

Step 2   USER BUILDS STATE MACHINE ON CANVAS:

         Add Initial State:
           User drags "Initial" node type onto canvas
           Node created: { id: "state_1", type: "initial", label: "submitted" }

         Add Intermediate State:
           User drags "Intermediate" node onto canvas
           Node created: { id: "state_2", type: "intermediate", label: "under_review" }

         Add Terminal States:
           User drags two "Terminal" nodes
           Nodes: { id: "state_3", label: "approved" }, { id: "state_4", label: "rejected" }

         Draw Transitions (edges):
           User draws edge from state_1 → state_2
           Edge properties panel opens: { condition: null, emit_event: "application.submitted" }
           User draws edge state_2 → state_3
           Sets condition: "score >= 70", emit_event: "application.approved"
           User draws edge state_2 → state_4
           Sets condition: "score < 70", emit_event: "application.rejected"

Step 3   useNodesState + useEdgesState manage canvas state:
         nodes = [state_1, state_2, state_3, state_4]
         edges = [edge_1_2, edge_2_3, edge_2_4]

Step 4   User clicks "Compile Workflow"
         canvasToDefinition(nodes, edges) converts ReactFlow graph to blueprint:
         {
           "workflow": {
             "name": "manual_workflow",
             "initial_state": "submitted",
             "states": {
               "submitted":  { "type": "initial",      "transitions": [{ "to": "under_review", "condition": null }] },
               "under_review":{ "type": "intermediate","transitions": [
                                 { "to": "approved", "condition": "score >= 70" },
                                 { "to": "rejected", "condition": "score < 70" }
                               ]},
               "approved":   { "type": "terminal",     "transitions": [] },
               "rejected":   { "type": "terminal",     "transitions": [] }
             }
           },
           "roles": [],
           "events": [],
           "compliance_tags": ["ferpa"]
         }

Step 5   4-Stage Validation runs client-side OR via API:
         POST /api/ai/compile  (with prompt="" and pre-set blueprint)
         → Validation result shown in panel

Step 6   User clicks "Deploy"
         POST /api/workflows  ← create workflow (not yet deployed)
         Body: { name: "manual_workflow", definition: {... from Step 4}, is_ai_generated: false }
         
         POST /api/workflows/{id}/deploy  ← deploy it
         workflow.deployed = true, workflow.deployed_at = now

Step 7   EventEngine.emit("workflow.deployed", ...)

Step 8   Browser:
         Closes canvas
         Redirects to /console/workflows
         New workflow appears in list with "Deployed" badge

Step 9   Alternatively (Quick Create from workflow list page):
         User generates blueprint via AI prompt (Flow 3, Steps 1–16)
         → blueprintToCanvas() converts blueprint → ReactFlow nodes/edges
         → Full-screen CanvasReviewModal opens
         → User can edit nodes/edges before deploying
         → handleCanvasDeploy() → createWorkflow + deployWorkflow
```

**Exit conditions:**
- SUCCESS: Workflow created and deployed, visible in workflow list
- FAIL (graph invalid): Validation shows errors (missing terminal state, orphaned nodes, etc.)
- FAIL (name collision): 409 if workflow name already exists at same version

---

## Summary: Flow Trigger Map

| What user does | Flow |
|----------------|------|
| Logs in | Flow 1 |
| Any console mutation (deploy, create, link, etc.) | Flow 2 (security gauntlet) |
| Types AI prompt → Generate Blueprint | Flow 3 |
| Submits application (console or runtime) | Flow 4 (workflow engine) |
| Types domain description in Architect | Flow 5 |
| Clicks "Link to all modules" | Flow 6 |
| Clicks "Compile Architecture" | Flow 7 |
| Clicks "Generate UI Mockup" | Flow 8 |
| Customizes a pre-built template | Flow 9 |
| External app calls /v1/applications | Flow 10 |
| Any state change (deploy, submit, compile) | Flow 11 (event cascade) |
| Opens /console/events page | Flow 12 (WebSocket + backfill) |
| Builds workflow on canvas | Flow 13 |

---

## Data State Transitions: Key Entities

### Workflow lifecycle
```
[DRAFT]
  name, definition defined
  deployed = false
       │
       ▼  POST /api/workflows/{id}/deploy
[DEPLOYED]
  deployed = true
  deployed_at = now
  IMMUTABLE — definition never changes
       │
       ▼  New version created
[VERSIONED]
  version = 2 (new record, not mutation of v1)
```

### BlueprintProposal lifecycle
```
[PENDING]
  status = "pending"
  (immediately after creation, before validation)
       │
       ▼  4-stage validation
[VALIDATED]              [INVALID]
  status = "validated"     status = "invalid"
  is_valid = true          is_valid = false
       │
       ▼  POST /api/ai/blueprints/{id}/deploy
[DEPLOYED]
  status = "deployed"
  deployed_at = now
```

### Application lifecycle
```
[CREATED]
  current_state = initial_state (e.g. "submitted")
  status = "active"
       │
       ▼  WorkflowEngine.execute_until_wait()
[IN PROGRESS]
  current_state = "under_review"
  (intermediate state — waiting for condition match)
       │
       ▼  Condition matches OR manual transition
[TERMINAL]
  current_state = "approved" OR "rejected"
  status = "active" (still active record, just in terminal state)
```

### ArchitectureVersion lifecycle
```
[DRAFT GRAPH]
  InstitutionArchitecture.graph_json
  (mutable — domains added/removed/linked via prompts)
       │
       ▼  POST /api/architect/{id}/compile
[COMPILED VERSION]
  ArchitectureVersion (immutable snapshot)
  ArchWorkflow junctions (which workflows are in this version)
  APIKey issued (sk_erp_v{N}_* — shown once)
```
