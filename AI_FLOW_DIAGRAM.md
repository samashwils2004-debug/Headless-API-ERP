# Orquestra ERP — AI Flow Diagram Reference

> Focused entirely on every AI-involved path in the system: where AI is triggered, what data feeds into each prompt, how results are validated and cached, and how raw model output becomes stored structured data. Three modes (A/B/C) plus shared routing infrastructure. Use this to generate an AI flow diagram in any diagramming tool.

---

## Part 1 — AI Entry Points

There are exactly **5 user actions** that trigger an AI call:

| # | Action | UI Location | Mode | FastAPI Endpoint |
|---|--------|-------------|------|-----------------|
| 1 | "Generate Blueprint" | `/console/workflows` | A | `POST /api/ai/blueprints/generate` |
| 2 | Submit NL domain prompt | `/console/architect` | B | `POST /api/architect/{id}/prompt` |
| 3 | "Generate UI Mockup" | `/console/architect` | B | `POST /api/architect/{id}/visualization` |
| 4 | "Customize Template" | `/console/templates` | C | `POST /api/templates/{id}/customize` |
| 5 | *(indirect)* Deploy blueprint | `/console/workflows` | A | `POST /api/ai/blueprints/{id}/deploy` — re-validates, no new AI call |

---

## Part 2 — Shared AI Infrastructure

Every AI call in all three modes passes through the same provider router.

```
ANY AI REQUEST
    │
    │  input_payload = { system_prompt, user_prompt }
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Provider Router  (apps/api/app/ai/provider_router.py)       │
│                                                                  │
│  Step 1: Build cache key                                         │
│    cache_key = "orquestra:ai:cache:" + SHA256(user_prompt)      │
│                                                                  │
│  Step 2: Redis cache check                                       │
│    GET cache_key ──────────────────► Redis (Upstash)            │
│    ◄── HIT: cached JSON ────────────  TTL 86400s (24h)          │
│    ◄── MISS: nil                                                 │
│                                                                  │
│  [CACHE HIT]  ───────────────────────────────► return cached    │
│  [CACHE MISS] →                                                  │
│                                                                  │
│  Step 3: Try primary provider                                    │
│    POST https://api.anthropic.com/v1/messages                   │
│    model: claude-sonnet-4-5                                      │
│    max_tokens: 8192                                              │
│    body: { system: system_prompt, messages: [{role:user,        │
│             content: user_prompt}] }                             │
│                                                                  │
│  [CLAUDE SUCCESS] →                                              │
│    raw_result = response.content[0].text                         │
│    SET cache_key = raw_result, EX 86400 ──► Redis               │
│    return raw_result, provider="anthropic", is_mock=false        │
│                                                                  │
│  [CLAUDE FAIL: timeout / 5xx / rate-limit] →                    │
│    Step 4: Mock fallback                                         │
│    raw_result = _generate_mock(mode)  ← deterministic template  │
│    NOT cached                                                    │
│    return raw_result, provider="mock", is_mock=true              │
└─────────────────────────────────────────────────────────────────┘
    │
    │  raw_result (JSON string)
    ▼
Mode-specific post-processing (Parts 3 / 4 / 5)
```

**Mock fallbacks by mode:**
- Mode A: 4-state workflow (`submitted → under_review → approved/rejected`) with placeholder schema
- Mode B architect prompt: `[{ operation: "add_domain", domain: { id: "domain_1", label: "Module 1" } }]`
- Mode B design: 1-module DesignSpec with generic fields
- Mode C: Returns the original definition unmodified with `change_summary: "Mock customization"`

---

## Part 3 — Mode A: Blueprint Generation

### 3.1 Full Flow

```
User types NL prompt: "Create a graduate admissions workflow with document verification"
    │
    ▼
P1: Context Enricher  (apps/api/app/ai/blueprint/context_builder.py)
    │
    │  SELECT name, definition FROM workflows
    │  WHERE deployed=true AND institution_id=? AND project_id=?
    │  ────────────────────────────────────────► DS: workflows table
    │  ◄──── [{ name, states, schema_fields, roles }] ─────────────
    │
    │  Builds prefix:
    │  "PROJECT CONTEXT — existing workflows: admissions_v1
    │   (states: submitted,under_review,approved,rejected;
    │    fields: score:number, name:string, email:string)
    │   Reuse these field names and state conventions."
    │
    │  enriched_prompt = PROJECT_CONTEXT_PREFIX + "\n---\n" + user_prompt
    ▼
AI Provider Router (Part 2)
    │  system_prompt = ERP_BLUEPRINT_SYSTEM_PROMPT (see 3.2)
    │  user_prompt   = enriched_prompt
    ▼
raw_blueprint_json (string) → JSON.parse()
    │
    │  {
    │    "workflow": {
    │      "name": "graduate_admissions",
    │      "initial_state": "submitted",
    │      "states": {
    │        "submitted":    { type:"initial",       transitions:[{ to:"document_review", condition:null }] },
    │        "document_review":{ type:"intermediate", transitions:[{ to:"under_review", condition:"docs_complete == true" }] },
    │        "under_review": { type:"intermediate",  transitions:[{ to:"approved", condition:"score >= 70" },
    │                                                             { to:"rejected", condition:"score < 70"  }] },
    │        "approved":     { type:"terminal",      transitions:[] },
    │        "rejected":     { type:"terminal",      transitions:[] }
    │      },
    │      "schema": { "fields": [
    │        { "name":"score",     "type":"number", "required":true,  "min":0,   "max":100 },
    │        { "name":"name",      "type":"string", "required":true                        },
    │        { "name":"docs_complete","type":"boolean","required":true                     }
    │      ]}
    │    },
    │    "roles":           [{ "name":"admissions_officer", "permissions":["application:review","application:approve"] }],
    │    "events":          [{ "type":"application.submitted", "version":"1.0" }],
    │    "compliance_tags": ["ferpa"]
    │  }
    ▼
4-Stage Validation Pipeline  (apps/api/app/ai/blueprint_generator.py)
    │  (see 3.3)
    ▼
INSERT blueprint_proposals (status, blueprint, validation_result, provider_used, is_mock)
    │
    │  Response to UI:
    │  { proposal_id, status:"validated"|"invalid",
    │    blueprint, validation_result, provider_used, is_mock }
    ▼
[User clicks Deploy]
    │
    │  Re-run 4-stage validation (guard)
    │  SELECT MAX(version) WHERE name=? → version N+1
    │  INSERT workflows (name, version, definition, deployed=true, is_ai_generated=true)
    │  UPDATE blueprint_proposals SET status="deployed"
    │  → emit event: "ai.blueprint.deployed"
```

### 3.2 Mode A System Prompt Structure

```
ROLE:
  You are an expert ERP workflow architect. Generate a valid JSON workflow blueprint.

OUTPUT FORMAT (strict JSON, no markdown fences):
  { workflow, roles, events, compliance_tags }

WORKFLOW RULES:
  - ≥ 2 states; exactly 1 initial, ≥ 1 terminal
  - All transitions reference valid state names
  - All states reachable from initial_state
  - Conditions use flat field comparisons: "field operator value"
    (operators: ==, !=, >, <, >=, <=)
  - No eval(), no nested expressions

SCHEMA RULES:
  - Field types: string | number | boolean | date | enum
  - Enum fields must include "enum" array
  - Required fields must be present in every application

ROLES RULES:
  - Each role ≥ 1 permission in "resource:action" format
  - Valid resources: application, workflow, report

COMPLIANCE:
  - compliance_tags must be non-empty
  - Valid values: ferpa, gdpr, dpdp, hipaa

REUSE INSTRUCTION (injected from context enricher):
  Reuse existing field names and state naming conventions from the project context.
```

### 3.3 4-Stage Validation Pipeline

```
raw_blueprint
    │
    ▼ Stage 1: Schema Checker  (validators/schema_validator.py)
    │   Checks: required top-level keys exist, workflow.states is object,
    │           workflow.schema.fields is array, roles is array ≥ 1
    │   Output: { valid: bool, errors: [str] }
    │   [FAIL] → status="invalid", skip stages 2-4
    │
    ▼ Stage 2: Graph Analyzer  (validators/graph_analyzer.py)
    │   Checks: initial_state key exists in states dict,
    │           every transition.to is a valid state key,
    │           ≥ 1 terminal state,
    │           BFS from initial_state reaches all states
    │   Output: { valid: bool, errors: [str] }
    │   [FAIL] → status="invalid", skip stages 3-4
    │
    ▼ Stage 3: Permission Analyzer  (validators/permission_analyzer.py)
    │   Checks: each role has name string + permissions array ≥ 1,
    │           each permission matches regex "^\w+:\w+$"
    │   Output: { valid: bool, errors: [str] }
    │   [FAIL] → status="invalid", skip stage 4
    │
    ▼ Stage 4: Compliance Checker  (validators/compliance_checker.py)
    │   Checks: compliance_tags array non-empty,
    │           each tag in { ferpa, gdpr, dpdp, hipaa }
    │   Output: { valid: bool, errors: [str] }
    │
    ▼
validation_result = {
    stage_1: { valid, errors },
    stage_2: { valid, errors },
    stage_3: { valid, errors },
    stage_4: { valid, errors },
    is_valid: stage1 AND stage2 AND stage3 AND stage4
}
```

---

## Part 4 — Mode B: ERP Architecture Composition

Mode B has **two separate AI calls** with different purposes.

### 4.1 AI Call B-1: Domain Graph Operations (NL → Graph)

```
User submits NL prompt: "Add admissions, fee management, and student records modules"
    │
    ▼
NLP Intent Parser  (apps/api/app/ai/architect/nlp_intent_parser.py)
    │  Tokenizes and extracts domain phrases from plain text
    │  → [{ operation:"add_domain", domain:{ id:"admissions",    label:"Admissions"    } },
    │      { operation:"add_domain", domain:{ id:"fee_management", label:"Fee Management"} },
    │      { operation:"add_domain", domain:{ id:"student_records",label:"Student Records"} }]
    ▼
Prompt Factory  (apps/api/app/ai/architect/prompt_factory.py)
    │
    │  Load current graph from DB:
    │  SELECT graph_json FROM institution_architecture WHERE id=?
    │  → { erp_system: { domains: [...existing...], integrations: [...] } }
    │
    │  Builds structured prompt:
    │  system: ARCHITECT_SYSTEM_PROMPT (see 4.3)
    │  user:   {
    │    "current_graph": { erp_system: { domains: [...], integrations: [...] } },
    │    "operations_requested": [
    │      { operation: "add_domain", domain: { id:"admissions", label:"Admissions" } },
    │      ...
    │    ]
    │  }
    ▼
AI Provider Router (Part 2)
    ▼
raw_operations_json → JSON.parse()
    │
    │  Claude confirms / refines / expands operations:
    │  [
    │    { "operation": "add_domain",
    │      "domain": { "id":"admissions",    "label":"Admissions",    "color":"#3b82f6" } },
    │    { "operation": "add_domain",
    │      "domain": { "id":"fee_management", "label":"Fee Management","color":"#8b5cf6" } },
    │    { "operation": "add_domain",
    │      "domain": { "id":"student_records","label":"Student Records","color":"#10b981" } },
    │    { "operation": "add_integration",
    │      "integration": { "from_domain":"admissions","to_domain":"fee_management","type":"data" } }
    │  ]
    ▼
Graph Operator  (apps/api/app/routes/architect.py → _apply_operation)
    │  Pure function — no DB reads inside loop
    │  graph = current_graph_json  (read ONCE before loop)
    │
    │  for each operation:
    │    "add_domain"      → graph.erp_system.domains.append(domain)
    │    "remove_domain"   → filter out domain by id
    │    "add_integration" → graph.erp_system.integrations.append(integration)
    │    "link_workflow"   → find domain by id, set workflow_id + workflow_name
    │
    │  UPDATE institution_architecture SET graph_json=?  (single DB write)
    ▼
Visualization Generator  (apps/api/app/ai/architect/visualization_generator.py)
    │  Deterministic — no AI call
    │  Assigns (x, y) positions, computes edges from integrations
    │  UPDATE institution_architecture SET visualization_config=?
    ▼
Response: { graph_json, visualization_config, applied_operations, diff_summary }
```

### 4.2 AI Call B-2: UI Mockup / DesignSpec Generation

```
User clicks "Generate UI Mockup"
    │
    ▼
Design Generator  (apps/api/app/routes/architect.py → generate_design)
    │
    │  Read ALL domains from graph_json (no truncation)
    │  For each domain that has workflow_id:
    │    SELECT definition FROM workflows WHERE id=?
    │    compact_fields = [{ name, type }]  ← schema fields only
    │    compact_states = list(states.keys())
    │
    │  Build domain_context (ALL domains, linked or not):
    │  [
    │    { id:"admissions", label:"Admissions", color:"#3b82f6",
    │      workflow:{ name:"admissions_wf", states:["submitted","approved"], fields:[{name:"score",type:"number"}] } },
    │    { id:"student_records", label:"Student Records", color:"#10b981" }  ← no workflow, infer
    │  ]
    │
    │  user_prompt:
    │  "Design a UI mockup for: MCC Undergraduate ERP
    │   There are 3 domains total — you MUST generate one module for each.
    │   Domain data: [compact JSON, no truncation]"
    ▼
AI Provider Router (Part 2)
    │  system_prompt = DESIGN_SYSTEM_PROMPT (see 4.3)
    ▼
raw_design_spec → JSON.parse()
    │
    │  DesignSpec shape:
    │  {
    │    "modules": [
    │      {
    │        "id":           "admissions",
    │        "label":        "Admissions",
    │        "color":        "#3b82f6",
    │        "nav_position": 1,
    │        "stats": [{ "label":"Total Applications","value":"1,240","trend":"up" }],
    │        "fields": [{ "label":"Score","type":"number","key":"score" }],
    │        "actions": [{ "label":"Approve","variant":"primary","transition":"approved" }],
    │        "table_columns": [{ "header":"Applicant","key":"name" },
    │                          { "header":"Score",    "key":"score" }]
    │      },
    │      ... one entry per domain ...
    │    ],
    │    "relationships": [{ "from":"admissions","to":"fee_management","label":"triggers payment" }],
    │    "nav_groups":    [{ "label":"Academic","modules":["admissions","student_records"] }]
    │  }
    │
    │  UPDATE institution_architecture
    │    SET visualization_config.design_spec = DesignSpec
    ▼
Response: { design_spec }
```

### 4.3 Mode B System Prompt Structures

**Architect System Prompt:**
```
ROLE: You are an ERP domain architect.

VALID OPERATIONS:
  add_domain      → { id (snake_case), label, color (hex) }
  remove_domain   → { id }
  add_integration → { from_domain, to_domain, type: "data"|"trigger"|"sync", label? }
  link_workflow   → { domain_id, workflow_id, workflow_name }

OUTPUT: JSON array of operation objects only. No explanation.

RULES:
  - Only add domains not already in current_graph.erp_system.domains
  - domain id must be snake_case
  - Assign distinct colors using the ERP color palette
  - Suggest data integrations between related domains where obvious
```

**Design System Prompt:**
```
ROLE: You are a UI/UX designer for enterprise ERP dashboards.

OUTPUT: JSON object matching DesignSpec schema. No markdown.

CRITICAL RULES:
  - Generate exactly ONE module for EVERY domain in the domains array — no exceptions
  - nav_position is 1-based; every module gets a unique nav_position 1..N
  - For domains WITH a linked workflow: use workflow.fields for fields[], workflow.states for actions[], badge_values
  - For domains WITHOUT a linked workflow: infer sensible fields/actions from the domain label
  - stats array: 2–4 KPI cards per module
  - table_columns: 3–5 columns, always include a name/id column
```

---

## Part 5 — Mode C: Template Customization

```
User selects template + types instruction:
"Add a GRE score field and insert a department approval step before final decision"
    │
    ▼
Template Customizer  (apps/api/app/ai/template_customizer/customizer.py)
    │
    │  SELECT definition FROM workflow_templates WHERE id=?
    │  original_definition = { states, schema, roles }
    │
    │  system_prompt = TEMPLATE_CUSTOMIZER_SYSTEM_PROMPT (see below)
    │  user_prompt   = {
    │    "original_definition": { ...full definition... },
    │    "instruction": "Add a GRE score field and insert a department approval step..."
    │  }
    ▼
AI Provider Router (Part 2)
    ▼
raw_result → JSON.parse()
    │
    │  {
    │    "modified_definition": {
    │      "states": {
    │        ...all original states...,
    │        "department_review": {
    │          "type": "intermediate",
    │          "transitions": [{ "to":"approved","condition":null },
    │                          { "to":"rejected","condition":null }]
    │        }
    │      },
    │      "schema": {
    │        "fields": [
    │          ...original fields...,
    │          { "name":"gre_score","type":"number","required":true,"min":260,"max":340 }
    │        ]
    │      },
    │      "roles": [ ...original roles... ]
    │    },
    │    "change_summary": "Added GRE score field (260–340 range). Inserted department_review state before approved/rejected with null-condition transitions.",
    │    "diff_json": {
    │      "added_states":  ["department_review"],
    │      "added_fields":  ["gre_score"],
    │      "removed_states":[],
    │      "removed_fields":[]
    │    }
    │  }
    ▼
4-Stage Validation Pipeline (same as Mode A, Part 3.3)
    │  Input: modified_definition
    │  → validation_result
    ▼
INSERT template_customizations
    │  { template_id, instruction, modified_definition,
    │    diff_json, validation_result, change_summary, provider_used }
    ▼
Response: { customization_id, modified_definition, validation_result, change_summary, diff_json }
    │
    ▼  [User deploys]
    INSERT workflows (definition=modified_definition, is_ai_generated=false, deployed=true)
```

**Template Customizer System Prompt:**
```
ROLE: You are an ERP workflow customization assistant.

INPUT:  { original_definition, instruction }
OUTPUT: { modified_definition, change_summary, diff_json }

RULES:
  - Preserve all original states/fields not explicitly changed
  - Modified definition must be a valid WorkflowDefinition (same schema as Mode A)
  - change_summary: 1–3 sentences, plain English
  - diff_json: { added_states[], removed_states[], added_fields[], removed_fields[] }
  - Do NOT change role names or permissions unless instruction explicitly requests it
  - State machine must remain valid after modification (no orphan states)
```

---

## Part 6 — AI Flow Decision Tree

```
User Action
    │
    ├─── "Generate Blueprint" ──────────────────────────────────► MODE A
    │     1. Context enricher reads deployed workflows
    │     2. Provider router (cache → Claude → mock)
    │     3. 4-stage validation
    │     4. Store proposal
    │     [Deploy] → create workflow record
    │
    ├─── NL prompt in Architect ────────────────────────────────► MODE B (B-1)
    │     1. NLP intent parser
    │     2. Prompt factory loads current graph
    │     3. Provider router (cache → Claude → mock)
    │     4. Graph operator applies operations (single DB write)
    │     5. Deterministic visualization generation
    │
    ├─── "Generate UI Mockup" ──────────────────────────────────► MODE B (B-2)
    │     1. Load all domains + compact workflow schemas
    │     2. Provider router (cache → Claude → mock)
    │     3. Validate module count == domain count
    │     4. Store DesignSpec in visualization_config
    │
    └─── "Customize Template" ──────────────────────────────────► MODE C
          1. Load template definition
          2. Provider router (cache → Claude → mock)
          3. 4-stage validation on modified_definition
          4. Store customization record
          [Deploy] → create workflow record
```

---

## Part 7 — Shared AI Concerns

### Caching Scope

All three modes share the same Redis cache. The cache key is SHA256 of the user-facing prompt only (not the system prompt), so:
- Identical user prompts across different institutions share a cache hit
- Same prompt with different project context (different enriched prefix) produces different key → separate cache entry

### Provider Tracking

Every stored AI result records `provider_used` ("anthropic" or "mock") and `is_mock` (boolean). UI shows a "Mock" badge when `is_mock=true`.

### Token Budget

All Claude calls use `max_tokens: 8192`. Prompt sizes:
- Mode A: ~500–1500 tokens (enriched prompt scales with deployed workflow count)
- Mode B B-1: ~200–600 tokens (current graph JSON)
- Mode B B-2: ~800–3000 tokens (all domain + workflow schema data, no truncation)
- Mode C: ~600–2000 tokens (full original definition)

### Validation Scope

The 4-stage validation pipeline (`schema → graph → permissions → compliance`) runs on:
- Mode A blueprint at generation time
- Mode A blueprint again at deploy time (guard against stale deploy)
- Mode C modified definition at customization time

It does **NOT** run on Mode B output (graph operations are validated structurally by the graph operator, not the blueprint validator).

### Data Never Sent to Claude

The following are never included in any AI prompt:
- JWT tokens or session data
- Raw API keys
- Passwords or bcrypt hashes
- Other institutions' data (every prompt is scoped to one institution's deployed workflows)
