# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Orquestra** (also known as AdmitFlow) is an AI-native institutional ERP infrastructure designed to be headless-first, deterministic, and event-native. It provides a workflow engine for managing institutional processes (admissions, applications, etc.) with AI-powered blueprint generation.

## Monorepo Structure

- `apps/api` - FastAPI backend runtime and infrastructure engines
- `apps/web` - Next.js frontend (landing pages, docs, and console)
- `packages/templates` - Pre-built workflow template JSON definitions
- `packages/blueprint-schema` - JSON schemas for blueprint and workflow validation
- `packages/sdk` - Reserved for future SDK development

## Development Commands

### Local Environment Setup

```bash
# Start backend services (Redis + API)
docker-compose up

# Start web frontend (development)
npm run web:dev

# Start web on alternative port
npm run web:dev:5173
```

### API Development

```bash
# Run API directly (without Docker)
cd apps/api
uvicorn app.main:app --reload

# Run all tests
python -m pytest apps/api/tests

# Run specific test category
python -m pytest apps/api/tests/unit
python -m pytest apps/api/tests/integration
python -m pytest apps/api/tests/security

# Seed demo data
python apps/api/seed_demo.py

# Database migrations
cd apps/api
alembic upgrade head
alembic revision --autogenerate -m "description"
alembic current
alembic downgrade -1
```

### Web Development

```bash
# From root directory
npm run web:build
npm run web:type-check
npm run web:lint

# From apps/web directory
cd apps/web
npm run dev
npm run build
```

## Core Architecture

### Layer Boundaries (STRICT — never violate)

```
apps/api/app/
├── core/              → Runtime Kernel. FROZEN. No upstream imports.
├── control_plane/     → Deploys to runtime. Never executes transitions directly.
├── ai/                → Generates proposals only. Never writes to DB directly.
│   ├── blueprint/     → Mode A: workflow generation from natural language
│   ├── architect/     → Mode B: ERP domain graph composition
│   └── template_customizer/ → Mode C: template modification
├── architecture/      → Design-time only. Never executes workflows.
├── routes/            → Thin API layer. Business logic in services/engines.
├── middleware/        → Rate limiting, auth, tenant context.
└── models/            → All SQLAlchemy models in __init__.py
```

**Dependency rules:**

- core CANNOT import from ai, architecture, or control_plane
- ai CANNOT import from core or architecture
- control_plane CANNOT import from architecture
- architecture reads runtime metadata ONLY through registries, never direct SQL joins
- Compilation is the ONLY architecture→runtime mutation path

### Multi-Tenant Data Model

All data is scoped by **Institution** → **Project**. Every API request must include:

- `X-Institution-Id` header
- `X-Project-Id` header (for project-scoped resources)

Core entities (14 models in `apps/api/app/models/__init__.py`):

- `Institution` - Top-level tenant
- `Project` - Scoped workspace within institution
- `User` - Institution-scoped users with role-based permissions
- `Workflow` - Versioned, immutable workflow definitions with embedded schema
- `Application` - Individual workflow instances (runtime)
- `Event` - Append-only event log for all state transitions
- `BlueprintProposal` - AI-generated blueprints pending deployment
- `RolePermission` - RBAC permission definitions
- `ProjectRoleBinding` - User-project role assignments
- `APIKey` - Versioned API keys linked to architecture versions
- `WorkflowTemplate` - Pre-built workflow templates
- `InstitutionArchitecture` - ERP domain graph per project
- `ArchitectureVersion` - Immutable version snapshots of architecture
- `ArchWorkflow` - Junction table linking architecture versions to workflows
- `TemplateCustomization` - AI template modification proposals

### Database

- **Primary**: PostgreSQL on Aiven (connection in `apps/api/.env`)
- **Local dev fallback**: SQLite (`admissions.db`) — for bootstrapping only
- **ORM**: SQLAlchemy with models in `apps/api/app/models/__init__.py`
- **Migrations**: Alembic at `apps/api/alembic/`
- PostgreSQL tables managed by `alembic upgrade head`
- SQLite tables auto-created by `init_db()` for local convenience
- **Pool settings for Aiven free tier**: DB_POOL_SIZE=3, DB_MAX_OVERFLOW=2 (stay under 20 connection limit)

### Service Registry (IMPORTANT — use this pattern)

All shared component instances live in `apps/api/app/services.py`. **Never instantiate these directly in routes:**

```python
# CORRECT — use the registry
from app.services import get_event_engine, get_blueprint_generator, get_context_builder, get_workflow_engine

event_engine = get_event_engine(db)         # Shared Redis connection
generator = get_blueprint_generator()        # Singleton
context = get_context_builder()              # Singleton
engine = get_workflow_engine(db)             # Per-request (needs DB session)

# WRONG — creates new Redis connection every time
from app.core.event_engine import EventEngine
event_engine = EventEngine(db)               # DO NOT DO THIS IN NEW CODE
```

The old `EventEngine(db)` pattern still works as fallback but opens a new Redis connection per instantiation. All new code must use the registry.

### Workflow Engine (Deterministic State Machine)

The workflow engine (`apps/api/app/core/workflow_engine.py`) is **deterministic and safe**:

- **NO `eval()` or dynamic code execution** - only safe condition parsing via `ConditionParser`
- Conditions use simple operators: `>=`, `>`, `<=`, `<`, `==`, `!=`, `and`, `or`
- No function calls, no method invocation, no nested expressions beyond one level
- State machines defined in JSON with three state types: `initial`, `intermediate`, `terminal`
- Workflows are **immutable after deployment** and versioned for auditability

### Schema Embedded in Workflow Definition

Workflow definitions include an embedded `schema` section that defines application data fields:

```json
{
  "initial_state": "submitted",
  "states": { ... },
  "schema": {
    "fields": [
      {"name": "percentage", "type": "number", "required": true, "min": 0, "max": 100},
      {"name": "name", "type": "string", "required": true},
      {"name": "email", "type": "string", "required": true, "format": "email"}
    ]
  },
  "roles": [
    {"id": "admissions_officer", "name": "Admissions Officer", "permissions": ["application:read", "application:approve"]}
  ],
  "events": [
    {"type": "application.auto_accepted", "emit_on": "transition to auto_accepted"}
  ]
}
```

Schema, roles, and events travel WITH the workflow definition. When a workflow is version-pinned to an architecture, the schema is pinned too. No separate schema tables.

The runtime API validates incoming `applicant_data` against the embedded schema BEFORE executing transitions.

### AI Blueprint Generation

AI-powered workflow creation flow (`apps/api/app/ai/blueprint_generator.py`):

1. User submits natural language prompt
2. **Context builder** enriches prompt with existing project workflows (field names, roles, events)
3. **ProviderRouter cascade**: Gemini 2.5 Flash → Groq → Mock (first available)
4. AI generates workflow blueprint including schema, roles, events
5. **Four-stage validation** (schema, graph integrity, permissions, compliance)
6. User reviews validated blueprint
7. User deploys → creates versioned Workflow

**Context-carrying**: When generating the 2nd+ workflow in a project, the AI receives context about existing workflows — field names, roles, events — to maintain consistency. This is handled by `BlueprintContextBuilder` in `apps/api/app/ai/blueprint/context_builder.py`.

The blueprint section is NOT a separate page. Its logic is embedded in the workflow creation flow. The developer sees "Generate with AI" on the workflow canvas, not a separate blueprint page.

AI provider configuration in `apps/api/app/config.py`:

- `GEMINI_API_KEY` (preferred, Gemini 2.5 Flash)
- `GROQ_API_KEY` (fallback)
- Mock responses if no keys provided (development mode)
- AI responses cached in Redis for 24 hours (SHA-256 keyed)

### Prototype Flow

```
Create Project → Select Project → Build Workflows (canvas + AI + embedded schema)
  → Deploy Workflows → Architect (link workflows) → Compile → Versioned API Key → Runtime API
```

### Compile Flow (Architect → API Key)

When the developer clicks Compile on the Architect page:

1. Validate all selected workflows are deployed and belong to the project
2. Create immutable `ArchitectureVersion` with graph snapshot
3. Create `ArchWorkflow` junction records (version-pinned)
4. Generate API key: `sk_erp_v{version}_{32_hex_chars}` — hash stored, raw shown once
5. Generate webhook secret: `whsec_erp_{32_hex_chars}` — separate from API key
6. Emit `architecture.compiled` event
7. Return raw key and secret (shown once, then masked forever)

**No test/production environment split.** Draft vs deployed workflow status IS the safety boundary. All keys are `sk_erp_v{n}_...` without environment prefix.

### Runtime API (External-facing)

External developers call the runtime API with their versioned API key:

- `POST /api/v1/applications` — submit application (validates against embedded schema)
- `GET /api/v1/applications/{id}` — get status
- `GET /api/v1/applications` — list with filters
- Authentication: `Authorization: Bearer sk_erp_v1_...` (API key, NOT JWT)
- Tenant context derived from API key, NOT from headers
- Workflow access restricted to those linked in the architecture version
- CSRF checks skipped for `/api/v1/` routes (external API, no cookies)

### API Key Re-versioning

Schema or workflow changes require:

1. Create new workflow version (deployed workflows are immutable)
2. Deploy the new version
3. Recompile architecture → new API key (`sk_erp_v2_...`)
4. Old key still works against old workflow versions (version pinning)

### Event-Native Architecture

**Three-tier event system** (`apps/api/app/core/event_engine.py`):

1. **PostgreSQL persistence** (primary, always succeeds)
   - All events stored in `events` table (append-only, immutable)
   - Scoped by institution_id + project_id

2. **Redis Streams** (optional, best-effort)
   - Stream name: `events:{institution_id}:{project_id}`
   - Max 20,000 events per stream (auto-trimmed)
   - If Redis fails, persistence still succeeds

3. **WebSocket broadcast** (real-time)
   - Clients connect to `/api/events/ws?institution_id=...&project_id=...`
   - Hub broadcasts events to all connected clients

Event types: `workflow.deployed`, `workflow.transitioned`, `application.submitted`, `architecture.compiled`, `ai.blueprint.deployed`, etc.

**Usage**: Always use `get_event_engine(db)` from the service registry. Never `EventEngine(db)` directly.

### Security Features

1. **CSRF Protection**: Double-submit cookie pattern for mutations (skipped for `/api/v1/` runtime routes)
2. **Rate Limiting**: Redis-backed rate limiter middleware (AI: 10/min, auth: 20/min, authenticated: 600/min)
3. **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP, HSTS in production
4. **API Key Authentication**: SHA-256 hashed keys, versioned, linked to architecture versions
5. **No Dynamic Execution**: Safe condition parsing only via ConditionParser
6. **RBAC Engine**: Role-based access control with project-scoped permissions
7. **Multi-Tenant Isolation**: All queries scoped by institution_id + project_id

### RBAC (Role-Based Access Control)

**Three built-in roles** (`apps/api/app/core/rbac_engine.py`):

- `owner` - Full access to all resources (institution-level)
- `reviewer` - Can read, write applications, compile blueprints (project-level)
- `viewer` - Read-only access (project-level)

**Permission format**: `{resource}:{action}` (e.g., `workflow:write`, `blueprint:deploy`, `architecture:compile`)

**How it works**:

1. Every route uses `Depends(check_permission("resource:action"))`
2. RBAC engine checks user's institution, project binding, and role permissions
3. Throws 403 if any check fails

### Observability

- **Metrics**: Prometheus-compatible endpoint at `/metrics`
- **Health Check**: `/health` returns status, version, environment
- **Sentry**: Optional error tracking (set `SENTRY_DSN`)

## Key Invariants

These system invariants are enforced and must NEVER be broken:

```python
{
    "workflow_immutability": True,        # Workflows cannot be edited after deployment
    "transition_event_emission": True,    # All transitions emit events
    "ai_four_stage_validation": True,     # AI blueprints must pass 4-stage validation
    "multi_tenant_isolation": True,       # Institution/project data isolation
    "dynamic_code_execution": False,      # NO eval() or exec()
    "human_in_the_loop": True,           # No auto-deployment of AI output
    "version_pinning": True,             # Applications pinned to workflow version at creation
}
```

## Frontend Structure

### Key Directories

- `components/console` - Console control plane UI components
- `components/ui` - shadcn/ui base components
- `components/landing` - Landing page sections
- `components/docs` - Documentation components
- `components/interactive` - Interactive demos
- `components/shared` - Shared utilities (Terminal, JsonViewer, etc.)
- `lib/enforcement` - Frontend guards (immutability, deployment, tenant, validation)

### Console Pages Architecture

**Dashboard** (`/console/page.tsx`):

- Metric cards, quick actions, recent activity with live event stream
- Uses `useEventStream` hook for real-time WebSocket updates

**Workflows** (`/console/workflows/`):

- React Flow canvas for visual workflow building (3 node types: initial, intermediate, terminal)
- AI generation via "Generate with AI" button (calls blueprint compile endpoint)
- Schema editor in detail panel (auto-infers fields from conditions)
- Manual + AI creation paths, both produce same JSON output

**Architect** (`/console/architect/page.tsx`):

- NLP intent parser routes user input (no AI call for routing)
- Domain graph composition via AI (Mode B)
- Workflow linking and compile flow
- Version management

**Events** (`/console/events/`):

- Real-time event stream via WebSocket
- Reverse chronological, filterable by type
- Shows all workflow deployments, compilations, submissions, transitions

**API Keys** (shown after compile):

- Versioned keys with masked display
- Raw key shown once on compile, then only prefix visible

### Authentication & Session Management

**Login Flow**:

- Backend JWT tokens (7-day expiry)
- Cookies persist 30 days
- Middleware redirects unauthenticated users from `/console` to `/login`

## Configuration

Environment variables (`.env`):

```bash
# Database
DATABASE_URL=postgresql+psycopg2://avnadmin:...@pg-xxx.aivencloud.com:17475/defaultdb?sslmode=require
DB_POOL_SIZE=3
DB_MAX_OVERFLOW=2

# Auth
SECRET_KEY=...                     # Min 32 chars in production
ALGORITHM=HS256

# Optional — Redis (event streams, caching, rate limiting)
REDIS_URL=redis://localhost:6379/0

# Optional — AI providers (cascade: Gemini → Groq → Mock)
GEMINI_API_KEY=...
GROQ_API_KEY=...

# Optional — monitoring
SENTRY_DSN=...
```

**Important**: No Supabase dependency. Previous Supabase integration was removed after ISP blocking in India. Database is Aiven PostgreSQL.

## Testing Strategy

```bash
# All tests
python -m pytest apps/api/tests

# Specific categories
python -m pytest apps/api/tests/unit
python -m pytest apps/api/tests/integration
python -m pytest apps/api/tests/security

# With coverage
python -m pytest apps/api/tests --cov=app
```

## Common Development Patterns

### Adding a New API Route

```python
from app.services import get_event_engine

@router.post("/resource")
async def create_resource(
    payload: ResourceCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    user = Depends(check_permission("resource:write")),
    db: Session = Depends(get_db),
):
    resource = Resource(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        created_by=user.id,
        **payload.dict()
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    await get_event_engine(db).emit(
        "resource.created",
        tenant.institution_id,
        tenant.project_id,
        {"resource_id": resource.id}
    )
    return resource
```

### Adding a New Model

1. Define in `apps/api/app/models/__init__.py`
2. Add tenant scoping: `institution_id` and `project_id` foreign keys
3. Create migration: `cd apps/api && alembic revision --autogenerate -m "add model"`
4. Apply: `alembic upgrade head`

### Enforcing Workflow Immutability

```python
if workflow.deployed:
    raise HTTPException(status_code=409, detail="Deployed workflows are immutable")
```

### 500-Line Rule

No service file may exceed 500 lines. Split into modules if approaching this limit.

## Important Files

- `apps/api/app/main.py` - FastAPI app initialization, middleware, router mounting
- `apps/api/app/services.py` - Service registry (shared singletons)
- `apps/api/app/models/__init__.py` - All SQLAlchemy models (14 tables)
- `apps/api/app/config.py` - Configuration with validation
- `apps/api/app/database.py` - Database connection and session management
- `apps/api/app/core/workflow_engine.py` - Deterministic state machine executor
- `apps/api/app/core/event_engine.py` - Three-tier event emission
- `apps/api/app/core/condition_parser.py` - Safe condition evaluation (no eval)
- `apps/api/app/core/rbac_engine.py` - Role-based access control
- `apps/api/app/ai/blueprint_generator.py` - AI blueprint generation with 4-stage validation
- `apps/api/app/ai/provider_router.py` - Gemini → Groq → Mock cascade
- `apps/api/app/ai/blueprint/context_builder.py` - Project-aware AI context
- `apps/api/app/ai/architect/` - Mode B ERP composition (NLP parser, prompt factory, visualization)
- `apps/api/app/core/api_key_utils.py` - Key and webhook secret generation
- `apps/api/app/middleware/api_key_auth.py` - Runtime API authentication
- `apps/api/app/routes/runtime.py` - External-facing runtime API
- `packages/blueprint-schema/workflow.schema.json` - Workflow JSON schema
