# ORQUESTRA AI ARCHITECTURE SPECIFICATION
## Institutional Intelligence Layer · Three-Mode AI System · Complete Implementation Guide

**Document Version:** 2.0 — Definitive  
**Grounded In:** Current repo structure (March 2026) · BAS · FAS · IMPL  
**Status:** Single source of truth for all AI decisions in Orquestra  
**Supersedes:** All previous AI sections in ORQUESTRA_IMPLEMENTATION.md

---

## DOCUMENT STRUCTURE

This document covers everything required to implement, extend, and reason about AI in Orquestra.

- **Section 1–2**: Why the AI is designed the way it is. Read first.
- **Section 3–5**: The three AI modes. One section per mode — everything in one place.
- **Section 6**: ERP Visualization Engine — how deployed workflows become a live institutional preview.
- **Section 7**: Cross-surface connection model — how Workflow, Templates, and Architect communicate.
- **Section 8**: NLP intent classification — the routing brain.
- **Section 9**: Free provider strategy — zero cost operation.
- **Section 10–12**: Data flows, API contracts, frontend component specification.
- **Section 13**: Backend file manifest grounded in the current repo.
- **Section 14**: Invariant checklist.

---

## 1. PHILOSOPHICAL FOUNDATION

### 1.1 What AI Is For In Orquestra

Orquestra is institutional workflow infrastructure. AI does not run workflows, does not make decisions on behalf of institutions, and does not replace the runtime engine.

AI serves exactly three purposes:

```
PURPOSE 1 — Workflow Generation (Mode A)
  Translate a natural language description of institutional process
  into a validated, deployable workflow state machine.
  
  "Auto-accept above 90%, review 75–90%, reject below 75%"
  → deterministic JSON workflow definition → deployed to runtime

PURPOSE 2 — ERP Composition + Visualization (Mode B)
  Translate natural language institutional intent into a domain graph,
  and render that graph as a live ERP dashboard preview showing what
  the institution looks like when running.
  
  "Build an ERP for a university with admissions and finance"
  → domain graph + linked workflows → live ERP preview

PURPOSE 3 — Template Customization (Mode C)
  Apply specific, described modifications to an existing template
  workflow before or after deployment.
  
  "Change auto-accept threshold to 85%, add a waitlist state"
  → diff of changes → validated modified definition → deployment-ready
```

AI outputs always flow through human confirmation before affecting the runtime. No AI mode deploys autonomously.

### 1.2 The Architectural Problem That Was Solved

The previous architecture placed workflow creation inside the Architect page. This caused conceptual collapse — the same page was both generating execution logic (workflow state machines) and describing structural layout (domain graph). These are fundamentally different concerns.

```
BEFORE — WRONG
─────────────────────────────────────────────────────────────────────
Architect page = workflow creator + ERP domain viewer

Problems:
  - Users confused about whether they were building logic or structure
  - AI Generator was a separate navigation item with no surface home
  - Templates were deploy-only with no intelligence
  - ERP visualization had no connection to deployed workflows
  - Workflow creation could happen from Architect page, bypassing
    the workflow page's validation surface

AFTER — CORRECT
─────────────────────────────────────────────────────────────────────
Workflow page  = create, edit, deploy workflow state machines (Mode A)
Templates page = browse, customize with AI, deploy templates (Mode C)
Architect page = ERP domain graph + live ERP visualization (Mode B)
                 connects all deployed workflows into one institutional view
```

### 1.3 The Developer Journey

When a developer builds an institution on Orquestra, they follow a natural progression:

```
Step 1 — Workflow page
  Describe a process → AI generates workflow blueprint
  Review 5-tab preview → Deploy

Step 2 — Templates page (optional)
  Find a close match → Customize with AI
  Deploy customized version → Creates another workflow

Step 3 — Architect page
  Describe the institution's structure
  ("Add admissions, finance, and scholarship domains")
  → AI composes domain graph
  → Page shows: "Admissions workflow deployed — link it to the Admissions domain?"
  → Link → ERP preview renders live with real metrics
  → Iterate with NLP prompts until the whole institution is modeled
  → Compile → Issue versioned API key → Build your applications
```

The three pages are stages in an institutional design journey, not independent features.

---

## 2. AI SYSTEM MAP

### 2.1 Three Modes — Complete Overview

```
apps/api/app/ai/

├── blueprint/                    ← MODE A: Workflow AI
│   ├── validators/
│   │   ├── __init__.py
│   │   ├── compliance_checker.py     (MOVE from app/ai/validators/)
│   │   ├── graph_analyzer.py         (MOVE from app/ai/validators/)
│   │   ├── permission_analyzer.py    (MOVE from app/ai/validators/)
│   │   └── schema_validator.py       (MOVE from app/ai/validators/)
│   ├── __init__.py
│   ├── blueprint_generator.py        (MOVE from app/ai/)
│   └── router.py                     (ADD)
│
├── architect/                    ← MODE B: ERP Architect AI
│   ├── __init__.py
│   ├── provider_router.py            (MOVE from app/ai/)
│   ├── prompt_factory.py             (ADD)
│   ├── erp_schema.py                 (ADD)
│   ├── visualization_generator.py    (ADD)
│   ├── nlp_intent_parser.py          (ADD)
│   ├── workflow_connector.py         (ADD)
│   ├── backoff.py                    (ADD)
│   └── quota_tracker.py              (ADD)
│
└── template_customizer/          ← MODE C: Template Customization AI (ADD)
    ├── __init__.py
    ├── customizer.py
    ├── diff_explainer.py
    └── router.py
```

### 2.2 Mode Identity Contract

| | Mode A | Mode B | Mode C |
|---|---|---|---|
| **Question answered** | What workflow matches this description? | What ERP structure matches this? | What modifications match this request? |
| **Input** | NL + institution context | NL + current domain graph | NL + current template definition |
| **Output** | Workflow blueprint JSON | ERP graph operation + visualization config | Template modification + diff |
| **Validated by** | 4-stage pipeline | Structural diff only | 4-stage pipeline (Mode A validators) |
| **Temperature** | 0.3 | 0.2 | 0.25 |
| **Session type** | Single-shot | Iterative | Single-shot or iterative |
| **Called by** | `control_plane/workflows/service.py` | `architecture/services/architecture_service.py` | `control_plane/templates/service.py` |
| **Calls runtime** | Never directly | Never directly | Never directly |

### 2.3 Dependency Direction

```
Mode C uses → Mode A validators → validates output for → control_plane/templates
                                                               ↓ deploys to
Mode A generates → blueprint → control_plane/workflows       core/workflow_engine
                                         ↓ registers with         (NEVER touched by AI)
Mode B composes → domain graph → architecture/compiler → control_plane/api_keys
                       ↓
              visualization_generator (pure transform, no AI)
```

AI never has a direct path to the runtime kernel. All AI outputs flow through a control plane service that applies its own validation before touching execution.

---

## 3. MODE A — WORKFLOW AI (WORKFLOW PAGE)

### 3.1 Surface Placement

Mode A is embedded inside the Workflow page — not a standalone "AI Generator" navigation item. The sidebar entry `AI Generator` is removed. AI generation is a creation mode within Workflows.

```
/console/workflows

[+ New Workflow] → slide-in panel:

  ┌─────────────────────────────────────────────────────────┐
  │ Create Workflow                                    [✕]   │
  │                                                          │
  │ ┌──────────────────────┐  ┌──────────────────────────┐  │
  │ │  ✦ Generate with AI  │  │  📄 Start from Scratch   │  │
  │ └──────────────────────┘  └──────────────────────────┘  │
  └─────────────────────────────────────────────────────────┘
```

### 3.2 Complete Generation Flow

```
STEP 1: Context Panel

  Institution type:  [University ▼]
  Department:        [Admissions          ]
  Compliance tags:   [✓ FERPA] [ HIPAA] [ DPDP]

  Describe what this workflow should do:
  ┌──────────────────────────────────────────────────────┐
  │ Auto-accept above 90%, place in manual review       │
  │ for 75–90%, auto-reject below 75%         2000/✓   │
  └──────────────────────────────────────────────────────┘
                                      [Generate →]

  → POST /api/ai/generate
  → 3–5 second skeleton loading state
  → Backend: provider_router → function call → 4-stage validation

STEP 2: Blueprint Preview (5 tabs)

  [Overview] [Graph] [JSON] [Validation] [RBAC]

  Validation: ✓ Schema  ✓ Graph  ✓ Perms  ⚠ Compliance
  "reviewer role has broad read access — consider narrowing"

  [← Edit prompt]           [Deploy Workflow →]
                             (disabled if validation has errors)

  → [Deploy Workflow] → POST /api/ai/blueprints/:id/deploy
  → Backend re-validates (authoritative)
  → Workflow created → event: workflow.deployed
  → Architect page notified → offers to link to matching domain
```

### 3.3 Mode A API Endpoints

```
POST  /api/ai/generate                Generate blueprint from prompt
GET   /api/ai/blueprints/:id          Fetch proposal (all 5 tabs data)
POST  /api/ai/blueprints/:id/deploy   Deploy as workflow (re-validates)
GET   /api/ai/history                 Last 5 proposals for active project
```

**POST /api/ai/generate — Request:**
```json
{
  "prompt": "Auto-accept above 90%, review 75–90%, reject below 75%",
  "context": {
    "institution_type": "university",
    "department": "admissions",
    "compliance_tags": ["FERPA"],
    "project_id": "uuid"
  }
}
```

**POST /api/ai/generate — Response:**
```json
{
  "proposal_id": "uuid",
  "blueprint": {
    "metadata": { "name": "Undergraduate Merit Admissions", "version": "1.0", "compliance": ["FERPA"] },
    "workflows": {
      "main": {
        "initial_state": "submitted",
        "states": {
          "submitted": { "type": "intermediate" },
          "auto_accepted": { "type": "terminal" },
          "under_review": { "type": "intermediate" },
          "auto_rejected": { "type": "terminal" },
          "accepted": { "type": "terminal" },
          "rejected": { "type": "terminal" }
        },
        "transitions": [
          { "from": "submitted", "to": "auto_accepted", "condition": "percentage >= 90", "event": "application.auto_accepted" },
          { "from": "submitted", "to": "under_review", "condition": "percentage >= 75 and percentage < 90", "event": "application.moved_to_review" },
          { "from": "submitted", "to": "auto_rejected", "condition": "percentage < 75", "event": "application.auto_rejected" },
          { "from": "under_review", "to": "accepted", "condition": "committee_decision == 'accept'", "event": "application.accepted" },
          { "from": "under_review", "to": "rejected", "condition": "committee_decision == 'reject'", "event": "application.rejected" }
        ]
      }
    },
    "roles": [
      { "name": "applicant", "permissions": ["application:submit", "application:read_own"] },
      { "name": "reviewer", "permissions": ["application:read", "application:transition"] },
      { "name": "admin", "permissions": ["application:read", "application:transition", "workflow:read"] }
    ]
  },
  "validation": {
    "schema": { "passed": true, "errors": [] },
    "graph": { "passed": true, "errors": [] },
    "permissions": { "passed": true, "warnings": ["reviewer role has broad access"] },
    "compliance": { "passed": true, "errors": [] },
    "all_passed": true,
    "has_only_warnings": true
  },
  "_provider": "gemini-1.5-flash",
  "_from_cache": false
}
```

### 3.4 Mode A Function Schema

```python
# app/ai/blueprint/blueprint_generator.py

WORKFLOW_FUNCTION_SCHEMA = {
    "name": "generate_workflow_blueprint",
    "description": "Generate a deterministic institutional workflow state machine. "
                   "Pure data structure — no code, no dynamic behavior, no eval.",
    "parameters": {
        "type": "object",
        "required": ["metadata", "workflows", "roles"],
        "properties": {
            "metadata": {
                "type": "object",
                "required": ["name", "version"],
                "properties": {
                    "name": {"type": "string", "maxLength": 120},
                    "description": {"type": "string", "maxLength": 500},
                    "version": {"type": "string", "pattern": "^\\d+\\.\\d+$"},
                    "compliance": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["FERPA", "HIPAA", "DPDP", "GDPR", "CCPA"]}
                    }
                }
            },
            "workflows": {
                "type": "object",
                "description": "Named workflow definitions. Always include 'main'.",
                "additionalProperties": {
                    "type": "object",
                    "required": ["initial_state", "states", "transitions"],
                    "properties": {
                        "initial_state": {"type": "string"},
                        "states": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "object",
                                "required": ["type"],
                                "properties": {
                                    "type": {"type": "string", "enum": ["intermediate", "terminal"]},
                                    "description": {"type": "string"}
                                }
                            }
                        },
                        "transitions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["from", "to", "condition", "event"],
                                "properties": {
                                    "from": {"type": "string"},
                                    "to": {"type": "string"},
                                    "condition": {
                                        "type": "string",
                                        "description": "Safe condition: comparisons, and/or, ==, >=, <=, !=. No eval, no imports, no function calls."
                                    },
                                    "event": {"type": "string", "pattern": "^[a-z][a-z0-9]*\\.[a-z][a-z0-9_]*$"}
                                }
                            }
                        }
                    }
                }
            },
            "roles": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["name", "permissions"],
                    "properties": {
                        "name": {"type": "string"},
                        "permissions": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        }
    }
}
```

### 3.5 4-Stage Validation Pipeline

The validators in `app/ai/validators/` move to `app/ai/blueprint/validators/`. Logic unchanged.

```python
# app/ai/blueprint/blueprint_generator.py

async def validate_blueprint(blueprint: dict) -> ValidationResult:
    """
    Runs all 4 stages. Stages 1–3 in parallel, Stage 4 sequential.
    Returns aggregated result — frontend shows all 4 simultaneously.
    """
    schema_result, graph_result, permission_result = await asyncio.gather(
        SchemaValidator().validate(blueprint),
        GraphAnalyzer().validate(blueprint),
        PermissionAnalyzer().validate(blueprint),
    )
    compliance_result = await ComplianceChecker().validate(blueprint)

    return ValidationResult(
        schema=schema_result,
        graph=graph_result,
        permissions=permission_result,
        compliance=compliance_result,
        all_passed=(schema_result.passed and graph_result.passed and
                    permission_result.passed and compliance_result.passed),
        has_only_warnings=not any([schema_result.errors, graph_result.errors,
                                   permission_result.errors, compliance_result.errors]),
    )
```

| Stage | Validator | What It Checks | Blocks Deploy? |
|-------|-----------|----------------|----------------|
| 1 | SchemaValidator | JSON conforms to workflow schema | Yes |
| 2 | GraphAnalyzer | All states reachable, terminal states exist, no orphans | Yes |
| 3 | PermissionAnalyzer | All roles exist, no escalation paths | No — warnings only |
| 4 | ComplianceChecker | Required events emitted for compliance tags | Yes |

---

## 4. MODE B — ERP ARCHITECT AI (ARCHITECT PAGE)

### 4.1 The Two Jobs of Mode B

Every NLP prompt on the Architect page goes through Mode B, which does two things in sequence:

```
JOB 1: Domain Graph Composition
  NLP → intent classification → AI function call → structural operation
  → graph updated → version created → diff computed

JOB 2: ERP Visualization Generation (ALWAYS runs after Job 1)
  Updated graph + linked workflows → visualization config → ERP preview re-renders
  This is a deterministic transform. No AI call. Instant.
```

Job 2 also runs independently when a workflow is linked to a domain (no NLP prompt needed).

### 4.2 NLP Intent Classification

Before any AI call, the prompt is classified. Many Architect page prompts can be resolved without calling an AI provider at all — saving free-tier quota.

| User Types | Intent | AI Call? | Handler |
|-----------|--------|----------|---------|
| "Add a scholarship domain" | compose_domain | ✅ Yes | architecture_service |
| "Connect admissions to finance on application.accepted" | connect_domains | ✅ Yes | architecture_service |
| "Link the admissions workflow I just created" | link_workflow | ❌ No | connection_registry |
| "Use the graduate template for academics" | link_template | ❌ No | connection_registry |
| "Show me what the ERP looks like now" | visualize | ❌ No | visualization_generator |
| "Compile and issue a v2 key" | compile | ❌ No | compile_pipeline |
| "Create a workflow that auto-rejects below 60%" | redirect_to_workflow | ❌ No | redirect response |

**Redirect UX** — when intent is `redirect_to_workflow`:

```
Architect page shows inline message:

  "Workflow creation happens on the Workflows page.
   
   [Open Workflow Creator →]   (pre-fills prompt with the user's text)
   
   Once created, I can link it to any domain here."
```

The Architect page never attempts to create individual workflows.

### 4.3 ERP Composition Function Schema

```python
# app/ai/architect/erp_schema.py

ERP_COMPOSITION_SCHEMA = {
    "name": "compose_erp_architecture",
    "description": "Compose or modify an institutional ERP domain structure. "
                   "Structural description only — no execution logic.",
    "parameters": {
        "type": "object",
        "required": ["operation", "rationale"],
        "properties": {
            "operation": {
                "type": "string",
                "enum": [
                    "create_system", "add_domain", "add_module_to_domain",
                    "add_integration", "remove_domain", "update_domain",
                    "link_workflow", "link_template"
                ]
            },
            "domain": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "pattern": "^[a-z][a-z0-9_]*$"},
                    "label": {"type": "string", "maxLength": 60},
                    "icon": {"type": "string"},
                    "color": {"type": "string", "pattern": "^#[0-9a-fA-F]{6}$"},
                    "modules": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "label": {"type": "string"},
                                "metric_type": {
                                    "type": "string",
                                    "enum": ["count", "percentage", "duration", "currency", "boolean", "list"]
                                },
                                "visualization_hint": {
                                    "type": "string",
                                    "enum": ["card", "chart_line", "chart_bar", "chart_donut",
                                             "table", "calendar", "activity_feed", "stat_counter"]
                                }
                            }
                        }
                    },
                    "requires_workflow": {"type": "boolean"}
                }
            },
            "integration": {
                "type": "object",
                "properties": {
                    "from_domain": {"type": "string"},
                    "to_domain": {"type": "string"},
                    "trigger_event": {"type": "string", "description": "e.g. application.accepted"},
                    "description": {"type": "string"}
                }
            },
            "workflow_link": {
                "type": "object",
                "properties": {
                    "domain_id": {"type": "string"},
                    "workflow_id": {"type": "string"},
                    "workflow_name": {"type": "string"}
                }
            },
            "rationale": {"type": "string"}
        }
    }
}
```

### 4.4 Prompt Factory — Token Efficiency

```python
# app/ai/architect/prompt_factory.py

SYSTEM_PROMPT = """You are an institutional ERP architecture assistant.
Modify domain graph structure based on user intent.

Rules:
- Domains = departments (Admissions, Finance, HR, Scholarship...)
- Modules = capabilities within a domain
- Integrations = data flows triggered by workflow events
- NEVER create workflow execution logic — only domain structure
- NEVER suggest deploying or compiling
- One operation per response — do not batch multiple changes

Output ONLY via function call."""

class ERPPromptFactory:
    def build(self, user_prompt: str, current_graph: dict) -> str:
        """
        Token-efficient: sends domain names + module labels only.
        Does NOT send full graph JSON. Saves ~70% tokens on average.
        """
        domains = current_graph.get("erp_system", {}).get("domains", [])
        integrations = current_graph.get("erp_system", {}).get("integrations", [])

        domain_summary = "\n".join([
            f"  - {d['id']}: {d['label']}"
            f"{' (modules: ' + ', '.join(m['label'] for m in d.get('modules', [])) + ')' if d.get('modules') else ''}"
            f"{' [LINKED: ' + d.get('workflow_name', '') + ']' if d.get('workflow_id') else ''}"
            for d in domains
        ])

        integration_summary = "\n".join([
            f"  - {i['from']} → {i['to']} (on: {i.get('trigger_event', '?')})"
            for i in integrations
        ]) or "  (none yet)"

        return f"""Current ERP:
Domains:
{domain_summary or '  (none yet)'}

Integrations:
{integration_summary}

User: {user_prompt[:500]}"""
```

### 4.5 Architecture Service — Core Flow

```python
# app/architecture/services/architecture_service.py

async def apply_prompt(self, architecture_id: str, prompt: str, user_id: str) -> PromptResult:
    """
    Main entry point for all Architect page prompts.
    1. Classify intent (no AI call)
    2. Route to correct handler
    3. If AI needed: cache → provider cascade → apply operation
    4. Always: compute diff, create version, generate visualization
    """
    intent = self.intent_parser.parse(prompt)

    # Non-AI routes
    if intent.type == "redirect_to_workflow":
        return PromptResult(type="redirect", pre_fill_prompt=prompt,
                            message="Workflow creation happens on the Workflows page.")
    if intent.type == "link_workflow":
        return await self._handle_link(architecture_id, prompt)
    if intent.type == "visualize":
        return await self._refresh_visualization(architecture_id)
    if intent.type == "compile":
        return PromptResult(type="compile_prompt")

    # AI-requiring routes
    arch = await self._load(architecture_id)
    cache_key = self._cache_key(prompt, arch.graph_json)
    cached = await self.redis.get(cache_key)

    if cached:
        operation = json.loads(cached)
        from_cache = True
    else:
        operation = await self.provider_router.complete(
            prompt=self.prompt_factory.build(prompt, arch.graph_json),
            mode="erp_architect",
            function_schema=ERP_COMPOSITION_SCHEMA,
        )
        await self.redis.setex(cache_key, 86400, json.dumps(operation))
        from_cache = False

    new_graph = apply_operation(arch.graph_json, operation)
    diff = compute_diff(arch.graph_json, new_graph)

    arch.graph_json = new_graph
    arch.version += 1
    await self.version_manager.create_version(architecture_id, prompt, diff.dict())

    linked = await self.connection_registry.get_links(architecture_id)
    visualization_config = self.visualization_generator.generate(new_graph, linked)
    arch.visualization_config = visualization_config
    self.db.commit()

    return PromptResult(
        type="success",
        graph=new_graph, diff=diff, version=arch.version,
        rationale=operation.get("rationale", ""),
        visualization_config=visualization_config,
        from_cache=from_cache,
        is_mock=self.provider_router.last_was_mock,
        intent_classified_as=intent.type,
    )
```

---

## 5. MODE C — TEMPLATE CUSTOMIZATION AI (TEMPLATES PAGE)

### 5.1 What Mode C Adds

Before Mode C, templates were browse-and-deploy only. Mode C adds AI customization at two moments:

**Moment 1 — Pre-deploy (inline on Templates page)**
```
Select template → [Customize with AI] → chat panel opens
→ Describe changes → AI applies → diff shown → validation shown
→ [Deploy Customized] or [Deploy Original] or [Reset]
```

**Moment 2 — Post-deploy (from Workflow detail page)**
```
Workflow sourced from template → [AI Customize] button
→ Same panel → creates new draft version → standard deploy flow
```

### 5.2 Templates Page Layout After Mode C

```
/console/templates

[All] [Higher Education] [HR] [Finance] [Healthcare] [General]

┌───────────────────────────────────────────────────────────────────┐
│ TEMPLATE DETAIL (when one is selected)                            │
│                                                                   │
│  Undergraduate Merit Admissions  ★4.9  ✓ verified  FERPA         │
│                                                                   │
│  [Overview] [Workflow Graph] [JSON] [Roles]                       │
│  [State machine diagram — SVG, read-only]                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ ✦ Customize with AI                                       │    │
│  │ "Change threshold from 90% to 85%"             [Apply]   │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │  ✓ Condition changed: percentage >= 90 → percentage >= 85 │    │
│  │    in: submitted → auto_accepted                          │    │
│  │  Validation: ✓ Schema  ✓ Graph  ✓ Perms  ✓ Compliance   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  [Reset to Original]  [Deploy Original]  [Deploy Customized ✓]   │
└───────────────────────────────────────────────────────────────────┘
```

### 5.3 Mode C Function Schema

```python
# app/ai/template_customizer/customizer.py

CUSTOMIZATION_SCHEMA = {
    "name": "customize_workflow_template",
    "description": "Apply a specific user-described modification to a workflow template. "
                   "Make ONLY the change described. Preserve all other structure.",
    "parameters": {
        "type": "object",
        "required": ["change_type", "target", "change", "rationale"],
        "properties": {
            "change_type": {
                "type": "string",
                "enum": [
                    "modify_condition", "add_state", "remove_state",
                    "add_transition", "remove_transition", "modify_role",
                    "add_role", "add_compliance_tag", "rename_state",
                    "error"   # if change would break the graph
                ]
            },
            "target": {
                "type": "object",
                "properties": {
                    "state": {"type": "string"},
                    "transition_from": {"type": "string"},
                    "transition_to": {"type": "string"},
                    "role": {"type": "string"}
                }
            },
            "change": {
                "type": "object",
                "properties": {
                    "condition": {"type": "string"},
                    "state_name": {"type": "string"},
                    "state_type": {"type": "string", "enum": ["intermediate", "terminal"]},
                    "permissions": {"type": "array", "items": {"type": "string"}},
                    "tag": {"type": "string"},
                    "error_message": {"type": "string"}
                }
            },
            "rationale": {"type": "string", "description": "Plain English: what changed and why."}
        }
    }
}

CUSTOMIZER_SYSTEM_PROMPT = """Apply user-described modifications to institutional workflow templates.

Rules:
- Apply EXACTLY the described change. Nothing more.
- Preserve all states, transitions, and roles not mentioned.
- If change creates orphaned states or removes all terminals: use change_type 'error'.
- Conditions: only comparisons (==, !=, >=, <=), and/or, string literals.

Output ONLY via function call."""
```

### 5.4 Customizer — Token-Efficient Prompt

```python
def _build_prompt(self, definition: dict, instruction: str) -> str:
    """Sends state names + condition summaries only — not full JSON."""
    states = list(definition.get("workflows", {}).get("main", {}).get("states", {}).keys())
    transitions = [
        f"{t['from']} → {t['to']} (when: {t['condition']})"
        for t in definition.get("workflows", {}).get("main", {}).get("transitions", [])
    ]
    roles = [r["name"] for r in definition.get("roles", [])]

    return f"""Workflow:
States: {', '.join(states)}
Transitions:
{chr(10).join('  ' + t for t in transitions)}
Roles: {', '.join(roles)}

Instruction: {instruction[:500]}"""
```

### 5.5 Mode C API Endpoints

```
GET   /api/templates                        List all (no project required)
GET   /api/templates/:id                    Get with full definition
POST  /api/templates/:id/customize          Apply AI customization (returns diff, NO deploy)
POST  /api/templates/:id/deploy             Deploy (original or with customization_id)
GET   /api/templates/:id/customizations     Session customization history
```

**POST /api/templates/:id/customize — Response:**
```json
{
  "customization_id": "uuid",
  "diff": {
    "changed_conditions": [
      { "transition": "submitted → auto_accepted", "before": "percentage >= 90", "after": "percentage >= 85" }
    ],
    "added_states": [],
    "removed_states": [],
    "summary": "Auto-accept threshold: 90% → 85%"
  },
  "validation": { "schema": { "passed": true }, "graph": { "passed": true },
                  "permissions": { "passed": true }, "compliance": { "passed": true },
                  "all_passed": true },
  "change_summary": "Updated the auto-accept condition threshold from 90% to 85%"
}
```

---

## 6. ERP VISUALIZATION ENGINE

### 6.1 What The Visualization Is

The Architect page renders a live institutional dashboard preview — not an abstract graph, but a rendered view of what the deployed ERP looks like to end users. Based on the reference design screenshots (LMS dashboard, ERP dashboard, email ERP system), each domain renders as a **metric card** with live data, charts, and status indicators.

```
University ERP — Live Preview                       erp_v2 · LIVE

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ ADMISSIONS ●live│  │ FINANCE   ●live │  │ SCHOLARSHIP○    │
│ ─────────────── │  │ ─────────────── │  │ ─────────────── │
│ 634             │  │ $45,500         │  │ No workflow      │
│ Applications    │  │ Revenue         │  │ linked yet.      │
│ ↑ 10.5% / week  │  │ ↑ 8.2% / week   │  │                  │
│ [Line chart]    │  │ [Bar chart]     │  │ [+ Link workflow] │
│ 180 Pending     │  │ 180 Invoices    │  │                  │
│  12 Accepted    │  │  12 Overdue     │  │                  │
└─────────────────┘  └─────────────────┘  └─────────────────┘

── Integrations ──────────────────────────────────────────
Admissions ──[application.accepted]──────────────────▶ Finance
Finance ──[payment.confirmed]────────────────────────▶ Scholarship

┌──────────────────────────────────────────────────────────┐
│ ✦ Describe a change, or ask to link a workflow...        │
│                                             [Apply]      │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Visualization Config Schema

Stored as JSONB on `institution_architectures.visualization_config`. Fully drives the ERP preview render.

```typescript
// src/types/visualization.ts

interface ERPVisualizationConfig {
  system_name: string;
  layout_mode: "two_column" | "four_grid" | "masonry";
  sections: DomainSection[];
  integrations: IntegrationEdge[];
  generated_at: string;
}

interface DomainSection {
  domain_id: string;
  label: string;
  color: string;
  icon: string;
  status: "live" | "draft" | "unlinked";
  workflow_id: string | null;
  workflow_name: string | null;
  layout: {
    primary_metric: { type: "stat_counter"; label: string; value: string; trend: string | null };
    charts: Array<{ type: "chart_line" | "chart_bar" | "chart_donut"; label: string; data: null }>;
    widgets: Array<"calendar" | "activity_feed" | "table" | "todo_list">;
    modules: Array<{ id: string; label: string; visualization: string; value: string | null }>;
  };
}
```

### 6.3 Visualization Generator — Deterministic Transform

```python
# app/ai/architect/visualization_generator.py

class ERPVisualizationGenerator:
    """
    Pure deterministic transform: graph + linked_workflows → visualization_config.
    No AI call. No side effects. Called after every graph change or workflow link.
    """

    DOMAIN_MAP = {
        "admissions":  {"color": "#3b82f6", "charts": ["chart_line", "chart_donut"], "widgets": ["calendar", "activity_feed"]},
        "finance":     {"color": "#10b981", "charts": ["chart_bar", "chart_line"],   "widgets": ["table"]},
        "hr":          {"color": "#f59e0b", "charts": ["chart_donut"],               "widgets": ["activity_feed", "calendar"]},
        "scholarship": {"color": "#8b5cf6", "charts": ["chart_bar"],                 "widgets": ["table"]},
        "academics":   {"color": "#6366f1", "charts": ["chart_line"],                "widgets": ["calendar", "table"]},
        "default":     {"color": "#6b7280", "charts": ["chart_bar"],                 "widgets": ["activity_feed"]},
    }

    def generate(self, graph: dict, linked_workflows: list[dict]) -> dict:
        domains = graph.get("erp_system", {}).get("domains", [])
        integrations = graph.get("erp_system", {}).get("integrations", [])
        linked_map = {lw["domain_id"]: lw for lw in linked_workflows}

        sections = []
        for d in domains:
            viz = self.DOMAIN_MAP.get(d["id"], self.DOMAIN_MAP["default"])
            linked = linked_map.get(d["id"])
            sections.append({
                "domain_id": d["id"],
                "label": d["label"],
                "color": d.get("color") or viz["color"],
                "icon": d.get("icon", "cube"),
                "status": "live" if linked else "unlinked",
                "workflow_id": linked["workflow_id"] if linked else None,
                "workflow_name": linked.get("workflow_name") if linked else None,
                "layout": {
                    "primary_metric": {"type": "stat_counter", "label": f"Total {d['label']}", "value": "—", "trend": None},
                    "charts": [{"type": c, "label": f"{d['label']} Over Time", "data": None} for c in viz["charts"]],
                    "widgets": viz["widgets"],
                    "modules": [{"id": m["id"], "label": m["label"], "visualization": m.get("visualization_hint", "card"), "value": None}
                                for m in d.get("modules", [])],
                },
            })

        return {
            "system_name": graph.get("erp_system", {}).get("name", "Institutional ERP"),
            "sections": sections,
            "integrations": [{"from": i["from"], "to": i["to"], "event": i.get("trigger_event", ""), "label": i.get("description", "")} for i in integrations],
            "layout_mode": "two_column" if len(sections) <= 2 else "four_grid" if len(sections) <= 4 else "masonry",
            "generated_at": datetime.utcnow().isoformat(),
        }
```

### 6.4 Live Data Population

Domain cards start with `value: "—"`. Once a domain is `live` (workflow linked), the frontend fetches real data:

```typescript
// src/lib/hooks/useERPVisualizationData.ts

export function useERPVisualizationData(architectureId: string) {
  const { visualizationConfig, updateSectionMetrics } = useArchitectStore();

  useEffect(() => {
    if (!visualizationConfig) return;
    const liveSections = visualizationConfig.sections.filter(s => s.status === "live");

    liveSections.forEach(async (section) => {
      if (!section.workflow_id) return;
      try {
        const stats = await fetch(`/api/workflows/${section.workflow_id}/analytics`).then(r => r.json());
        updateSectionMetrics(section.domain_id, {
          primary_value: stats.total_count.toLocaleString(),
          trend: stats.trend_label,
          pending_count: stats.active_count,
          terminal_breakdown: stats.terminal_state_counts,
        });
      } catch {
        // Leave "—" — live data enhances, does not block
      }
    });
  }, [visualizationConfig]);
}
```

### 6.5 Three Visualization Views

| View | What It Shows | Toggle |
|------|--------------|--------|
| **ERP Preview** | Domain metric cards + integration arrows (default) | Toolbar |
| **Workflow Detail** | Expand one domain → full state machine + live application list | Click domain card |
| **Integration Map** | Force-directed graph: domain nodes + event edges | Toolbar |

---

## 7. CROSS-SURFACE CONNECTION MODEL

### 7.1 The Connection Registry

Every workflow deployed from any surface registers in the connection registry. The Architect page reads it to know what's available to link.

```python
# app/architecture/services/connection_registry.py

class WorkflowConnectionRegistry:
    """
    Updated by: Any workflow deploy (Mode A, Mode C, or manual)
    Read by: Architect page (available-workflows endpoint)
    """
    async def get_available_for_project(self, project_id: str) -> list[WorkflowSummary]:
        workflows = await self.db.query(Workflow).filter(
            Workflow.project_id == project_id, Workflow.status == "active"
        ).all()
        arch = await self.db.query(InstitutionArchitecture).filter(
            InstitutionArchitecture.project_id == project_id
        ).first()
        linked_ids = {d.get("workflow_id") for d in
                      (arch.graph_json.get("erp_system", {}).get("domains", []) if arch else [])
                      if d.get("workflow_id")}
        return [WorkflowSummary(
            id=str(w.id), name=w.name, version=w.version,
            source=w.source, template_slug=w.template_slug,
            state_count=len(w.definition.get("workflows", {}).get("main", {}).get("states", {})),
            is_linked=str(w.id) in linked_ids,
        ) for w in workflows]
```

### 7.2 Workflow Link Event Flow

```
ANY SURFACE — Workflow deployed
       ↓
event_engine.emit("workflow.deployed", {
    workflow_id, workflow_name, source, template_slug, project_id
})
       ↓ WebSocket push to all active console sessions
       ↓
Architect page receives event
       ↓
IF architecture exists for this project:
  Toast: "'Undergraduate Merit Admissions' deployed.
          Link to a domain?  [Admissions] [Finance] [Skip]"
  (Domain buttons shown only if names fuzzy-match workflow name)
       ↓
[Admissions] clicked:
  POST /api/architect/:id/link-workflow { domain_id, workflow_id }
       ↓
graph.domains[admissions].workflow_id = "uuid"
       ↓
visualization_generator.generate() → config updated
       ↓
Admissions card: unlinked → LIVE
       ↓
useERPVisualizationData fetches /api/workflows/:id/analytics
→ Card populates: "634 Applications ↑10.5%"
```

### 7.3 Template Deploy → Architect Notification

```
POST /api/templates/:id/deploy { customization_id, project_id }
       ↓
Workflow created: source="template", template_slug="undergraduate"
       ↓
event_engine.emit("template.deployed", { workflow_id, template_slug, customized: true })
       ↓ WebSocket
Architect page: "Template deployed. Link to Admissions domain?" [Link] [Dismiss]
       ↓
POST /api/architect/:id/link-workflow → visualization updates
```

---

## 8. NLP UNDERSTANDING LAYER

### 8.1 Full Intent Classifier

```python
# app/ai/architect/nlp_intent_parser.py

KEYWORD_SETS = {
    "compose_domain":    ["add domain", "add a", "create domain", "new domain", "include",
                          "add module", "add section", "build section", "i want"],
    "connect_domains":   ["connect", "link domain", "when .* trigger", "after .* then",
                          "integrate with", "pipe to", "flows to", "triggers"],
    "link_workflow":     ["link the workflow", "attach workflow", "use workflow",
                          "connect the .* workflow", "link it to", "use the one i just"],
    "link_template":     ["use template", "use the template", "apply template", "use .* template"],
    "visualize":         ["show me", "preview", "render", "what does this look like",
                          "show dashboard", "display", "what have i built"],
    "compile":           ["compile", "issue api key", "issue a key", "create key",
                          "make it live", "versioned key", "deploy architecture"],
    "redirect_to_workflow": ["create a workflow", "generate workflow", "build workflow",
                              "i need a workflow", "make a workflow", "workflow that", "workflow which"],
}

class NLPIntentParser:
    def parse(self, prompt: str) -> ParsedIntent:
        prompt_lower = prompt.lower().strip()
        scores = {}
        for intent, patterns in KEYWORD_SETS.items():
            score = sum(
                len(p.split()) * 0.1 + 0.5
                for p in patterns if re.search(p, prompt_lower)
            )
            scores[intent] = score

        best = max(scores, key=lambda k: scores[k])
        confidence = min(scores[best] / 2.0, 1.0)

        if confidence < 0.2:
            best = "compose_domain"  # Default to AI compose when ambiguous

        if best == "redirect_to_workflow":
            return ParsedIntent(
                type=best, confidence=confidence,
                message="Workflow creation happens on the Workflows page.",
                suggested_action="open_workflow_creator",
                pre_fill_prompt=prompt,
            )

        return ParsedIntent(type=best, confidence=confidence)
```

### 8.2 Prompt Router

```python
# app/architecture/services/prompt_router.py

ROUTE_MAP = {
    "compose_domain":    "ai_handler",
    "connect_domains":   "ai_handler",
    "link_workflow":     "link_handler",       # No AI call
    "link_template":     "link_handler",       # No AI call
    "visualize":         "visualize_handler",  # No AI call
    "compile":           "compile_prompt",     # No AI call
    "redirect_to_workflow": "redirect",        # No AI call
}
```

---

## 9. FREE PROVIDER STRATEGY

### 9.1 Provider Assignment Per Mode

| Mode | Primary | Fallback 1 | Fallback 2 | Mock |
|------|---------|------------|------------|------|
| **Mode A** | Gemini 1.5 Flash | Groq Llama 3.1 70B | Groq Llama 3.1 8B | Deterministic workflow template |
| **Mode B** | Gemini 1.5 Flash | Groq Llama 3.1 8B | Ollama (local dev) | Deterministic domain add |
| **Mode C** | Groq Llama 3.1 8B | Gemini 1.5 Flash | Ollama (local dev) | Single field change |

Mode A gets the strongest model — a broken workflow definition causes runtime failures. Mode C gets the fastest model — template modification is the most constrained task.

### 9.2 Rate Limits

```
GEMINI 1.5 FLASH (free tier):   15 RPM · 1M TPM · 1,500 RPD · $0
GROQ LLAMA 3.1 70B (free tier): 30 RPM · 14,400 RPD · $0
GROQ LLAMA 3.1 8B (free tier):  30 RPM · 14,400 RPD · $0
```

### 9.3 Cache TTL Strategy

| Mode | TTL | Reasoning |
|------|-----|-----------|
| Mode A blueprint | 3,600s (1h) | Blueprints vary enough to refresh hourly |
| Mode B ERP compose | 86,400s (24h) | Domain structures are stable |
| Mode B visualization | 0 (no cache) | Deterministic transform — instant, no cache needed |
| Mode C template | 7,200s (2h) | Template mods are somewhat repetitive |
| Demo warm cache | 604,800s (7 days) | Locked for demo stability |

**Target: 80% cache hit rate → real calls reduced by 5× → effectively $0/month**

### 9.4 Degraded Mode UX

When all providers are rate-limited:

```
Frontend shows:
  - Amber badge: "demo mode" on all AI-returned content
  - Toast: "Using cached demo response — live AI temporarily unavailable"
  - System continues working — mock responses are coherent
  - _degraded: true in response allows frontend to show indicator
```

### 9.5 Demo Cache Warming Script

```python
# tooling/seed/warm_ai_cache.py

DEMO_PROMPTS = [
    # Mode A (4 most-used)
    ("workflow_blueprint", "Auto-accept above 90%, review 75-90%, auto-reject below 75%"),
    ("workflow_blueprint", "Multi-stage committee review with department and dean approval"),
    ("workflow_blueprint", "Rolling admissions with continuous intake and immediate decision"),
    ("workflow_blueprint", "Scholarship review with eligibility check and scoring"),

    # Mode B (6 most-used)
    ("erp_architect", "Create ERP for a university with admissions and finance"),
    ("erp_architect", "Add a scholarship domain"),
    ("erp_architect", "Add HR department"),
    ("erp_architect", "Connect admissions to finance when application is accepted"),
    ("erp_architect", "Connect finance to scholarship when payment confirmed"),
    ("erp_architect", "Add student records module to admissions"),

    # Mode C (3 most-used)
    ("template_customizer", "Change auto-accept threshold from 90% to 85%"),
    ("template_customizer", "Add a waitlist state between review and rejection"),
    ("template_customizer", "Add financial aid check after dean approval"),
]
```

---

## 10. DATA FLOW DIAGRAMS

### 10.1 Full Three-Surface Flow

```
WORKFLOW PAGE (/console/workflows)
│
├── [+ New Workflow] → slide-in panel → [Generate with AI]
│       ↓
│   POST /api/ai/generate
│   provider_router → Gemini/Groq → function call → blueprint
│   4-stage validation pipeline
│   Blueprint Preview (5 tabs) — human reviews
│       ↓
│   [Deploy Workflow] → POST /api/ai/blueprints/:id/deploy
│   control_plane/workflows/service.py (re-validates)
│   event_engine.emit("workflow.deployed")
│                              ↓ WebSocket
│
ARCHITECT PAGE (/console/architect/:id)
│
├── Receives: workflow.deployed
│   Toast: "Link to domain?" → POST /api/architect/:id/link-workflow
│   graph.domains.workflow_id set → visualization regenerated
│   Domain card: unlinked → LIVE → live metrics populate
│
├── User: "Add scholarship domain"
│   POST /api/architect/:id/prompt
│   nlp_intent_parser → compose_domain (AI needed)
│   cache check → miss → Gemini → operation
│   apply_operation → new_graph → compute_diff → version created
│   visualization_generator.generate() → updated config
│   ERP preview: new domain card appears (unlinked)
│       ↓
│   Response: { graph, diff, version, visualization_config, from_cache }
│
TEMPLATES PAGE (/console/templates)
│
├── Select template → [Customize with AI]
│   "Change threshold to 85%" → POST /api/templates/:id/customize
│   template_customizer → Groq → operation → diff
│   Mode A validators → validation result
│   Diff shown + validation shown
│       ↓
│   [Deploy Customized] → POST /api/templates/:id/deploy { customization_id }
│   Workflow created (source: "template")
│   event_engine.emit("template.deployed")
│                              ↓ WebSocket
│   Architect page: "Template deployed. Link to domain?"
```

### 10.2 Mode B Prompt — Step by Step

```
POST /api/architect/:id/prompt { prompt }
       ↓ middleware/auth_middleware → validate JWT
       ↓ middleware/tenant → enforce institution_id
       ↓ architecture/routes/architect.py
       ↓ architecture/services/prompt_router → classify intent
       ↓
  Intent: compose_domain → ai_handler
       ↓
  Redis cache check
  ├─ HIT  → skip AI (instant, $0)
  └─ MISS → ai/architect/provider_router
             ├─ Gemini 1.5 Flash → success → cache 24h
             ├─ rate limited → Groq Llama 8B → success → cache
             └─ all limited → mock response (_degraded: true)
       ↓
  architecture/diff/graph_diff.apply_operation() — pure function
  architecture/diff/graph_diff.compute_diff() — pure function
  architecture/versioning/version_manager.create_version()
  DB: UPDATE institution_architectures
       ↓
  ai/architect/visualization_generator.generate() — deterministic, instant
  DB: UPDATE institution_architectures.visualization_config
       ↓
  HTTP 200: { graph, diff, version, rationale, visualization_config,
              from_cache, is_mock, intent_classified_as }
```

---

## 11. API CONTRACT

### 11.1 All Endpoints By Surface

**Workflow Page — Mode A**
```
POST  /api/ai/generate
GET   /api/ai/blueprints/:id
POST  /api/ai/blueprints/:id/deploy
GET   /api/ai/history
```

**Architect Page — Mode B**
```
POST  /api/architect
GET   /api/architect
GET   /api/architect/:id
POST  /api/architect/:id/prompt
GET   /api/architect/:id/available-workflows
POST  /api/architect/:id/link-workflow
GET   /api/architect/:id/visualization
GET   /api/architect/:id/versions
GET   /api/architect/:id/versions/:v
POST  /api/architect/:id/compile
GET   /api/architect/:id/surfaces
```

**Templates Page — Mode C**
```
GET   /api/templates
GET   /api/templates/:id
POST  /api/templates/:id/customize
POST  /api/templates/:id/deploy
GET   /api/templates/:id/customizations
```

### 11.2 Key Response Shapes

**POST /api/architect/:id/prompt (success):**
```json
{
  "type": "success",
  "graph": { "erp_system": { "name": "...", "domains": [...], "integrations": [...] } },
  "diff": { "added_domains": [...], "removed_domains": [], "summary": "+1 domain added" },
  "version": 4,
  "rationale": "Added Scholarship domain for financial aid applications",
  "visualization_config": { "system_name": "...", "sections": [...], "integrations": [...], "layout_mode": "four_grid" },
  "intent_classified_as": "compose_domain",
  "_from_cache": false,
  "_provider": "gemini-1.5-flash",
  "_is_mock": false
}
```

**POST /api/architect/:id/prompt (redirect):**
```json
{
  "type": "redirect",
  "message": "Workflow creation happens on the Workflows page.",
  "suggested_action": "open_workflow_creator",
  "pre_fill_prompt": "Create a workflow that auto-rejects below 60%"
}
```

---

## 12. FRONTEND COMPONENT SPECIFICATION

### 12.1 Architect Page — Full Component Tree

```
/console/architect/[id]/page.tsx
│
├── ArchitectToolbar
│   ├── SystemName + VersionBadge
│   ├── ViewToggle (ERP Preview | Domain Graph | Integration Map)
│   ├── CompileButton → CompileModal
│   └── VersionSelector
│
├── LeftPanel (40%)
│   ├── DomainGraphPanel
│   │   ├── DomainNode (per domain, shows status dot)
│   │   └── IntegrationEdge
│   ├── AvailableWorkflowsPanel (unlinked workflows)
│   │   └── WorkflowLinkItem
│   └── VersionHistoryPanel
│       └── VersionRow (prompt + diff summary)
│
├── RightPanel (60%)
│   ├── ERPPreviewPanel           ← PRIMARY VISUALIZATION
│   │   ├── DomainCard (per domain)
│   │   │   ├── DomainCardHeader (label + status badge)
│   │   │   ├── MetricStat (primary: "634 Applications ↑10.5%")
│   │   │   ├── MiniChart (recharts, compact)
│   │   │   ├── ModuleStats
│   │   │   └── WorkflowLinkButton (if unlinked)
│   │   └── IntegrationFlow (SVG connection arrows)
│   │
│   ├── WorkflowDetailPanel (when domain expanded)
│   │   ├── StateMachineDiagram
│   │   └── ApplicationListMini
│   │
│   └── IntegrationMapPanel (when map view selected)
│       └── ForceDirectedGraph (d3-force)
│
└── PromptBar (fixed bottom)
    ├── IntentBadge ("Composing domain" / "Linking" / "—")
    ├── PromptInput
    └── ApplyButton
```

### 12.2 Templates Page — Component Tree After Mode C

```
/console/templates/page.tsx
│
├── CategoryFilter
├── TemplateListPanel (left)
│   └── TemplateListItem
│
└── TemplateDetailPanel (right)
    ├── TemplateDetailHeader
    ├── TemplateTabs ([Overview] [Workflow Graph] [JSON] [Roles])
    ├── TemplateCustomizePanel  ← NEW
    │   ├── CustomizationInput (prompt + Apply)
    │   └── CustomizationResult
    │       ├── DiffViewer (before/after conditions)
    │       └── ValidationBadge (4-stage result)
    └── TemplateActionBar
        ├── ResetButton
        ├── DeployOriginalButton
        └── DeployCustomizedButton (disabled if validation has errors)
```

### 12.3 Architect Store — Required State Shape

```typescript
// src/lib/stores/architect-store.ts

interface ArchitectStore {
  // Existing
  architectures: Architecture[];
  activeArchitecture: Architecture | null;
  graph: ERPGraph | null;           // NOT persisted — always fetched fresh
  versions: ArchitectureVersion[];
  isLoading: boolean;
  isApplyingPrompt: boolean;
  lastDiff: ArchitectureDiff | null;
  fromCache: boolean;
  isMock: boolean;
  intentClassifiedAs: string | null;

  // NEW: Visualization
  visualizationConfig: ERPVisualizationConfig | null;  // NOT persisted
  sectionMetrics: Record<string, DomainMetrics>;  // domain_id → live data
  activeView: "erp_preview" | "domain_graph" | "integration_map";

  // NEW: Workflow linking
  availableWorkflows: WorkflowSummary[];  // NOT persisted
  linkingDomainId: string | null;

  // Actions
  fetchArchitecture: (id: string) => Promise<void>;
  applyPrompt: (id: string, prompt: string) => Promise<PromptResult>;
  compile: (id: string) => Promise<{ apiKey: string; versionTag: string }>;
  setActiveView: (view: string) => void;
  fetchAvailableWorkflows: (projectId: string) => Promise<void>;
  linkWorkflow: (archId: string, domainId: string, workflowId: string) => Promise<void>;
  updateSectionMetrics: (domainId: string, metrics: DomainMetrics) => void;
}
```

---

## 13. BACKEND FILE MANIFEST

### 13.1 Current Repo — What Needs to Move

```
CURRENT LOCATION                           MOVE TO
──────────────────────────────────────────────────────────────────────
app/ai/validators/__init__.py          →   app/ai/blueprint/validators/__init__.py
app/ai/validators/compliance_checker.py → app/ai/blueprint/validators/compliance_checker.py
app/ai/validators/graph_analyzer.py    →   app/ai/blueprint/validators/graph_analyzer.py
app/ai/validators/permission_analyzer.py → app/ai/blueprint/validators/permission_analyzer.py
app/ai/validators/schema_validator.py  →   app/ai/blueprint/validators/schema_validator.py
app/ai/blueprint_generator.py          →   app/ai/blueprint/blueprint_generator.py
app/ai/provider_router.py              →   app/ai/architect/provider_router.py
app/tenant.py                          →   app/middleware/tenant.py
```

### 13.2 Files to Create

**Priority 1 — Domain boundaries (stubs only, create first):**
```
app/ai/blueprint/__init__.py
app/ai/blueprint/router.py
app/ai/architect/__init__.py
app/ai/template_customizer/__init__.py
app/ai/template_customizer/customizer.py
app/ai/template_customizer/diff_explainer.py
app/ai/template_customizer/router.py
app/architecture/__init__.py
app/architecture/models/__init__.py
app/architecture/models/institution_architecture.py
app/architecture/models/architecture_version.py
app/architecture/services/__init__.py
app/architecture/services/architecture_service.py
app/architecture/services/connection_registry.py
app/architecture/services/prompt_router.py
app/architecture/compiler/__init__.py
app/architecture/compiler/compiler.py
app/architecture/versioning/__init__.py
app/architecture/versioning/version_manager.py
app/architecture/diff/__init__.py
app/architecture/diff/graph_diff.py
app/architecture/orchestrator/__init__.py
app/architecture/orchestrator/compile_pipeline.py
app/architecture/routes/__init__.py
app/architecture/routes/architect.py
```

**Priority 2 — AI architect mode:**
```
app/ai/architect/prompt_factory.py
app/ai/architect/erp_schema.py
app/ai/architect/visualization_generator.py
app/ai/architect/nlp_intent_parser.py
app/ai/architect/workflow_connector.py
app/ai/architect/backoff.py
app/ai/architect/quota_tracker.py
```

**Priority 3 — Middleware and migrations:**
```
app/middleware/tenant.py                    (MOVED)
app/middleware/version_router.py
app/middleware/auth_middleware.py
alembic/versions/20260302_0002_add_ial_tables.py
```

**Priority 4 — Tests:**
```
tests/unit/test_graph_diff.py
tests/unit/test_nlp_intent_parser.py
tests/unit/test_visualization_generator.py
tests/unit/test_template_customizer.py
tests/integration/test_architect_routes.py
tests/integration/test_compile_pipeline.py
```

**Priority 5 — Frontend:**
```
src/lib/stores/architect-store.ts
src/lib/hooks/useArchitect.ts
src/lib/hooks/useERPVisualizationData.ts
src/lib/hooks/useVersionHistory.ts
src/app/api/architect/route.ts
src/app/api/architect/[id]/route.ts
src/app/api/architect/[id]/prompt/route.ts
src/app/api/architect/[id]/link-workflow/route.ts
src/app/api/architect/[id]/versions/route.ts
src/app/api/architect/[id]/compile/route.ts
src/app/api/architect/[id]/surfaces/route.ts
src/app/api/templates/[id]/customize/route.ts
src/app/console/architect/[id]/page.tsx
src/components/console/architect/ERPPreviewPanel.tsx
src/components/console/architect/DomainCard.tsx
src/components/console/architect/MetricStat.tsx
src/components/console/architect/MiniChart.tsx
src/components/console/architect/IntegrationFlow.tsx
src/components/console/architect/PromptBar.tsx
src/components/console/architect/WorkflowLinkModal.tsx
src/components/console/architect/VersionHistoryPanel.tsx
src/components/console/architect/CompileModal.tsx
src/components/console/templates/TemplateCustomizePanel.tsx
src/components/console/templates/DiffViewer.tsx
src/components/console/workflows/WorkflowGenerationPanel.tsx
src/components/console/workflows/BlueprintPreview.tsx
src/components/console/workflows/ValidationReport.tsx
```

### 13.3 Files That Must NOT Be Touched

```
app/core/workflow_engine.py   ← Runtime kernel — frozen
app/core/event_engine.py      ← Runtime kernel — frozen
app/core/rbac_engine.py       ← Runtime kernel — frozen
app/core/schema_engine.py     ← Runtime kernel — frozen
app/core/condition_parser.py  ← Runtime kernel — frozen
app/auth/                     ← Authentication — frozen
app/database.py               ← DB connection — frozen
```

---

## 14. INVARIANT CHECKLIST

All AI behavior evaluated against these invariants before any feature is considered complete.

| # | Invariant | Mode A | Mode B | Mode C |
|---|-----------|--------|--------|--------|
| 1 | Deployed workflows are immutable | ✅ Creates new only | ✅ Never touches deployed | ✅ Creates new version |
| 2 | Every state transition emits an event | ✅ Runtime unchanged | ✅ Pre-runtime layer | ✅ Runtime unchanged |
| 3 | AI output passes 4-stage validation before deploy | ✅ Always runs | ✅ N/A (graph, not workflow) | ✅ Runs Mode A validators |
| 4 | Multi-tenant isolation | ✅ project_id scoped | ✅ institution_id + arch_id | ✅ project_id scoped |
| 5 | No dynamic code execution | ✅ Function calling, T=0.3 | ✅ Function calling, T=0.2 | ✅ Function calling, T=0.25 |
| 6 | Version always visible | ✅ Workflow v1, v2... | ✅ erp_v2 in toolbar | ✅ Template version + diff ID |
| 7 | No auto-deploy | ✅ User clicks Deploy | ✅ User clicks Compile | ✅ User clicks Deploy Customized |
| 8 | Backend authoritative | ✅ Re-validates on deploy | ✅ Compiler re-resolves | ✅ Re-validates on deploy |
| 9 | Runtime never imports Architecture | ✅ | ✅ | ✅ |
| 10 | Compilation is only Architecture→Runtime boundary | N/A | ✅ Only compile_pipeline | N/A |

**Mode C additional invariants:**
```
11. Template source files in packages/templates/*.json are never modified.
    Customization creates an in-memory modified_definition only.
    [Reset to Original] always recovers the source.

12. customization_id is single-use.
    Once deployed, cannot be re-applied. The deployed definition is the permanent record.

13. If customization validation has errors (not just warnings),
    [Deploy Customized] is disabled. Warnings are shown but do not block.

14. Architect page NEVER creates workflows.
    redirect_to_workflow intent always returns a redirect response.
    The page offers to open the Workflow Creator with the prompt pre-filled.
```

**Mode B additional invariants:**
```
15. visualization_generator.generate() runs after EVERY graph change.
    visualization_config is never stale — updates atomically with the graph.

16. When all providers are rate-limited, mock response returned with _degraded: true.
    Frontend shows amber "demo mode" badge. System continues working.

17. NLP intent classification runs before every AI call.
    link_workflow, link_template, visualize, compile, redirect prompts
    never consume API quota.
```

---

*This document is the single source of truth for all AI in Orquestra.*  
*Mode A governs workflow generation on the Workflow page.*  
*Mode B governs ERP composition and live visualization on the Architect page.*  
*Mode C governs template customization on the Templates page.*  
*No mode creates workflows from the Architect page.*  
*No mode deploys autonomously.*  
*No mode touches the runtime kernel.*
