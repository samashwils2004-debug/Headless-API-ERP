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

### Multi-Tenant Data Model
All data is scoped by **Institution** → **Project**. Every API request must include:
- `X-Institution-Id` header
- `X-Project-Id` header (for project-scoped resources)

Core entities:
- `Institution` - Top-level tenant (e.g., a university)
- `Project` - Scoped environment within institution (e.g., "Fall 2024 Admissions")
- `User` - Institution-scoped users with role-based permissions
- `Workflow` - Versioned workflow definitions (immutable after deployment)
- `Application` - Individual workflow instances
- `Event` - Event log for all state transitions

### Workflow Engine (Deterministic State Machine)

The workflow engine (`apps/api/app/workflow.py`) is **deterministic and safe**:
- **NO `eval()` or dynamic code execution** - only safe condition parsing
- Conditions use simple operators: `>=`, `>`, `<=`, `<`, `==`, `!=`
- Example condition: `gpa >= 3.5` or `test_score > 1200`
- State machines are defined in JSON with three state types:
  - `initial` - Entry state
  - `intermediate` - Transition states
  - `terminal` - Final states (completes workflow)

Workflows are **immutable after deployment** and versioned for auditability.

**Workflow execution pattern**:
```python
from app.workflow import WorkflowEngine

engine = WorkflowEngine(db)

# Start a new workflow instance
instance_id = engine.start_workflow(
    workflow_name="undergraduate_admissions",
    application_id=app_id,
    context={"gpa": 3.8, "test_score": 1400}  # Used for automatic transitions
)

# Manual transition (e.g., reviewer action)
engine.transition(
    instance_id=instance_id,
    to_state="under_review",
    user_id=current_user.id
)
```

**Automatic transitions**: If a state has `"automatic": true` transitions, they're evaluated immediately when entering that state. The condition is checked against the context dict.

### AI Blueprint Generation

AI-powered workflow creation flow (`apps/api/app/ai/blueprint_generator.py`):
1. User submits natural language prompt
2. System calls **ProviderRouter cascade**: Gemini → Groq → Mock (first available)
3. AI generates workflow blueprint (JSON)
4. **Four-stage validation** (`BlueprintGenerator.validate()`):
   - **Stage 1 - Schema**: JSON schema validation against `packages/blueprint-schema/`
   - **Stage 2 - Graph Integrity**: State connectivity, reachability analysis
   - **Stage 3 - Permission Analysis**: RBAC validation for workflow actions
   - **Stage 4 - Compliance**: Regulatory compliance checks (no eval, injection prevention)
5. User reviews validated blueprint
6. User deploys → creates versioned Workflow

AI provider configuration in `apps/api/app/config.py`:
- `GEMINI_API_KEY` (preferred, tried first)
- `GROQ_API_KEY` (fallback, tried second)
- Mock responses if no keys provided (development mode)

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
   - Managed by `app.ws.hub`

Event types: `workflow.deployed`, `workflow.transition`, `application.created`, `ai.blueprint.deployed`, etc.

**Usage pattern**: All state changes must emit events via `EventEngine.emit()`

### Security Features

1. **CSRF Protection**: Double-submit cookie pattern for mutations
2. **Rate Limiting**: Redis-backed rate limiter middleware
3. **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP
4. **Row-Level Security**: Supabase RLS for multi-tenant isolation (optional)
5. **API Key Authentication**: SHA-256 hashed keys with scopes
6. **No Dynamic Execution**: Safe condition parsing only
7. **RBAC Engine**: Role-based access control with project-scoped permissions (see below)

### Database

- **Development**: SQLite (`admissions.db`)
- **Production**: PostgreSQL (required, enforced in config validation)
- **Supabase Integration**: Optional for Storage + RLS (see `SUPABASE_RUNBOOK.md`)

Database migrations use Alembic (`apps/api/alembic/`).

### RBAC (Role-Based Access Control)

**Three built-in roles** (`apps/api/app/core/rbac_engine.py`):

- `owner` - Full access to all resources (institution-level)
- `reviewer` - Can read, write applications, compile blueprints (project-level)
- `viewer` - Read-only access (project-level)

**Permission format**: `{resource}:{action}` (e.g., `workflow:write`, `blueprint:deploy`)

**How it works**:
1. Every route uses `Depends(check_permission("resource:action"))`
2. RBAC engine checks:
   - User's institution_id matches tenant context (cross-tenant protection)
   - User has project-scoped role binding (for non-owner roles)
   - User's role grants the required permission
3. Throws 403 if any check fails

**Custom permissions** can be added via `RolePermission` table (overrides defaults).

### Observability

- **Metrics**: Prometheus-compatible endpoint at `/metrics`
  - `events_emitted{event_type}` - Event emission counter
  - `blueprint_validation_failures{stage}` - Validation failures by stage
  - `http_requests_total{method,path,status}` - HTTP metrics
- **Health Check**: `/health` returns status, version, environment
- **Sentry**: Optional error tracking (set `SENTRY_DSN`)
- **Structured Logging**: Request/response logging with correlation IDs

## Key Invariants

These system invariants are enforced (see `apps/api/app/main.py`):

```python
{
    "workflow_immutability": True,        # Workflows cannot be edited after deployment
    "transition_event_emission": True,    # All transitions emit events
    "ai_four_stage_validation": True,     # AI blueprints must pass 4-stage validation
    "multi_tenant_isolation": True,       # Institution/project data isolation
    "dynamic_code_execution": False,      # NO eval() or exec()
}
```

## Frontend Structure

Next.js app with route groups:
- `(landing)` - Marketing pages (/, /architecture, /pricing)
- `console` - Authenticated admin console
  - `/console/workflows` - Workflow management
  - `/console/architect` - AI blueprint generator
  - `/console/projects` - Project management
  - `/console/api-keys` - API key management
  - `/console/templates` - Workflow templates
  - `/console/events` - Event stream viewer
- `docs` - Documentation site

Component organization:
- `components/ui` - shadcn/ui components (Radix + Tailwind)
- `components/landing` - Landing page sections
- `components/docs` - Documentation components
- `components/interactive` - Interactive demos
- `components/shared` - Shared utilities (Terminal, JsonViewer, etc.)

## Configuration

Environment variables (`.env`):
```bash
# Required
DATABASE_URL=postgresql://...      # Postgres in production
SECRET_KEY=...                     # Min 32 chars in production
REDIS_URL=redis://localhost:6379/0

# Optional AI providers
GEMINI_API_KEY=...
GROQ_API_KEY=...

# Optional integrations
SENTRY_DSN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Testing Strategy

Test organization:
- `tests/unit` - Unit tests (condition parser, RBAC, blueprint validation)
- `tests/integration` - Integration tests (workflow + events, observability)
- `tests/security` - Security invariant tests

Run tests from repository root:
```bash
# All tests
python -m pytest apps/api/tests

# Specific test file
python -m pytest apps/api/tests/unit/test_condition_parser.py

# Specific test function
python -m pytest apps/api/tests/unit/test_condition_parser.py::test_basic_conditions

# With coverage
python -m pytest apps/api/tests --cov=app
```

### Test Fixtures (apps/api/tests/conftest.py)

**Key fixtures available**:
- `reset_db` - Auto-used, drops and recreates all tables before each test
- `db_session` - Provides a database session
- `client` - FastAPI TestClient
- `seeded` - Pre-populated test database with:
  - Two institutions (inst1, inst2)
  - Two projects (proj1, proj2)
  - Three users (owner, reviewer, outsider_owner)
  - One deployed workflow
  - One project role binding (reviewer → proj1)
- `make_headers` - Helper to create authenticated request headers

**Test pattern**:
```python
def test_endpoint(client, seeded, make_headers):
    headers = make_headers(seeded["owner"], seeded["inst1"].id, seeded["proj1"].id)
    response = client.get("/api/workflows", headers=headers)
    assert response.status_code == 200
```

## Important Files

- `apps/api/app/main.py` - FastAPI app initialization and middleware
- `apps/api/app/workflow.py` - Deterministic workflow engine
- `apps/api/app/models/__init__.py` - SQLAlchemy data models
- `apps/api/app/config.py` - Configuration with validation
- `apps/api/app/database.py` - Database connection and session management
- `packages/blueprint-schema/workflow.schema.json` - Workflow JSON schema
- `apps/web/src/app/layout.tsx` - Root Next.js layout

## Common Development Patterns

### Adding a New API Route

**Standard route signature**:
```python
@router.post("/resource")
async def create_resource(
    payload: ResourceCreate,
    tenant: TenantContext = Depends(get_tenant_context),  # Required for multi-tenancy
    user = Depends(check_permission("resource:write")),   # RBAC check
    db: Session = Depends(get_db),                         # Database session
):
    # 1. Create resource with tenant scoping
    resource = Resource(
        institution_id=tenant.institution_id,
        project_id=tenant.project_id,
        created_by=user.id,
        **payload.dict()
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    # 2. Emit event for state change
    event_engine = EventEngine(db)
    await event_engine.emit(
        "resource.created",
        tenant.institution_id,
        tenant.project_id,
        {"resource_id": resource.id}
    )

    return resource
```

**Key requirements**:
- Always use `get_tenant_context()` for multi-tenant scoping
- Always use `check_permission()` for RBAC enforcement
- Always scope data by `institution_id` and `project_id`
- Always emit events for state changes via `EventEngine`
- Never trust client-provided tenant IDs (use header values)

### Adding a New Model
1. Define in `apps/api/app/models/__init__.py`
2. Add tenant scoping columns:
   ```python
   institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
   project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
   ```
3. Create Alembic migration: `alembic revision --autogenerate -m "add model"`
4. Apply migration: `alembic upgrade head`

### Emitting Events
```python
from app.core.event_engine import EventEngine

event_engine = EventEngine(db)
await event_engine.emit(
    event_type="workflow.deployed",          # Use dot notation: resource.action
    institution_id=tenant.institution_id,
    project_id=tenant.project_id,
    data={"workflow_id": workflow.id},       # Any JSON-serializable dict
    version="1.0"                            # Optional, defaults to "1.0"
)
```

### Enforcing Workflow Immutability
```python
if workflow.deployed:
    raise HTTPException(status_code=409, detail="Deployed workflows are immutable")
```
This pattern is critical - deployed workflows MUST NOT be modified (see invariants).

### Adding a New UI Component
1. Use shadcn/ui patterns for consistency
2. Place in appropriate folder (ui/landing/docs/shared)
3. Follow Tailwind CSS conventions
4. Ensure dark mode compatibility (using next-themes)
