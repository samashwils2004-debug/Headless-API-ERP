# ORQUESTRA — BACKEND ARCHITECTURE SPECIFICATION (BAS)
## Layered Infrastructure Platform · V2 Monorepo · Control Plane + Runtime + Architecture

**Version:** 1.0  
**Coherent With:** Implementation Spec (IMPL), Frontend Architecture Spec (FAS), PRD, DESIGN.md, TECH_STACK.md  
**Status:** Validated + Corrected against V3 proposal

---

## TABLE OF CONTENTS

1. [Validation Report — What Holds, What Needs Correction](#1-validation-report)
2. [Adopted Mental Model](#2-adopted-mental-model)
3. [Repository Structure — Recommended V2](#3-repository-structure--recommended-v2)
4. [Layer Definitions + Responsibility Boundaries](#4-layer-definitions--responsibility-boundaries)
5. [Dependency Rules — The Laws](#5-dependency-rules--the-laws)
6. [Service-by-Service Specification](#6-service-by-service-specification)
7. [Request Flow Diagrams](#7-request-flow-diagrams)
8. [Database Ownership Model](#8-database-ownership-model)
9. [AI Subsystem Architecture](#9-ai-subsystem-architecture)
10. [Orchestrator Pattern — Preventing God Services](#10-orchestrator-pattern--preventing-god-services)
11. [Migration Strategy — Zero Breakage](#11-migration-strategy--zero-breakage)
12. [Internal API Contracts](#12-internal-api-contracts)
13. [System Invariants (Backend)](#13-system-invariants-backend)
14. [Complete File Manifest](#14-complete-file-manifest)

---

## 1. Validation Report

Before building anything, every claim in the two input documents must be tested against what already exists and what has already been specified in the Implementation Spec and FAS.

### 1.1 What Holds From The Input Documents

The following points from the layering and V3 monorepo documents are **correct and adopted without modification:**

| Claim | Verdict | Reason |
|-------|---------|--------|
| Runtime layer must be treated as a frozen kernel | ✅ Adopted | Matches Implementation Spec invariant: "deployed workflows are immutable" |
| `architecture/` belongs as a new top-level domain, not inside `core/` | ✅ Adopted | Prevents conceptual fusion of design-time and execution-time |
| AI folder must split into `blueprint/` and `architect/` | ✅ Adopted | Two AI modes (A and B) already defined — they deserve separate homes |
| Dependency direction: apps → control_plane → architecture → runtime | ✅ Adopted | One-directional. Enforced as a hard rule |
| Runtime must never import Architecture | ✅ Adopted | Core invariant — runtime predates IAL and must not know it exists |
| Compilation is the only mutation boundary between Architecture and Runtime | ✅ Adopted | Compiler is the adapter. Nothing else crosses the boundary |
| Services communicate via contracts, not direct DB cross-joins | ✅ Adopted | Matches multi-tenant isolation model from PRD |
| Orchestrator pattern instead of God Service | ✅ Adopted | `compile_architecture` is the first orchestrated flow |
| 500-line file rule | ✅ Adopted | Hard rule — enforced in code review |

### 1.2 What Needs Correction

The following points from the V3 monorepo proposal are **partially or fully incorrect** for the current stage:

---

**Correction 1 — V3 Monorepo Is Premature**

The V3 document proposes:

```
orquestra/
├ apps/
├ services/     ← independent domain services
├ packages/
├ infrastructure/
├ tooling/
└ docs/
```

**Problem:** Moving to a full service-separated monorepo at prototype/hackathon stage introduces:
- Build tooling overhead (turborepo or nx required to wire services)
- Import path fragmentation before contracts are stable
- Migration cost that destroys demo timeline
- Risk of breaking the existing working backend

**Correction:** Adopt the **layered module pattern inside the existing `apps/api/` structure**. The same mental model — Runtime, Control Plane, Architecture, AI — is achieved through folder boundaries inside a single FastAPI app, not through physical service separation. This is how Stripe, Linear, and Temporal started. Service extraction happens when a boundary proves stable enough to warrant it.

The target structure is:

```
apps/api/app/
├ core/          ← Runtime kernel (frozen)
├ control_plane/ ← Management APIs (existing routes, reorganized)
├ architecture/  ← IAL (new domain)
├ ai/            ← Split by mode
└ middleware/
```

This preserves every insight from the V3 document while keeping the build working tomorrow.

---

**Correction 2 — `packages/domain-types` and `packages/api-contracts` Are Deferred**

The V3 document proposes shared packages:

```
packages/
├ domain-types/
├ api-contracts/
```

**Problem:** For a Python (FastAPI) + TypeScript (Next.js) stack, shared type contracts require either:
- A code generation step (openapi-typescript, datamodel-codegen)
- A shared language layer that doesn't exist naturally

The existing `packages/blueprint-schema/` (JSON Schema) is the correct pattern. Extend that — don't introduce a new type-sharing system before the API surface is stable.

**Correction:** Keep `packages/blueprint-schema/` and `packages/templates/`. Add `packages/api-contracts/` only when the API surface is stable enough to generate a client SDK from.

---

**Correction 3 — `apps/docs-site/` Is Deferred**

The V3 document includes `apps/docs-site/` as a separate app. This already exists conceptually as `apps/web/src/app/docs/`. Splitting it to a separate app adds Vercel project overhead. Defer to post-launch.

---

**Correction 4 — `integrations/` Service Layer Is Post-V1**

The V3 document includes:

```
services/integrations/
├ github/
├ webhook/
└ external_events/
```

GitHub sync and external webhook routing are Phase 5+ features. Adding the folder now without implementation creates false completeness. Defer — add when the feature is specced.

---

**Correction 5 — `services/orchestrator/` Is Not a Separate Service**

The V3 document suggests:

```
services/orchestrator/
```

**Problem:** An orchestrator as a standalone service introduces a new deployment unit unnecessarily. 

**Correction:** The orchestrator pattern lives as a thin coordination layer **within the architecture domain**:

```
architecture/orchestrator/
    compile_pipeline.py    ← coordinates compile flow
```

It calls into other domains via their public interfaces. It does not become its own service.

---

### 1.3 Reconciliation Summary

```
V3 PROPOSAL         STATUS          ADOPTED AS
─────────────────────────────────────────────────────────────────
services/ split     DEFERRED        Logical modules inside apps/api/
packages/contracts  DEFERRED        Extend blueprint-schema only
docs-site app       DEFERRED        Stays in apps/web/docs
integrations/       DEFERRED        Post-V1
orchestrator svc    CORRECTED       Thin layer in architecture/
architecture/       ✅ ADOPTED      apps/api/app/architecture/
ai/ split           ✅ ADOPTED      apps/api/app/ai/blueprint + architect
dependency rules    ✅ ADOPTED      Enforced as code review law
500-line rule       ✅ ADOPTED      Enforced
control_plane/      ✅ ADOPTED      Reorganize existing routes
```

---

## 2. Adopted Mental Model

### 2.1 Three Vertical Layers

Orquestra's backend is now three vertical layers. Each layer has exactly one concern.

```
┌─────────────────────────────────────────────────────┐
│              LAYER 3: ARCHITECTURE                  │
│         (design-time · structure · IAL)             │
│                                                     │
│  What institutional structure exists?               │
│  How does it evolve through NLP?                    │
│  When is it compiled into runtime artifacts?        │
└───────────────────────┬─────────────────────────────┘
                        │ compiles into ↓
┌─────────────────────────────────────────────────────┐
│              LAYER 2: CONTROL PLANE                 │
│      (configuration · management · governance)      │
│                                                     │
│  Who can access what?                               │
│  Which workflows are deployed?                      │
│  Which API keys exist?                              │
└───────────────────────┬─────────────────────────────┘
                        │ configures ↓
┌─────────────────────────────────────────────────────┐
│              LAYER 1: RUNTIME KERNEL                │
│          (execution · events · determinism)         │
│                                                     │
│  How does execution happen?                         │
│  What events are emitted?                           │
│  How are permissions enforced at execution time?    │
└─────────────────────────────────────────────────────┘
```

### 2.2 The Kernel Rule

The Runtime Kernel is treated like an operating system kernel:

```
✅ Other layers READ from Runtime (fetch workflow definition, query state)
✅ Control Plane WRITES to Runtime (deploy workflow, create application)
✅ Architecture COMPILES into Runtime artifacts (via Compiler only)
❌ Runtime NEVER imports from Architecture
❌ Runtime NEVER imports from AI
❌ AI NEVER writes to Runtime directly
```

### 2.3 AI System Position

AI sits orthogonally — it serves both Architecture (Mode B) and Control Plane (Mode A via Blueprint Generator). It never reaches into Runtime.

```
         AI Subsystem
        /            \
  Blueprint          Architect
  (Mode A)           (Mode B)
      ↓                  ↓
 Control Plane       Architecture
      ↓                  ↓
  Runtime Kernel    Compiler → Runtime
```

---

## 3. Repository Structure — Recommended V2

This is the structure to implement now. It preserves the existing repo while introducing the new domains cleanly.

```
orquestra/                              ← repo root
│
├── .github/
│   └── workflows/
│       ├── migration-check.yml         ← exists
│       ├── backend-ci.yml              ← ADD
│       ├── frontend-ci.yml             ← ADD
│       └── security-scan.yml           ← ADD
│
├── apps/
│   │
│   ├── api/                            ← FastAPI backend
│   │   ├── app/
│   │   │   │
│   │   │   ├── core/                   ← LAYER 1: Runtime Kernel (FROZEN)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── workflow_engine.py  ← exists — DO NOT TOUCH
│   │   │   │   ├── event_engine.py     ← exists — DO NOT TOUCH
│   │   │   │   ├── rbac_engine.py      ← exists — DO NOT TOUCH
│   │   │   │   ├── schema_engine.py    ← exists — DO NOT TOUCH
│   │   │   │   └── condition_parser.py ← exists — DO NOT TOUCH
│   │   │   │
│   │   │   ├── control_plane/          ← LAYER 2: Control Plane (reorganized)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── projects/
│   │   │   │   │   ├── router.py       ← from routes/projects.py
│   │   │   │   │   ├── service.py      ← extract from router
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── workflows/
│   │   │   │   │   ├── router.py       ← from routes/workflows.py
│   │   │   │   │   ├── service.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── api_keys/
│   │   │   │   │   ├── router.py       ← from routes (new)
│   │   │   │   │   ├── service.py      ← api_key_manager.py logic
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── templates/
│   │   │   │   │   ├── router.py       ← from routes (templates)
│   │   │   │   │   ├── service.py
│   │   │   │   │   └── schemas.py
│   │   │   │   ├── applications/
│   │   │   │   │   ├── router.py       ← from routes/applications.py
│   │   │   │   │   └── service.py
│   │   │   │   └── events/
│   │   │   │       ├── router.py       ← from routes/events.py
│   │   │   │       └── service.py
│   │   │   │
│   │   │   ├── architecture/           ← LAYER 3: IAL (NEW)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models/
│   │   │   │   │   ├── institution_architecture.py
│   │   │   │   │   └── architecture_version.py
│   │   │   │   ├── services/
│   │   │   │   │   └── architecture_service.py
│   │   │   │   ├── compiler/
│   │   │   │   │   └── compiler.py
│   │   │   │   ├── versioning/
│   │   │   │   │   └── version_manager.py
│   │   │   │   ├── diff/
│   │   │   │   │   └── graph_diff.py
│   │   │   │   ├── orchestrator/
│   │   │   │   │   └── compile_pipeline.py
│   │   │   │   └── routes/
│   │   │   │       └── architect.py
│   │   │   │
│   │   │   ├── ai/                     ← AI Subsystem (split by mode)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── blueprint/          ← Mode A (exists, reorganized)
│   │   │   │   │   ├── blueprint_generator.py ← move from ai/
│   │   │   │   │   ├── validators/
│   │   │   │   │   │   ├── schema_validator.py    ← exists
│   │   │   │   │   │   ├── graph_analyzer.py      ← exists
│   │   │   │   │   │   ├── permission_analyzer.py ← exists
│   │   │   │   │   │   └── compliance_checker.py  ← exists
│   │   │   │   │   └── router.py
│   │   │   │   │
│   │   │   │   └── architect/          ← Mode B (NEW)
│   │   │   │       ├── provider_router.py
│   │   │   │       ├── prompt_factory.py
│   │   │   │       ├── erp_schema.py
│   │   │   │       ├── backoff.py
│   │   │   │       └── quota_tracker.py
│   │   │   │
│   │   │   ├── auth/                   ← exists, unchanged
│   │   │   ├── middleware/             ← ADD
│   │   │   │   ├── version_router.py   ← ERP version scoping
│   │   │   │   ├── tenant.py           ← from tenant.py
│   │   │   │   └── auth_middleware.py
│   │   │   │
│   │   │   ├── db/                     ← exists, unchanged
│   │   │   ├── models/                 ← existing models + new arch models
│   │   │   ├── schemas/                ← Pydantic schemas
│   │   │   ├── security/              ← ADD
│   │   │   │   ├── rate_limiter.py
│   │   │   │   ├── api_key_manager.py
│   │   │   │   └── encryption.py
│   │   │   │
│   │   │   ├── main.py                 ← register all routers
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── observability.py
│   │   │   └── ws.py
│   │   │
│   │   ├── alembic/
│   │   │   └── versions/
│   │   │       └── xxx_add_ial_tables.py  ← ADD (from IMPL spec)
│   │   │
│   │   └── tests/
│   │       ├── unit/
│   │       │   ├── test_workflow_engine.py
│   │       │   ├── test_graph_diff.py      ← ADD
│   │       │   └── test_compiler.py        ← ADD
│   │       ├── integration/
│   │       │   ├── test_architect_routes.py ← ADD
│   │       │   └── test_compile_pipeline.py ← ADD
│   │       └── security/
│   │
│   └── web/                            ← Next.js frontend (per FAS)
│
├── packages/
│   ├── blueprint-schema/               ← exists — JSON Schema for blueprints
│   ├── templates/                      ← exists — undergraduate, graduate, rolling
│   └── sdk/                           ← future TypeScript + Python SDKs
│
├── infrastructure/
│   ├── railway/
│   │   └── railway.toml
│   ├── vercel/
│   │   └── vercel.json
│   └── docker/
│       └── Dockerfile
│
├── tooling/
│   ├── seed/
│   │   ├── seed_demo.py                ← exists (move here)
│   │   └── warm_ai_cache.py            ← ADD (from IMPL spec)
│   └── scripts/
│       └── setup/
│           └── install-dev.sh
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── TECH_STACK.md
│   ├── SECURITY.md
│   ├── IMPL.md                         ← Implementation Spec (generated)
│   ├── FAS.md                          ← Frontend Architecture Spec (generated)
│   └── BAS.md                          ← This document
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 4. Layer Definitions + Responsibility Boundaries

### 4.1 Layer 1 — Runtime Kernel

**Location:** `apps/api/app/core/`  
**Status:** Exists, frozen  
**Principle:** Treat like an OS kernel. Other layers depend on it. It depends on nothing above itself.

```
core/
├ workflow_engine.py      Deterministic state machine executor
├ event_engine.py         Event emission + Redis stream + PostgreSQL persistence
├ rbac_engine.py          Role-permission mapping + action-level enforcement
├ schema_engine.py        JSON Schema validation + Pydantic type checking
└ condition_parser.py     Safe recursive descent parser (no eval())
```

**Responsibility:**

| What it does | What it never does |
|-------------|-------------------|
| Execute workflow transitions | Know that an architecture system exists |
| Emit events on every transition | Import from `architecture/` or `ai/` |
| Enforce RBAC at execution time | Modify its own workflow definitions |
| Validate application data against schema | Self-modify or load dynamic code |

**Execution target:** `< 50ms` per workflow transition. Stateless. Async FastAPI + asyncpg + uvloop.

---

### 4.2 Layer 2 — Control Plane

**Location:** `apps/api/app/control_plane/`  
**Status:** Exists as `routes/` — reorganized into service pattern  
**Principle:** The Kubernetes API server equivalent. Manages runtime configuration. Everything a developer manages through the console goes through here.

```
control_plane/
├ projects/        Manage projects within institutions
├ workflows/       Deploy, version, and manage workflow definitions
├ api_keys/        Create, revoke, and scope API credentials
├ templates/       Template registry + deploy flow
├ applications/    Submit + query application state
└ events/          Query event history (WebSocket lives in ws.py)
```

**Responsibility:**

| What it does | What it never does |
|-------------|-------------------|
| Deploy workflows to the runtime | Execute workflow transitions directly |
| Issue and scope API keys | Know about ERP architecture graph internals |
| Manage project and tenant context | Call into `architecture/` services |
| Expose template deploy flow | Import from `ai/` directly |

**Key Service Pattern:**

```python
# control_plane/workflows/service.py

class WorkflowService:
    """
    Manages workflow lifecycle in the Control Plane.
    Calls core/workflow_engine for execution — does not execute directly.
    """

    def __init__(self, db: Session, event_engine: EventEngine):
        self.db = db
        self.event_engine = event_engine

    async def deploy_workflow(
        self,
        definition: dict,
        project_id: str,
        institution_id: str,
        created_by: str,
    ) -> Workflow:
        """
        Validates definition, persists immutable workflow record.
        Emits workflow.deployed event.
        """
        # Validate via schema engine (runtime layer — read-only call)
        validation = SchemaEngine.validate_blueprint(definition)
        if not validation.is_valid:
            raise ValidationError(validation.errors)

        workflow = Workflow(
            definition=definition,  # JSONB — immutable after this
            project_id=project_id,
            institution_id=institution_id,
            version=1,
            status="active",
            created_by=created_by,
        )
        self.db.add(workflow)
        self.db.flush()

        # Emit event (through event engine — not directly)
        await self.event_engine.emit("workflow.deployed", {
            "workflow_id": str(workflow.id),
            "version": workflow.version,
        }, institution_id=institution_id, project_id=project_id)

        self.db.commit()
        return workflow
```

---

### 4.3 Layer 3 — Architecture (IAL)

**Location:** `apps/api/app/architecture/`  
**Status:** New — does not yet exist  
**Principle:** Design-time layer. Describes institutional structure. Never executes.

```
architecture/
├ models/          SQLAlchemy models for institution_architectures, architecture_versions
├ services/        Graph mutation, prompt application, version management
├ compiler/        Architecture → Runtime artifact translation (ONLY mutation boundary)
├ versioning/      Version management, rollback compatibility
├ diff/            Pure structural diff (no DB access — pure functions)
├ orchestrator/    Thin coordination of compile pipeline
└ routes/          FastAPI router — mounted in main.py
```

**Responsibility:**

| What it does | What it never does |
|-------------|-------------------|
| Store and evolve ERP domain graph | Execute workflow transitions |
| Apply NLP-driven structural changes | Modify deployed workflow definitions |
| Compute structural diffs between versions | Issue API keys directly (delegates to control_plane) |
| Compile architecture into runtime packages | Access core/ workflow execution functions |
| Coordinate compile pipeline via orchestrator | Auto-deploy without human confirmation |

**The Compiler's Exact Responsibility:**

```python
# architecture/compiler/compiler.py

class ArchitectureCompiler:
    """
    The only boundary between Architecture Layer and Runtime.
    Takes an architecture version and produces a deployable runtime package.

    INPUT:  institution_architectures record (graph_json + linked_workflows)
    OUTPUT: compiled_package = {
        domains: [{ domain_id, workflow_id, workflow_version, status }]
    }

    The compiler READS runtime metadata (workflow IDs, versions).
    It DOES NOT modify runtime state.
    API key issuance is delegated to control_plane/api_keys/service.py
    """

    def __init__(self, workflow_registry: WorkflowRegistry, db: Session):
        self.registry = workflow_registry
        self.db = db

    async def compile(self, architecture_id: str) -> CompiledPackage:
        arch = self._load_architecture(architecture_id)
        domains = arch.graph_json["erp_system"]["domains"]

        resolved_domains = []
        for domain in domains:
            if domain.get("workflow_id"):
                # READ from runtime — never write
                wf = self.registry.get(domain["workflow_id"])
                resolved_domains.append({
                    "domain_id": domain["id"],
                    "workflow_id": str(wf.id),
                    "workflow_version": wf.version,
                    "status": "linked" if wf.status == "active" else "unlinked",
                })
            else:
                resolved_domains.append({
                    "domain_id": domain["id"],
                    "workflow_id": None,
                    "status": "unlinked",
                })

        return CompiledPackage(
            architecture_id=architecture_id,
            version=arch.version,
            domains=resolved_domains,
            compiled_at=datetime.utcnow(),
        )
```

---

## 5. Dependency Rules — The Laws

These are not guidelines. They are enforced in code review. Any PR that violates them must be revised before merge.

### Law 1 — Downward Dependency Only

```
apps/api/app/
│
├ architecture/    → may call: control_plane (via registry), ai/architect, core (read-only)
├ control_plane/   → may call: core (read + write), ai/blueprint
├ ai/              → may call: nothing in runtime, nothing in control_plane or architecture
├ core/            → may call: nothing (db, redis only)
└ middleware/       → may call: core (for RBAC checks), auth

FORBIDDEN:
  core → architecture     ❌
  core → ai               ❌
  ai → core               ❌ (ai output flows through control_plane or architecture)
  ai → architecture       ❌ (ai/architect returns data TO architecture, not calls into it)
  control_plane → architecture ❌ (control_plane must not know IAL exists)
```

### Law 2 — AI Outputs Flow Through Layer Boundaries

```
ai/architect produces: ERP graph operation JSON
    → returned to architecture/services/ which applies it to graph
    → architecture/compiler/ resolves into runtime package
    → control_plane/api_keys/ issues versioned key

ai/blueprint produces: workflow blueprint JSON
    → returned to control_plane/workflows/ for 4-stage validation + deploy

NEVER:
  ai/architect → core/workflow_engine    ❌
  ai/blueprint → database directly       ❌
```

### Law 3 — Services Communicate via Registries, Not SQL Joins

```python
# ✅ CORRECT — architecture reads runtime via registry
class WorkflowRegistry:
    def get(self, workflow_id: str) -> WorkflowMetadata:
        """Public interface. Returns only what architecture needs to know."""
        wf = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
        return WorkflowMetadata(
            id=wf.id,
            version=wf.version,
            status=wf.status,
            institution_id=wf.institution_id,
        )

# ❌ FORBIDDEN — architecture joining across workflow tables directly
# from apps.api.app.models.workflow import Workflow  ← in architecture/ code
```

### Law 4 — No Cross-Domain DB Access

Each domain logically owns its tables. Even though they share one PostgreSQL database, no service queries another domain's tables directly. Use service calls or registries.

```
Domain          Owns Tables
─────────────────────────────────────────────
core            (stateless — no direct tables)
control_plane   workflows, projects, applications, api_keys, templates, events
architecture    institution_architectures, architecture_versions
auth            users, sessions
```

### Law 5 — Compilation Is The Only Architecture→Runtime Mutation Boundary

```
architecture/compiler/compiler.py
    ↓
Reads:  workflows (via WorkflowRegistry)
Writes: architecture_versions.compiled_package (its own table only)
Signals to: control_plane/api_keys/ (via orchestrator — not direct import)

Nothing else in architecture/ writes to control_plane or core tables.
```

### Law 6 — The 500-Line Rule

Any service file exceeding 500 lines must be split. No exceptions. Signs that a file is approaching God Service status:

- Method count > 15
- Imports from more than 3 different domains
- Methods that both read AND write to multiple tables in one function

---

## 6. Service-by-Service Specification

### 6.1 `architecture/services/architecture_service.py`

**Answers:** What structure exists? How does it change?

```python
class ArchitectureService:
    """
    Single responsibility: manage ERP graph lifecycle.
    Calls: ai/architect (for NLP), architecture/diff (for diffs),
           architecture/versioning (for version records)
    Never calls: core, control_plane
    """

    async def create(self, project_id, institution_id, prompt, user_id) -> Architecture
    async def apply_prompt(self, architecture_id, prompt) -> PromptResult
        # PromptResult = { graph, diff, version, rationale, from_cache }
    async def get(self, architecture_id) -> Architecture
    async def list_for_project(self, project_id) -> list[Architecture]
    async def get_version_diff(self, architecture_id, version_n) -> ArchitectureDiff
```

**Does NOT handle:** compilation, API key issuance, workflow deployment.

---

### 6.2 `architecture/compiler/compiler.py`

**Answers:** How does architecture become runtime artifacts?

```python
class ArchitectureCompiler:
    """
    Single responsibility: resolve architecture → compiled runtime package.
    Calls: WorkflowRegistry (read-only), architecture/versioning
    Never calls: control_plane/api_keys (delegates via orchestrator)
    """

    async def compile(self, architecture_id: str) -> CompiledPackage
    def _resolve_domain(self, domain: dict) -> ResolvedDomain
    def _validate_completeness(self, domains: list) -> CompileWarnings
```

---

### 6.3 `architecture/versioning/version_manager.py`

**Answers:** What versions exist? How do they relate?

```python
class VersionManager:
    """
    Single responsibility: manage architecture version records.
    Pure DB operations on architecture_versions table.
    """

    async def create_version(self, architecture_id, prompt, diff, compiled_package=None) -> ArchitectureVersion
    async def get_version(self, architecture_id, version_n) -> ArchitectureVersion
    async def list_versions(self, architecture_id) -> list[ArchitectureVersion]
    async def get_latest(self, architecture_id) -> ArchitectureVersion
```

---

### 6.4 `architecture/diff/graph_diff.py`

**Answers:** What changed between two graph versions?

```python
# Pure functions only — no DB access, no imports from other domains

def compute_diff(prev_graph: dict, next_graph: dict) -> ArchitectureDiff:
    """
    Structural comparison only.
    Returns: { added_domains, removed_domains, modified_domains,
               added_integrations, removed_integrations, summary }
    """

def summarize_diff(diff: ArchitectureDiff) -> str:
    """One-line human-readable summary."""

def apply_operation(current_graph: dict, operation: dict) -> dict:
    """
    Pure function: applies AI-returned operation to graph.
    No side effects. Returns new graph dict.
    """
```

---

### 6.5 `architecture/orchestrator/compile_pipeline.py`

**Answers:** How does a full compile+key-issue flow execute without God Service?

```python
class CompilePipeline:
    """
    Orchestrates compile flow across domain boundaries.
    Coordinates — does not own domain logic.

    Flow:
      1. architecture/compiler.compile()    → CompiledPackage
      2. architecture/versioning.create()   → ArchitectureVersion
      3. control_plane/api_keys.issue()     → raw API key
      4. event_engine.emit()                → architecture.compiled event
      5. architecture DB update             → status = compiled

    Called by: architecture/routes/architect.py (POST /architect/:id/compile)
    """

    def __init__(
        self,
        compiler: ArchitectureCompiler,
        version_manager: VersionManager,
        api_key_service: APIKeyService,   # injected, not imported — control_plane
        event_engine: EventEngine,
    ):
        ...

    async def execute(self, architecture_id: str, user_id: str) -> CompileResult:
        package = await self.compiler.compile(architecture_id)
        version = await self.version_manager.create_version(
            architecture_id=architecture_id,
            prompt="[compile]",
            compiled_package=package.dict(),
        )
        raw_key = await self.api_key_service.issue_versioned(
            project_id=package.project_id,
            version_tag=f"erp_v{package.version}",
            architecture_version_id=str(version.id),
        )
        await self.event_engine.emit("architecture.compiled", {...})
        return CompileResult(
            version_tag=f"erp_v{package.version}",
            api_key=raw_key,  # shown once
            compiled_package=package,
        )
```

---

### 6.6 `ai/blueprint/blueprint_generator.py`

**Answers:** How is a workflow blueprint produced from a natural language description?

- Calls: `ai/blueprint/validators/` (4-stage pipeline)
- Uses: `ProviderRouter` (Gemini Flash → Groq → Mock)
- Returns: `{ proposal_id, blueprint, validation }`
- Never calls: `core`, `control_plane`, `architecture`

Blueprint output flows to `control_plane/workflows/service.py` for deployment.

---

### 6.7 `ai/architect/provider_router.py`

**Answers:** Which AI provider responds to this ERP composition request?

- Cascade: Gemini 1.5 Flash (free) → Groq Llama 3.1 8B (free) → Mock
- Redis cache check before every call (cache key = SHA-256 of mode + prompt)
- Exponential backoff on 429
- Returns: ERP function call result as dict
- Never calls: any domain service (pure infrastructure)

Full implementation documented in IMPL spec Section 3.2.

---

## 7. Request Flow Diagrams

### 7.1 Apply NLP Prompt to Architecture

```
POST /api/architect/:id/prompt { prompt: "Add scholarship domain" }
    │
    ▼
middleware/auth_middleware.py
    │  validate JWT, attach user
    ▼
middleware/tenant.py
    │  enforce institution_id scoping
    ▼
architecture/routes/architect.py
    │  extract architecture_id, prompt
    ▼
architecture/services/architecture_service.py
    │  fetch current graph from DB
    ▼
ai/architect/provider_router.py
    │  check Redis cache
    │  → cache hit: return cached result immediately
    │  → cache miss: call Gemini Flash
    │  → rate limited: try Groq Llama
    │  → all limited: return mock
    ▼
architecture/diff/graph_diff.py (pure function)
    │  apply_operation(current_graph, ai_result) → new_graph
    │  compute_diff(current_graph, new_graph) → diff
    ▼
architecture/versioning/version_manager.py
    │  create_version(architecture_id, prompt, diff)
    ▼
DB: UPDATE institution_architectures SET graph_json=..., version=version+1
    │
    ▼
HTTP 200: { graph, diff, version, rationale, from_cache }
    │
    ▼
[core/ untouched throughout]
```

### 7.2 Compile Architecture → Issue Versioned Key

```
POST /api/architect/:id/compile
    │
    ▼
architecture/routes/architect.py
    │
    ▼
architecture/orchestrator/compile_pipeline.py
    │
    ├──→ architecture/compiler/compiler.py
    │       │  WorkflowRegistry.get() ← read-only call to control_plane
    │       │  Returns: CompiledPackage
    │       ▼
    ├──→ architecture/versioning/version_manager.py
    │       │  create_version(compiled_package=...)
    │       ▼
    ├──→ control_plane/api_keys/service.py (injected dependency)
    │       │  generate_api_key() → (raw_key, key_hash)
    │       │  INSERT api_keys (version_tag, architecture_version_id)
    │       │  Returns: raw_key (shown once)
    │       ▼
    └──→ core/event_engine.py
            │  emit("architecture.compiled", {...})
            │  → PostgreSQL events table
            │  → Redis stream
            │  → WebSocket broadcast

HTTP 200: { version_tag, api_key (raw), compiled_package }
```

### 7.3 Deploy Blueprint (Mode A — existing flow, unchanged)

```
POST /api/ai/generate { prompt, context }
    │
    ▼
ai/blueprint/blueprint_generator.py
    │  provider_router → Gemini/Groq function calling
    │  4-stage validation pipeline
    ▼
HTTP 200: { proposal_id, blueprint, validation }
    │
    ▼
[User reviews Blueprint Preview in console — human-in-the-loop]
    │
    ▼
POST /api/ai/blueprints/:id/deploy
    │
    ▼
ai/blueprint/blueprint_generator.py
    │  re-run validation (backend authoritative)
    ▼
control_plane/workflows/service.py
    │  deploy_workflow(definition, project_id, ...)
    ▼
core/workflow_engine.py
    │  [workflow now registered in runtime]
    ▼
core/event_engine.py
    │  emit("ai.blueprint.deployed")

HTTP 200: { workflow_id, status: "active" }
```

---

## 8. Database Ownership Model

All tables live in one PostgreSQL 15 database (Supabase or self-hosted). Logical ownership is enforced at the service layer — no cross-domain table access.

### 8.1 Table Ownership

| Table | Owned By | Notes |
|-------|----------|-------|
| `institutions` | auth | Tenant root |
| `users` | auth | Institution members |
| `projects` | control_plane/projects | Scoped to institution |
| `workflows` | control_plane/workflows | JSONB definition, immutable after deploy |
| `applications` | control_plane/applications | References workflow_id + workflow_version |
| `events` | core (via event_engine) | Append-only, never modified |
| `api_keys` | control_plane/api_keys | Hashed. Two new columns for versioning |
| `templates` | control_plane/templates | Read-only registry |
| `blueprint_proposals` | ai/blueprint | Draft + validation results |
| `institution_architectures` | architecture | ERP graph + status |
| `architecture_versions` | architecture | Diffs + compiled packages |

### 8.2 Row-Level Security

Every table that contains multi-tenant data has RLS enabled with `institution_id` policy:

```sql
-- Pattern applied to all multi-tenant tables:
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

CREATE POLICY {table}_institution_isolation ON {table}
    USING (institution_id = current_setting('app.institution_id')::uuid);
```

Tables with RLS: `workflows`, `applications`, `events`, `api_keys`, `projects`, `institution_architectures`, `architecture_versions`.

### 8.3 Critical Schema Constraints

```sql
-- Workflows: immutable JSONB definition
-- No UPDATE on definition column after status = 'active'
CREATE RULE no_update_active_workflow AS
    ON UPDATE TO workflows
    WHERE OLD.status = 'active' AND OLD.definition IS DISTINCT FROM NEW.definition
    DO INSTEAD NOTHING;
-- (Or enforce in service layer — belt and suspenders)

-- Applications: preserve workflow version snapshot
-- Ensures deterministic re-execution even after workflow upgrades
ALTER TABLE applications
    ADD COLUMN workflow_version INTEGER NOT NULL;
-- This column is set at submission time and never changed

-- architecture_versions: append-only
-- No DELETE, no UPDATE on existing rows
```

---

## 9. AI Subsystem Architecture

### 9.1 Provider Hierarchy

```
Request arrives at ai/architect/provider_router.py
          │
          ▼
Check Redis cache (key = SHA-256(mode + prompt + graph_summary))
          │
    Cache hit → return (0ms, 0 cost)
    Cache miss ↓
          │
    Priority 1: Gemini 1.5 Flash
    Free: 15 RPM, 1M tokens/day
    Rate limited? ↓
          │
    Priority 2: Groq Llama 3.1 8B
    Free: 30 RPM, 14,400 req/day
    Rate limited? ↓
          │
    Priority 3: Mock (deterministic)
    0ms, 0 cost — used for demo/dev
```

### 9.2 Mode Separation — Critical

| | Mode A: Blueprint Generator | Mode B: ERP Architect |
|---|---|---|
| File | `ai/blueprint/blueprint_generator.py` | `ai/architect/provider_router.py` |
| Called by | `control_plane` (deploy flow) | `architecture/services` |
| Output | Workflow blueprint JSON | ERP graph operation JSON |
| Validation | 4-stage pipeline (existing) | Structural diff only |
| Temp | 0.3 | 0.2 |
| Session | Single-shot | Iterative |
| Function schema | Workflow state machine | `compose_erp_architecture` |

Mode B never directly generates workflow blueprints. When a user says "generate a blueprint for this domain," the architecture service routes that sub-request through Mode A's generate endpoint — it's a handoff, not a bypass.

### 9.3 Function Schemas

**Mode A** (existing — workflow state machine):
```json
{
  "name": "generate_workflow_blueprint",
  "parameters": {
    "initial_state": "string",
    "states": { "type": "object" },
    "transitions": { "type": "array" },
    "roles": { "type": "array" }
  }
}
```

**Mode B** (new — ERP composition):
```json
{
  "name": "compose_erp_architecture",
  "parameters": {
    "operation": { "enum": ["create", "add_domain", "add_integration", "update_domain"] },
    "domain": { "id": "string", "label": "string", "modules": [], "requires_workflow": "boolean" },
    "integration": { "from_domain": "string", "to_domain": "string", "trigger_event": "string" },
    "rationale": "string"
  }
}
```

### 9.4 Cache TTL Strategy

| Prompt Type | TTL | Rationale |
|-------------|-----|-----------|
| ERP composition | 24h | Domain structures don't change by the hour |
| Blueprint generation | 1h | More variation expected |
| Compliance checks | 7 days | Regulations don't change daily |
| Demo cache warming | 7 days | Locked for demo stability |

---

## 10. Orchestrator Pattern — Preventing God Services

### 10.1 The Compile Pipeline as Reference Implementation

The `CompilePipeline` in `architecture/orchestrator/compile_pipeline.py` is the template for how multi-domain operations work in Orquestra. Use it as a reference when building future cross-domain flows.

**Signs you need an orchestrator (not a fat service):**

- A flow touches more than 2 domain services
- A flow issues events AND writes to DB AND calls external services
- A flow requires rollback if one step fails

**Signs you DON'T need an orchestrator:**

- A flow touches only one domain
- A flow is read-only
- A flow's steps are all within one service file

### 10.2 Orchestrator Rules

```
1. Orchestrators coordinate — they don't own logic
   Correct: orchestrator.execute() calls service.method() for each step
   Wrong:   orchestrator contains the business logic itself

2. Orchestrators are thin — under 100 lines
   If >100 lines, a step has been written inside orchestrator (wrong)

3. Orchestrators handle failure at the coordination level
   Each step can succeed or fail
   Orchestrator decides: continue, retry, or rollback

4. Orchestrators are fully tested
   Every step is mockable
   Each failure path is tested
```

### 10.3 Anti-God Service Checklist

Before adding a method to any service file:

```
□ Does this method belong to this service's single responsibility?
□ Does this method import from more than 2 domains?
□ Does this file now exceed 500 lines?
□ Does this method do more than one thing (validate AND persist AND emit)?

If any box is checked → split into smaller methods or create an orchestrator.
```

---

## 11. Migration Strategy — Zero Breakage

### Phase 1 — Create New Domain (Day 1-2, no breakage)

```
1. Create apps/api/app/architecture/ with empty __init__.py files
2. Create apps/api/app/ai/blueprint/ and apps/api/app/ai/architect/
3. Move blueprint_generator.py into ai/blueprint/ (update main.py import)
4. Move existing validators/ into ai/blueprint/validators/
5. Register new architecture router in main.py (empty for now)

Result: Zero existing functionality broken. New domain boundary established.
```

### Phase 2 — Reorganize Control Plane (Day 2-3, no breakage)

```
1. Create apps/api/app/control_plane/ with subdomain folders
2. For each existing routes/*.py file:
   a. Create control_plane/{domain}/router.py (copy existing router)
   b. Create control_plane/{domain}/service.py (extract service logic)
   c. Update main.py to use new router path
   d. Remove old routes/*.py file (or leave as thin shim)
3. No API endpoint URLs change — routers are mounted at same paths

Result: Logical separation achieved. API surface unchanged.
```

### Phase 3 — Implement Architecture Domain (Day 3-4)

```
1. Implement architecture/models/ (SQLAlchemy)
2. Run Alembic migration (add_ial_tables)
3. Implement architecture/diff/graph_diff.py (pure functions, unit-testable)
4. Implement ai/architect/provider_router.py
5. Implement architecture/services/architecture_service.py
6. Implement architecture/compiler/compiler.py
7. Implement architecture/orchestrator/compile_pipeline.py
8. Implement architecture/routes/architect.py
9. Register architect router in main.py

Result: Full IAL available. Existing system untouched.
```

### Phase 4 — Wire Versioned Keys (Day 4-5)

```
1. Add Alembic migration for api_keys columns (version_tag, architecture_version_id)
2. Implement middleware/version_router.py
3. Register middleware in main.py (after auth middleware)
4. Test: existing keys (no version_tag) → identical behavior to before

Result: Versioned key routing live. Zero breaking change for existing keys.
```

---

## 12. Internal API Contracts

These are the interfaces between domains. They are the only sanctioned way for domains to communicate.

### 12.1 WorkflowRegistry (control_plane → architecture)

```python
# control_plane/workflows/registry.py

class WorkflowRegistry:
    """
    Public read interface for architecture domain.
    Exposes only what architecture needs.
    """

    def get(self, workflow_id: str) -> WorkflowMetadata | None:
        ...

    def get_by_project(self, project_id: str) -> list[WorkflowMetadata]:
        ...

@dataclass
class WorkflowMetadata:
    id: str
    version: int
    status: str           # active | archived | draft
    institution_id: str
    project_id: str
    definition_hash: str  # for integrity check — NOT the full definition
```

### 12.2 APIKeyService interface (control_plane — called by architecture/orchestrator)

```python
# control_plane/api_keys/service.py — public interface

async def issue_versioned(
    self,
    project_id: str,
    version_tag: str,
    architecture_version_id: str,
) -> str:  # returns raw key (shown once)
    ...
```

### 12.3 EventEngine interface (core — called by all layers)

```python
# core/event_engine.py — public interface (already exists)

async def emit(
    self,
    event_type: str,
    data: dict,
    institution_id: str,
    project_id: str,
) -> None:
    # Persists to DB, publishes to Redis, broadcasts via WebSocket
    ...
```

---

## 13. System Invariants (Backend)

These are the non-negotiable truths of the Orquestra backend. All code is evaluated against them.

```
1. Deployed workflows are immutable
   → Enforced in: control_plane/workflows/service.py
   → DB constraint: RLS + application-level guard on definition column

2. Every state transition emits an event
   → Enforced in: core/workflow_engine.py (always calls event_engine.emit)
   → Never bypassed from control_plane or architecture

3. AI output must pass 4-stage validation before deploy
   → Enforced in: ai/blueprint/blueprint_generator.py
   → control_plane/workflows/service.py re-validates on deploy (backend authoritative)

4. Multi-tenant isolation enforced at DB + API + WebSocket
   → DB: RLS on all multi-tenant tables (institution_id policy)
   → API: middleware/tenant.py on every route
   → WebSocket: ws.py subscribes per institution_id + project_id

5. No dynamic code execution
   → core/condition_parser.py: recursive descent parser, no eval()
   → ai/: function calling only, temperature ≤ 0.3, no free-form exec
   → architecture/diff/graph_diff.py: pure data transforms

6. Version always visible
   → Every workflow has .version column
   → Every architecture has .version column
   → Every API key with version_tag exposes it in responses

7. No auto-deploy
   → Blueprint deploy requires explicit POST /ai/blueprints/:id/deploy
   → Architecture compile requires explicit POST /architect/:id/compile
   → No background tasks that deploy without user action

8. Runtime never imports Architecture
   → Enforced in code review
   → core/ has no imports from architecture/, ai/, or control_plane/

9. Compilation is the only Architecture→Runtime boundary
   → Only architecture/compiler/compiler.py crosses this boundary
   → Via WorkflowRegistry read interface only (no writes from architecture to runtime tables)

10. Applications preserve workflow version snapshot
    → applications.workflow_version set at creation, never updated
    → Ensures deterministic replay even after workflow upgrades
```

---

## 14. Complete File Manifest

Files to CREATE (not yet existing), organized by priority:

### Priority 1 — New Domain Boundaries (Before any IAL code)

```
apps/api/app/architecture/__init__.py
apps/api/app/architecture/models/__init__.py
apps/api/app/architecture/services/__init__.py
apps/api/app/architecture/compiler/__init__.py
apps/api/app/architecture/versioning/__init__.py
apps/api/app/architecture/diff/__init__.py
apps/api/app/architecture/orchestrator/__init__.py
apps/api/app/architecture/routes/__init__.py
apps/api/app/ai/blueprint/__init__.py
apps/api/app/ai/architect/__init__.py
apps/api/app/control_plane/__init__.py
apps/api/app/middleware/__init__.py
```

### Priority 2 — AI Architect Mode

```
apps/api/app/ai/architect/provider_router.py
apps/api/app/ai/architect/prompt_factory.py
apps/api/app/ai/architect/erp_schema.py
apps/api/app/ai/architect/backoff.py
apps/api/app/ai/architect/quota_tracker.py
```

### Priority 3 — Architecture Domain

```
apps/api/app/architecture/models/institution_architecture.py
apps/api/app/architecture/models/architecture_version.py
apps/api/app/architecture/diff/graph_diff.py
apps/api/app/architecture/versioning/version_manager.py
apps/api/app/architecture/services/architecture_service.py
apps/api/app/architecture/compiler/compiler.py
apps/api/app/architecture/orchestrator/compile_pipeline.py
apps/api/app/architecture/routes/architect.py
```

### Priority 4 — Control Plane Registry

```
apps/api/app/control_plane/workflows/registry.py
apps/api/app/control_plane/api_keys/service.py (refactor from routes)
```

### Priority 5 — Middleware + DB

```
apps/api/app/middleware/version_router.py
apps/api/alembic/versions/xxx_add_ial_tables.py
```

### Files to MOVE (not rewrite — just relocate)

```
apps/api/app/ai/blueprint_generator.py
  → apps/api/app/ai/blueprint/blueprint_generator.py

apps/api/app/ai/validators/
  → apps/api/app/ai/blueprint/validators/

apps/api/app/tenant.py
  → apps/api/app/middleware/tenant.py
```

### Files to NOT TOUCH

```
apps/api/app/core/workflow_engine.py
apps/api/app/core/event_engine.py
apps/api/app/core/rbac_engine.py
apps/api/app/core/schema_engine.py
apps/api/app/core/condition_parser.py
apps/api/app/auth/
apps/api/app/db/
apps/api/app/ws.py
```

---

*This document is the backend contract. It is coherent with the Implementation Spec (IMPL), the Frontend Architecture Spec (FAS), the PRD, DESIGN.md, and TECH_STACK.md. Any backend decision — new route, new service method, new table — is evaluated against the layer boundaries and invariants defined here. Update this document when backend API contracts change, before writing the code.*
