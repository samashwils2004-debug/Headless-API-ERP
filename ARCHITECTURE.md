# Orquestra ERP — Complete Architecture Reference

## 1. System Overview

Orquestra is an AI-native, multi-tenant institutional ERP infrastructure platform built for universities and educational institutions. It lets administrators compose ERP systems by describing them in natural language, generates workflow state machines from those descriptions using an AI provider cascade, links them to domain modules (admissions, finance, attendance, etc.), and exposes them as a versioned runtime API that external systems can submit applications to. The platform has three embedded AI modes: **Mode A** (workflow blueprint generation from prompt), **Mode B** (ERP domain graph composition), and **Mode C** (pre-built template customization). The entire stack is a monorepo split into a FastAPI (Python 3.14) backend and a Next.js 16 App Router frontend.

---

## 2. Monorepo Structure

```
ERP project/                       ← workspace root
├── apps/
│   ├── api/                       ← FastAPI backend (Python 3.14)
│   │   ├── app/                   ← main application package
│   │   │   ├── main.py            ← FastAPI app, middleware, router registration
│   │   │   ├── config.py          ← Pydantic Settings (all env vars)
│   │   │   ├── database.py        ← SQLAlchemy engine, session factory, init_db()
│   │   │   ├── security.py        ← JWT creation/verification, bcrypt
│   │   │   ├── tenant.py          ← TenantContext dependency (X-Institution-Id / X-Project-Id)
│   │   │   ├── time_utils.py      ← UTC-aware datetime helpers
│   │   │   ├── services.py        ← Singleton registry (Redis, providers, engines)
│   │   │   ├── models/            ← SQLAlchemy ORM models (all in __init__.py)
│   │   │   ├── schemas/           ← Pydantic request/response schemas
│   │   │   ├── routes/            ← 10 router files (one resource each)
│   │   │   ├── core/              ← Business logic engines (workflow, event, RBAC, schema)
│   │   │   ├── ai/                ← AI modules (provider cascade, 3 modes, 4-stage validator)
│   │   │   ├── middleware/        ← Rate limiter, API key auth
│   │   │   └── ws/                ← WebSocket hub for event broadcasting
│   │   ├── alembic/               ← Database migration scripts
│   │   ├── tests/                 ← pytest integration + security tests
│   │   ├── seed_templates.py      ← Seeds pre-built workflow templates into DB
│   │   └── requirements.txt
│   └── web/                       ← Next.js 16 frontend (React 18 + TypeScript)
│       ├── src/app/               ← App Router: pages, layouts, API proxy routes
│       ├── src/components/        ← React components (console, landing, ui)
│       ├── src/lib/               ← Stores, API client, hooks, guards
│       └── src/types/             ← TypeScript type definitions
├── packages/                      ← Reserved for shared libs (currently empty)
├── scripts/                       ← Deployment helpers
├── docker-compose.yml             ← Redis + API + Web for local dev
├── package.json                   ← npm workspaces root (apps/web, packages/*)
└── CLAUDE.md                      ← Implementation guide (phased build plan)
```

---

## 3. External Services & Infrastructure

| Service | Role | Required? |
|---------|------|-----------|
| **Neon PostgreSQL** | Primary database (prod) — Alembic-managed schema, SSL, pooler | Required in prod |
| **SQLite** | Local development DB — auto-created by `init_db()` | Dev only |
| **Upstash Redis** | Rate limiting + AI response cache (24h TTL) + event streams | Optional |
| **Anthropic Claude Sonnet** | AI provider for blueprint gen + ERP design mockups | Optional (degrades to mock) |
| **Vercel** | Next.js frontend hosting | Production |
| **Render / Railway** | FastAPI backend hosting | Production |

All external services fail gracefully. Redis unavailable → rate limiting disabled, cache disabled. Claude unavailable → deterministic mock blueprint served. The system remains functional without any optional service.

---

## 4. Backend Architecture (`apps/api/`)

### 4a. FastAPI Entry Point & Middleware Stack

**File:** `apps/api/app/main.py`

The app is constructed with an `asynccontextmanager` lifespan that calls `init_db()` on startup (creates SQLite tables in dev, or connects to PostgreSQL in prod). Middleware is layered in this order (outermost to innermost):

```
Incoming Request
        │
        ▼
① CORSMiddleware
        Allow-Origins: localhost:3000 (dev) + Vercel URL (prod)
        Allow-Headers: Authorization, Content-Type, X-CSRF-Token,
                       X-Institution-Id, X-Project-Id
        │
        ▼
② RateLimitMiddleware   (app/middleware/rate_limit.py)
        Redis sliding-window, 4 tiers:
          /api/ai/* + /api/architect/*  → 200 req/min
          /api/auth/*                   → 60 req/min
          Authenticated (has Bearer)    → 1200 req/min
          Unauthenticated               → 100 req/min
        Returns 429 + Retry-After if exceeded
        │
        ▼
③ security_middleware
        CSRF enforcement on POST/PUT/PATCH/DELETE to /api/*
        Skipped for /api/v1/* (runtime API uses API key auth instead)
        Checks: csrf_token cookie == X-CSRF-Token header
        Sets csrf_token cookie if absent (readable by JS)
        │
        ▼
④ metrics_middleware
        Records Prometheus counters/histograms
        │
        ▼
Route Handler
```

**Special routes (no auth required):**

| Route | Response |
|-------|----------|
| `GET /health` | `{ status, version, environment }` |
| `GET /metrics` | Prometheus scrape endpoint |
| `WS /api/events/ws?institution_id=X&project_id=Y` | Real-time event broadcast |

---

### 4b. Router Map (10 Routers)

All console routes are JWT-authenticated. All require `X-Institution-Id` and `X-Project-Id` headers. All enforce RBAC permissions via the `check_permission()` FastAPI dependency.

| Prefix | File | RBAC Permission | Key Endpoints |
|--------|------|-----------------|---------------|
| `/api/auth` | `auth.py` | None (public) | `POST /login`, `POST /register` |
| `/api/projects` | `projects.py` | `project:read/write` | CRUD projects |
| `/api/workflows` | `workflows.py` | `workflow:read/write/deploy` | CRUD + deploy/undeploy |
| `/api/applications` | `applications.py` | `application:read/write` | Submit, list, transition state |
| `/api/events` | `events.py` | `event:read` | List events (paginated) |
| `/api/ai` | `ai.py` | `blueprint:compile/deploy` | Compile blueprint, deploy to workflow |
| `/api/templates` | `templates.py` | `template:read/deploy` | List, AI-customize, deploy |
| `/api/architect` | `architect.py` | `architect:read/write` | Domain graph CRUD, AI prompt, compile, bulk workflow link, UI design gen |
| `/api/api-keys` | `api_keys.py` | `api_key:read/write` | List, create, revoke API keys |
| `/api/v1` | `runtime.py` | API key (not JWT) | Submit / retrieve / list applications |

---

### 4c. Database Schema (SQLAlchemy ORM)

All models live in `apps/api/app/models/__init__.py`. Schema migrations are managed by Alembic (2 applied migrations: initial schema + `arch_workflows` junction).

```
Institution                              ← root tenant (name, domain)
  │
  └─► Project (institution_id)           ← scoped environment (test | production)
        │
        ├─► User (institution_id)        ← console login principal
        │       role: owner | reviewer | viewer
        │
        ├─► Workflow (institution_id, project_id)
        │       name, version (int), definition (JSON state machine)
        │       is_ai_generated, ai_prompt, deployed (bool), deployed_at
        │       [IMMUTABLE once deployed — new version required for changes]
        │
        │          └─► Application (workflow_id)
        │                  current_state, applicant_data (JSON), status
        │                  [running instance of the workflow]
        │
        ├─► BlueprintProposal (institution_id, project_id)
        │       prompt, status (pending | validated | invalid | deployed)
        │       blueprint (JSON), validation_result (JSON)
        │       provider_used, is_mock
        │
        ├─► InstitutionArchitecture (institution_id, project_id)
        │       graph_json (JSON)          ← ERP domain graph
        │       visualization_config (JSON)
        │       [ONE record per institution+project pair]
        │
        │          └─► ArchitectureVersion
        │                  version (int), graph_snapshot (JSON)
        │
        │                     └─► ArchWorkflow  ← junction table
        │                             workflow_id, workflow_version, display_order
        │
        │                     └─► APIKey (architecture_version_id)
        │                             key_hash, key_prefix
        │                             webhook_secret_hash, webhook_secret_prefix
        │                             is_active, expires_at
        │
        ├─► WorkflowTemplate             ← pre-built templates (seeded via seed_templates.py)
        │       category, definition (JSON)
        │
        │          └─► TemplateCustomization (template_id)
        │                  instruction, modified_definition (JSON), diff_json
        │
        └─► Event (institution_id, project_id)   ← immutable append-only audit log
                type, version, timestamp, data (JSON)
                [never updated or deleted — insert-only]

RolePermission         ← RBAC matrix (role → permission)
ProjectRoleBinding     ← user → project → role assignment
```

**Notable indexes:**
- GIN index on `workflows.definition` (PostgreSQL JSONB)
- Composite index on `(institution_id, project_id, timestamp)` for event queries
- Unique constraint on `(institution_id, project_id)` for `institution_architecture`
- Unique constraint on `(architecture_version_id, workflow_id)` for `arch_workflows`

---

### 4d. Authentication & Security

#### Console Users (JWT)

```
POST /api/auth/login
  → bcrypt.verify(password, password_hash)   [12 rounds]
  → issue HS256 JWT:
      access_token  — expires in 7 days
      refresh_token — expires in 30 days
  → set HttpOnly cookies:
      admitflow_access_token   (HttpOnly, Secure in prod, SameSite=Lax)
      refresh_token            (HttpOnly, Secure in prod, SameSite=Lax)
  → set readable cookies:
      csrf_token               (random UUID, JS-readable, for header echo)
      institution_id           (tenant context fallback)
```

**JWT access token payload:**
```json
{
  "sub": "<user_id>",
  "institution_id": "<uuid>",
  "role": "owner",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234567890
}
```

#### CSRF Double-Submit Cookie Pattern

- Browser reads `csrf_token` cookie value
- Sends it as `X-CSRF-Token` header on every mutation (POST/PUT/PATCH/DELETE)
- Backend compares: `csrf_token cookie == X-CSRF-Token header`
- Skipped entirely for `/api/v1/*` (runtime API uses API key auth instead)

#### Multi-Tenancy

Every request to every protected route must include:

```
X-Institution-Id: <institution uuid>
X-Project-Id:     <project uuid>
```

The `get_tenant_context()` FastAPI dependency extracts these and returns a frozen `TenantContext(institution_id, project_id)`. Every DB query then filters by both fields. Cross-tenant data access is impossible at the query level.

#### RBAC

`check_permission("workflow:deploy")` is a FastAPI dependency factory that:
1. Validates JWT via `get_current_user()`
2. Verifies `user.institution_id == tenant.institution_id` (cross-tenant guard)
3. Loads permissions from `RolePermission` table for the user's role
4. Raises HTTP 403 if the required permission is absent

**Default role permissions:**

| Role | Permissions |
|------|-------------|
| `owner` | `project:*`, `workflow:*`, `application:*`, `event:read`, `blueprint:*`, `api_key:*`, `template:*`, `architect:*` |
| `reviewer` | `project:read`, `workflow:read`, `application:read/write`, `event:read`, `blueprint:compile`, `template:read`, `architect:read` |
| `viewer` | `project:read`, `workflow:read`, `application:read`, `event:read`, `template:read`, `architect:read` |

#### Runtime API Keys

- **Format:** `sk_erp_v{version_number}_{random_hex}` — shown once on compile, never stored raw
- **Stored as:** `SHA256(raw_key)` in `api_keys.key_hash`
- **Bound to:** an `ArchitectureVersion` record → grants access only to workflows compiled into that specific version
- **Validation:** `app/middleware/api_key_auth.py` → `authenticate_runtime_key()`

---

### 4e. AI System — Three Modes

#### Mode A: Blueprint Generator

**Key files:** `app/ai/blueprint_generator.py`, `app/ai/provider_router.py`, `app/ai/blueprint/context_builder.py`, `app/ai/validators/`

```
User types a natural language prompt
        │
        ▼
BlueprintContextBuilder.build()
    Reads all deployed Workflows in the project
    Extracts: field names, role names, event types, schema definitions
    Returns enriched context (ensures new workflows reuse existing field names)
        │
        ▼
BlueprintContextBuilder.enrich_prompt()
    Prepends project context to the user prompt:
    "PROJECT CONTEXT — existing workflows: admissions_v1 (fields: score, email)..."
        │
        ▼
ProviderRouter.generate(enriched_prompt, context)
    ① Check Redis cache   [SHA256(prompt + context), 24h TTL]
       → serve immediately if cache hit
    ② Try Anthropic Claude Sonnet
       [claude-sonnet-4-5, max_tokens=8192, JSON response mode]
    ③ Fallback: deterministic mock blueprint
       [always passes all 4 validation stages]
        │
        ▼
Raw Blueprint JSON returned:
{
  "workflow": {
    "name": "admissions_workflow",
    "initial_state": "submitted",
    "states": {
      "submitted":    { "type": "initial",       "transitions": [...] },
      "under_review": { "type": "intermediate",  "transitions": [...] },
      "approved":     { "type": "terminal",      "transitions": [] },
      "rejected":     { "type": "terminal",      "transitions": [] }
    },
    "schema": {
      "fields": [
        { "name": "score", "type": "number", "required": true, "min": 0, "max": 100 }
      ]
    }
  },
  "roles":            [{ "name": "reviewer", "permissions": ["application:review"] }],
  "events":           [{ "type": "application.reviewed", "version": "1.0" }],
  "compliance_tags":  ["ferpa"]
}
        │
        ▼
4-Stage Validation Pipeline:
  Stage 1 — Schema (JSON Schema Draft 2020-12)
      Must have top-level keys: workflow, roles, events, compliance_tags
      Workflow must have: name, initial_state, states (≥ 2 states)

  Stage 2 — Graph Integrity
      initial_state must exist in states
      All transition.to targets must exist as state names
      At least one terminal state (empty transitions array)
      All states reachable from initial_state (no orphans)

  Stage 3 — Permission Analysis
      All roles must have ≥ 1 permission
      Permission strings must be "resource:action" format

  Stage 4 — Compliance
      compliance_tags must be present and lowercase
      Valid tags: ferpa, gdpr, dpdp, hipaa
        │
        ▼
BlueprintProposal record saved in DB
  status: "validated" or "invalid"
  validation_result: { stage_1_schema, stage_2_graph_integrity, ... }
        │
        ▼  (user clicks Deploy)
Workflow record created (deployed=True, deployed_at=now)
Event emitted: "ai.blueprint.deployed"
```

---

#### Mode B: Architect (ERP Domain Graph Composer)

**Key files:** `app/routes/architect.py`, `app/ai/architect/nlp_intent_parser.py`, `app/ai/architect/prompt_factory.py`, `app/ai/architect/visualization_generator.py`

```
User types: "Add student portal, fee management, and attendance tracking"
        │
        ▼
NLPIntentParser
    Extracts multi-word domain phrases, maps to snake_case IDs:
    student_portal, fee_management, attendance_tracking
    Returns list of operations: [add_domain, add_domain, add_domain]
        │
        ▼
PromptFactory
    Builds structured system prompt with ERP domain templates
    Valid operations: add_domain, link_workflow, add_integration,
                      remove_domain, update_domain
        │
        ▼
Anthropic Claude Sonnet
    Returns list of graph operations as JSON
        │
        ▼
_apply_operation()   ← pure function, applied sequentially in memory
    Mutates a copy of InstitutionArchitecture.graph_json:
    {
      "erp_system": {
        "domains": [
          { "id": "student_portal",  "label": "Student Portal",  "color": "#3b82f6",
            "workflow_id": "wf-uuid", "workflow_name": "admissions_workflow" },
          { "id": "fee_management",  "label": "Fee Management",  "color": "#8b5cf6" }
        ],
        "integrations": [
          { "from_domain": "student_portal", "to_domain": "fee_management", "type": "data" }
        ]
      }
    }
        │
        ▼
VisualizationGenerator
    Generates visualization_config for frontend graph rendering
    (node positions, edge styles, color assignments)
        │
        ▼
DB commit — single transaction (no race conditions)
Event emitted: "architecture.updated"
```

**Bulk workflow linking** (`POST /architect/{id}/link-workflow-bulk`):
Applies N domain↔workflow links sequentially in memory, commits once. Prevents the last-write-wins race condition that would occur with N parallel single-link requests.

**UI Mockup Generation** (`POST /architect/{id}/generate-design`):
Sends ALL domains + their compact workflow schemas (no character truncation) to Claude with the instruction to generate exactly one UI module per domain. Returns a `DesignSpec` containing modules, KPI stats, table columns, actions, and relationships.

**Compile** (`POST /architect/{id}/compile`):

```
Selected deployed workflow IDs
        │
        ▼
Validate all workflow_ids exist and are deployed in this tenant scope
        │
        ▼
Create ArchitectureVersion  (version N+1, snapshot of current graph_json)
        │
        ▼
Create ArchWorkflow junction records (one per selected workflow)
        │
        ▼
Generate API key pair (shown once — raw values never stored):
    raw_key:        sk_erp_v{N}_{random_hex}
    key_hash:       SHA256(raw_key)   ← stored in DB
    key_prefix:     sk_erp_v{N}_abc...  ← stored for display

    raw_secret:     whsec_erp_{random_hex}
    secret_hash:    SHA256(raw_secret)  ← stored in DB
    secret_prefix:  whsec_erp_abc...    ← stored for display
        │
        ▼
Create APIKey record (hashes only, never the raw values)
Emit "architecture.compiled" event
Return raw key + raw secret to caller (shown once in UI)
```

---

#### Mode C: Template Customizer

**Key files:** `app/routes/templates.py`, `app/ai/template_customizer/customizer.py`

```
User selects a pre-built template (e.g. "Student Admissions")
User types a customization instruction (e.g. "Add GRE score field and department approval step")
        │
        ▼
TemplateCustomizer
    Sends template definition + instruction to Claude
    Claude returns: modified_definition, change_summary, diff_json
        │
        ▼
4-stage validation on modified_definition
        │
        ▼
TemplateCustomization proposal saved in DB
        │
        ▼  (user clicks Deploy)
Workflow record created from modified_definition
```

---

### 4f. Workflow Engine (`app/core/workflow_engine.py`)

The engine is **deterministic** — no `eval()`, no dynamic code execution, no external calls during execution.

```python
async def execute_until_wait(application_id: str) -> Application:

    # 1. Load application and its workflow definition
    application = db.query(Application).filter(Application.id == application_id).first()
    workflow    = db.query(Workflow).filter(Workflow.id == application.workflow_id).first()
    definition  = workflow.definition

    # 2. Validate applicant_data against embedded schema
    schema_errors = schema_engine.validate_application(application.applicant_data)
    if schema_errors:
        raise HTTPException(422, detail=schema_errors)

    # 3. Execute transitions until terminal or wait state
    while True:
        state_config = definition["states"][application.current_state]

        if state_config["type"] == "terminal":
            break  # done

        matched = False
        for transition in state_config["transitions"]:
            if evaluate_condition(transition["condition"], application.applicant_data):
                application.current_state = transition["to"]
                if transition.get("emit_event"):
                    await event_engine.emit(transition["emit_event"], ...)
                matched = True
                break  # first matching transition wins

        if not matched:
            break  # wait state — no transition triggered

    db.commit()
    return application
```

**Condition evaluation** (`app/core/condition_parser.py`):
Parses flat-field expressions: `score >= 70`, `status == "active"`, `count > 0`
Fields are looked up directly in `applicant_data` dict.
Supported operators: `==`, `!=`, `>`, `<`, `>=`, `<=`
No arbitrary code execution is possible.

---

### 4g. Event Engine (`app/core/event_engine.py`)

Every state transition, blueprint deploy, architecture compile, and application submit calls `emit()`. The cascade is:

```
EventEngine.emit(event_type, institution_id, project_id, data, version="1.0")
        │
        ├─①─► INSERT INTO events (id, type, version, timestamp, institution_id, project_id, data)
        │          [CRITICAL — exception raised on failure; blocks the caller]
        │
        ├─②─► redis.xadd(f"events:{institution_id}:{project_id}", {...}, maxlen=20000)
        │          [GRACEFUL — logs warning on failure, execution continues]
        │
        └─③─► websocket_hub.broadcast(institution_id, project_id, event_json)
                   [GRACEFUL — logs warning on failure, execution continues]
```

The WebSocket hub (`app/ws/`) maintains a registry of connected clients indexed by `(institution_id, project_id)`. Any client connected to `WS /api/events/ws?institution_id=X&project_id=Y` receives every future event for that scope in real time.

---

## 5. Frontend Architecture (`apps/web/`)

### 5a. App Router Page Structure

```
src/app/
├── (landing)/                         ← Public marketing pages (separate layout)
│   ├── page.tsx                       → Home / hero
│   ├── architecture/page.tsx          → Architecture showcase
│   ├── demo/page.tsx                  → Live demo
│   └── pricing/page.tsx               → Pricing
│
├── (auth)/
│   └── login/page.tsx                 ← Login form (email + password)
│
├── console/                           ← Protected dashboard (requires valid JWT cookie)
│   ├── layout.tsx                     → ConsoleProvider + ConsoleShell wrapper
│   ├── page.tsx                       → Dashboard: stats, quick actions, live event feed
│   ├── projects/page.tsx              → Project CRUD
│   ├── templates/page.tsx             → Mode C: template browse + AI customize + deploy
│   ├── workflows/
│   │   ├── page.tsx                   → Workflow list + Quick Create (AI) + CanvasReviewModal
│   │   ├── new/page.tsx               → ReactFlow full canvas builder
│   │   ├── [id]/page.tsx              → Read-only ReactFlow diagram viewer
│   │   └── [id]/edit/page.tsx         → Editable canvas
│   ├── architect/page.tsx             → Mode B: ERP domain designer + mockup generator
│   ├── events/page.tsx                → Real-time event stream (WebSocket + REST)
│   ├── api-keys/page.tsx              → API key management
│   ├── settings/page.tsx              → Settings (placeholder)
│   └── ai/page.tsx                    → Mode A playground (Monaco editor JSON view)
│
├── docs/**                            ← Public documentation site
│
└── api/                               ← Next.js API proxy routes (thin layer, no business logic)
    ├── _utils.ts                      ← proxyJson(), authHeaderFromRequest(), tenantHeadersFromRequest()
    ├── auth/login/route.ts            → Sets httpOnly cookies on successful login
    ├── workflows/[id]/deploy/         → POST /api/workflows/{id}/deploy
    ├── architect/[id]/
    │   ├── prompt/route.ts            → POST /api/architect/{id}/prompt
    │   ├── generate-design/route.ts   → POST /api/architect/{id}/generate-design
    │   ├── link-workflow-bulk/route.ts→ POST /api/architect/{id}/link-workflow-bulk
    │   └── compile/route.ts           → POST /api/architect/{id}/compile
    └── ai/compile/route.ts            → POST /api/ai/blueprints/compile
```

---

### 5b. API Proxy Pattern

Every console API call follows this path:

```
Browser → console-api.ts → Next.js /api/... proxy → FastAPI /api/...
```

The proxy layer (`src/app/api/_utils.ts`) does three things on every request:

1. Reads the `access_token` cookie → adds `Authorization: Bearer {token}` header
2. Reads `X-Institution-Id`, `X-Project-Id`, `csrf_token` cookies → forwards as request headers
3. Validates CSRF for mutations: same-origin check + cookie value must match `x-csrf-token` header

The proxy never exposes secrets to the browser and never hardcodes tenant IDs.

---

### 5c. State Management (Zustand)

| Store | File | Persisted | Purpose |
|-------|------|-----------|---------|
| `useAuthStore` | `auth-store.ts` | No (memory) | Current user: `id`, `role`, `institution_id`, `email` |
| `useProjectStore` | `project-store.ts` | No (memory) | List of all projects the user has access to |
| `useProjectContextStore` | `project-context-store.ts` | `localStorage` | Currently selected project + institution — survives page refresh |
| `useWorkflowStore` | `workflow-store.ts` | `localStorage` | Workflows in the selected project + `selectedWorkflowId` |
| `useBlueprintStore` | `blueprint-store.ts` | No (memory) | AI-compiled blueprint + validation result — cleared on project switch |
| `useEventStore` | `event-store.ts` | No (memory) | Last 400 events — populated via WebSocket, cleared on project switch |

**ConsoleProvider** (`src/components/console/ConsoleProvider.tsx`) bootstraps on mount:

```
① getCurrentUser()       → useAuthStore.setUser()
② listProjects(tenant)   → useProjectStore.setProjects()
③ restore useProjectContextStore from localStorage
④ if context.projectId is set:
       listWorkflows(tenant) → useWorkflowStore.setWorkflows()
```

On project switch: `useWorkflowStore`, `useEventStore`, and `useBlueprintStore` are all cleared before re-fetching for the new project.

---

### 5d. Key Components

**ConsoleShell** (`src/components/console/ConsoleShell.tsx`)
- Persistent sidebar with 8 nav items
- Top context bar with institution name and project selector dropdown
- Project switch updates `useProjectContextStore`, clears stores, re-fetches workflows
- Mobile-responsive with hamburger menu and fixed sidebar on desktop

**WorkflowDiagramModal** (`src/components/console/WorkflowDiagramModal.tsx`)
- Full-screen read-only ReactFlow diagram
- `definitionToCanvas(definition)`: BFS from `initial_state` → computes `x,y` positions → returns `{ nodes, edges }`
- Three node types: `InitialNode` (blue), `IntermNode` (purple), `TerminalNode` (gray)
- `nodesDraggable={false}`, `nodesConnectable={false}` — purely for viewing
- Used in: workflow list page, architect page (eye icon next to linked workflow names)

**ERPDesign** (`src/components/console/ERPDesign.tsx`)
- Renders the `DesignSpec` JSON returned by `generate-design`
- Module carousel: each domain becomes a card with KPI stats, field list, action buttons, and a data table
- Table rows use a seeded deterministic RNG (seed = `moduleId`) → same fake data on every render

**MonacoEditorWrapper** (`src/components/console/MonacoEditorWrapper.tsx`)
- Configures Monaco to use the locally installed `monaco-editor` package instead of the jsDelivr CDN
- `loader.config({ monaco })` called at module initialization time
- All pages that use it load it via `dynamic({ ssr: false })` to avoid SSR issues

**ReactFlow** (`@xyflow/react@^12.10.2`)
- `ReactFlowProvider` wraps all diagram components
- CSS imported once in `console/layout.tsx` (not in root layout)
- Used in: `/console/workflows/new` (editable canvas builder), `WorkflowDiagramModal` (read-only), `/console/workflows/[id]` (view)

---

### 5e. Real-Time Event Flow

```
[FastAPI EventEngine.emit()]
        │
        ├─► PostgreSQL INSERT (events table)
        │
        └─► WebSocket hub.broadcast()
                │
                ▼
        [useEventStream hook]   src/lib/hooks/useEventStream.ts
            WebSocket client connects to:
            ws://localhost:8000/api/events/ws?institution_id=X&project_id=Y
            Auto-reconnects on close with exponential backoff (1.5s initial delay)
                │
                ▼
        [useEventStore.pushEvent(event)]
            Deduplicates by event id
            Keeps newest 400 events in memory
                │
                ▼
        [/console/events page]
            Re-renders event list (filtered by type + time range: 1h / 6h / 24h)
```

On page load, `GET /api/events?limit=200` backfills recent events from the database before the WebSocket connection is established.

---

## 6. End-to-End Request Flows

### Console Request (JWT-Authenticated)

```
User clicks "Link to all modules" on the Architect page
        │
        ▼
architect/page.tsx: handleLinkToAllModules(workflowId, workflowName)
    const domainIds = arch.graph_json.erp_system.domains.map(d => d.id)
    await linkAllWorkflowsToDomains(tenant, archId, { domain_ids, workflow_id, workflow_name })
        │
        ▼
console-api.ts: fetch("/api/architect/{id}/link-workflow-bulk", {
    method: "POST",
    headers: {
        "X-Institution-Id": tenant.institutionId,
        "X-Project-Id":     tenant.projectId,
        "X-CSRF-Token":     getCsrfFromCookie()
    },
    body: JSON.stringify({ domain_ids, workflow_id, workflow_name })
})
        │
        ▼
Next.js proxy: /api/architect/[id]/link-workflow-bulk/route.ts
    proxyJson() → reads access_token cookie → adds Authorization: Bearer header
    validates CSRF (same-origin + cookie == header)
        │
        ▼
FastAPI POST /api/architect/{id}/link-workflow-bulk
    ① RateLimitMiddleware   — check "ai/architect" tier (200 req/min, Redis)
    ② security_middleware   — verify CSRF cookie matches X-CSRF-Token header
    ③ get_current_user()    — validate JWT signature and expiry
    ④ get_tenant_context()  — extract institution_id + project_id from headers
    ⑤ check_permission()    — verify user role has "architect:write"
    ⑥ Route handler:
            Load InstitutionArchitecture (filter by institution_id + project_id)
            Verify workflow exists in tenant scope
            Loop domain_ids → _apply_operation() on graph_json copy (in memory)
            arch.graph_json = updated_graph   ← single assignment
            db.commit()                        ← single transaction
        │
        ▼
JSON response → proxy → browser
architect/page.tsx calls loadArch() → UI re-renders with updated graph
```

### Runtime Request (API Key-Authenticated)

```
External developer system:
    curl -X POST https://api.orquestra.app/api/v1/applications \
         -H "Authorization: Bearer sk_erp_v1_abc123..." \
         -d '{ "workflow_id": "wf-uuid", "applicant_data": { "score": 85, "name": "Alice" } }'
        │
        ▼
FastAPI /api/v1/applications  [no CSRF, no JWT]
    api_key_auth.py: authenticate_runtime_key()
        SHA256(raw_key) → lookup api_keys.key_hash in DB
        Verify is_active == True and not expired
        Load ArchWorkflow junctions for this key's architecture_version_id
        Build: accessible_workflow_ids = { wf.workflow_id for wf in arch_workflows }
        │
        ▼
    Verify body.workflow_id ∈ accessible_workflow_ids   → 403 if absent
    Load Workflow record, validate deployed == True
    Create Application record (initial_state from workflow definition)
    WorkflowEngine.execute_until_wait(application.id)
        Schema validation → state transitions → event emissions
    EventEngine.emit("application.submitted", institution_id, project_id, {...})
        │
        ▼
Response:
{
    "application_id": "app-uuid",
    "workflow_id":    "wf-uuid",
    "current_state":  "under_review",
    "status":         "active",
    "message":        "Application submitted successfully"
}
```

---

## 7. Deployment Topology

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  Zustand stores · ReactFlow · Monaco Editor · Recharts       │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTPS (port 443)
                           │  WSS  (WebSocket upgrade)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  VERCEL — Next.js 16 Frontend                │
│                                                              │
│  App Router: pages + layouts + API proxy routes              │
│  No secrets stored — only NEXT_PUBLIC_* env vars             │
│                                                              │
│  NEXT_PUBLIC_API_BASE_URL = https://api.your-domain.com      │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTP REST
                           │  WSS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│            RENDER / RAILWAY — FastAPI Backend                │
│                                                              │
│  uvicorn app.main:app  (Python 3.14)                         │
│  JWT auth · CSRF · RBAC · Rate limiting                      │
│  10 routers · 3 AI modes · Workflow engine · Event engine    │
│                                                              │
│  DATABASE_URL     = postgresql+psycopg2://neon...            │
│  REDIS_URL        = rediss://upstash...                      │
│  ANTHROPIC_API_KEY= sk-ant-...                               │
│  SECRET_KEY       = <32+ char random>                        │
│  CORS_ORIGINS     = ["https://your-app.vercel.app"]          │
└────────┬────────────────────┬──────────────────┬─────────────┘
         │                    │                  │
         ▼                    ▼                  ▼
┌─────────────────┐  ┌────────────────┐  ┌───────────────────┐
│  Neon           │  │  Upstash       │  │  Anthropic        │
│  PostgreSQL     │  │  Redis         │  │  Claude API       │
│                 │  │                │  │                   │
│  All ORM models │  │  Rate limiting │  │  Blueprint gen    │
│  Alembic mgmt   │  │  AI response   │  │  ERP design spec  │
│  SSL / TLS      │  │  cache (24h)   │  │                   │
│  [Required]     │  │  Event streams │  │  [Optional]       │
│                 │  │  [Optional]    │  │  degrades to mock │
└─────────────────┘  └────────────────┘  └───────────────────┘
```

### Local Development Stack (`docker-compose.yml`)

```
┌─────────────────────────────────────────┐
│  docker-compose up                      │
│                                         │
│  redis:7        → localhost:6379        │
│  FastAPI        → localhost:8000        │
│  Next.js        → localhost:3000        │
│                                         │
│  npm run dev  (at workspace root)       │
│  starts all three concurrently          │
└─────────────────────────────────────────┘
```

### Deployment Checklist

- [ ] `DATABASE_URL` points to Neon, not SQLite or Aiven
- [ ] `SECRET_KEY` is ≥ 32 characters, cryptographically random
- [ ] `CORS_ORIGINS` includes Vercel preview + production URLs
- [ ] `ENVIRONMENT=production`, `DEBUG=false`
- [ ] `alembic upgrade head` run in backend shell before first request
- [ ] Frontend has **no** `DATABASE_URL`, `SECRET_KEY`, or `ANTHROPIC_API_KEY` in Vercel env vars
- [ ] `python seed_templates.py` run to populate pre-built templates

---

## 8. Key Design Invariants

These constraints are enforced everywhere in the codebase. Violating any of them breaks the system's security or correctness guarantees.

| # | Invariant | Where Enforced |
|---|-----------|----------------|
| 1 | **Multi-tenant isolation** — every DB query filters by both `institution_id` AND `project_id` | All route handlers via `get_tenant_context()` |
| 2 | **Immutable deployed workflows** — a `Workflow` with `deployed=True` is never mutated; edits require a new version record | `immutabilityGuard.ts` (frontend) + 409 response (backend) |
| 3 | **Deterministic execution** — `WorkflowEngine` uses no `eval()`; conditions parsed via `condition_parser.py` | `app/core/workflow_engine.py` |
| 4 | **Events are append-only** — the `events` table has no UPDATE or DELETE paths | No `db.query(Event).update(...)` anywhere in codebase |
| 5 | **Graceful degradation** — Redis failure → no rate limits, no cache but service continues; Claude failure → mock blueprint served | `rate_limit.py`, `provider_router.py` |
| 6 | **API keys bound to architecture versions** — a key can only access workflows compiled into the specific `ArchitectureVersion` it was issued for | `api_key_auth.py` via `ArchWorkflow` junction lookup |
| 7 | **Secrets shown once** — raw API keys and webhook secrets are never stored; only `SHA256(raw)` is persisted | `app/core/api_key_utils.py` |
| 8 | **Single-transaction graph mutations** — all domain graph operations apply changes in memory then commit once | `architect.py`: `_apply_operation()` loop + single `db.commit()` |

---

## 9. Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend framework | FastAPI | Latest |
| Backend language | Python | 3.14 |
| ORM | SQLAlchemy | 2.x |
| DB migrations | Alembic | Latest |
| Primary database | Neon PostgreSQL | — |
| Local dev database | SQLite | — |
| Cache / streams | Upstash Redis | — |
| AI provider | Anthropic Claude Sonnet | `claude-sonnet-4-5` |
| Auth tokens | JWT HS256 + bcrypt | bcrypt 12 rounds |
| Frontend framework | Next.js App Router | 16 canary |
| Frontend language | TypeScript | 5.5 |
| React | React | 18.3 |
| CSS framework | Tailwind CSS | 4.x |
| State management | Zustand | 4.5 |
| Workflow diagrams | @xyflow/react (ReactFlow) | 12.x |
| Code editor | Monaco Editor | 0.55 |
| UI primitives | Radix UI + shadcn/ui | — |
| Charts | Recharts | 2.x |
| Icons | Lucide React | 0.487 |
| Toast notifications | Sonner | 2.x |
| Drag and drop | react-dnd | 16.x |
| Animations | motion (Framer) | 12.x |
| Frontend hosting | Vercel | — |
| Backend hosting | Render / Railway | — |
| Observability | Prometheus + Sentry (optional) | — |
| CI | GitHub Actions | — |
