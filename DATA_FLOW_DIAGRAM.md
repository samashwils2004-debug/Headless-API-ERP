# Orquestra ERP — Data Flow Diagram Reference

> This document describes every data flow in the Orquestra monorepo using the four canonical DFD elements: **External Entities** (sources/sinks), **Processes** (transformations), **Data Stores** (persistence), and **Data Flows** (named payloads with shapes). Structured at Level 0 (context), Level 1 (subsystems), and Level 2 (per-subsystem detail). Paste any section into Eraser.io, draw.io AI, Lucidchart AI, or Mermaid Live to generate a visual DFD.

---

## Part 1 — DFD Element Catalogue

### External Entities (E)

| ID | Name | Description | Data In (receives) | Data Out (sends) |
|----|------|-------------|-------------------|-----------------|
| E1 | **Console User** | Administrator/owner using the Next.js browser UI | JWT cookies, CSRF token, rendered pages, event stream | Login credentials, prompts, form submissions, API calls |
| E2 | **External Developer** | Third-party system calling the runtime REST API | API key, application responses, event data | `sk_erp_v{N}_*` bearer token, application payloads |
| E3 | **Anthropic Claude API** | Cloud AI provider (claude-sonnet-4-5) | System prompt + user prompt | Raw blueprint JSON, graph operations, DesignSpec JSON |
| E4 | **Vercel CDN** | Frontend hosting and edge network | Built Next.js bundle, static assets | HTML/JS/CSS to browser |
| E4 | **Render / Railway** | Backend hosting platform | Deployed FastAPI app | HTTP/WebSocket traffic |

---

### Processes (P)

| ID | Name | File | Transforms |
|----|------|------|-----------|
| P1 | **Next.js API Proxy** | `apps/web/src/app/api/_utils.ts` | Browser fetch → FastAPI request (adds auth headers, validates CSRF) |
| P2 | **CORS Filter** | `apps/api/app/main.py` (CORSMiddleware) | Raw HTTP request → allowed/blocked request |
| P3 | **Rate Limiter** | `apps/api/app/middleware/rate_limit.py` | Request + IP → allowed/429 response (Redis sliding window) |
| P4 | **CSRF Validator** | `apps/api/app/main.py` (security_middleware) | Cookie token + header token → pass/403 |
| P5 | **JWT Issuer** | `apps/api/app/security.py` (create_access_token) | User record → signed JWT string |
| P6 | **JWT Validator** | `apps/api/app/security.py` (verify_token / get_current_user) | Bearer token string → decoded user claims |
| P7 | **Password Hasher** | `apps/api/app/security.py` (hash_password / verify_password) | Raw password ↔ bcrypt hash |
| P8 | **Tenant Extractor** | `apps/api/app/tenant.py` (get_tenant_context) | HTTP headers → TenantContext(institution_id, project_id) |
| P9 | **RBAC Checker** | `apps/api/app/core/rbac_engine.py` (check_permission) | User role + required permission → pass/403 |
| P10 | **Context Enricher** | `apps/api/app/ai/blueprint/context_builder.py` | Deployed workflows → enriched prompt with field/role context |
| P11 | **AI Provider Router** | `apps/api/app/ai/provider_router.py` | Enriched prompt → cache check → Claude call → mock fallback → raw result |
| P12 | **Blueprint Validator** | `apps/api/app/ai/blueprint_generator.py` | Raw blueprint JSON → 4-stage validation result |
| P13 | **Schema Checker** | `apps/api/app/ai/validators/schema_validator.py` | Blueprint JSON → JSON Schema errors (Stage 1) |
| P14 | **Graph Analyzer** | `apps/api/app/ai/validators/graph_analyzer.py` | Workflow states/transitions → reachability errors (Stage 2) |
| P15 | **Permission Analyzer** | `apps/api/app/ai/validators/permission_analyzer.py` | Roles/permissions → RBAC errors (Stage 3) |
| P16 | **Compliance Checker** | `apps/api/app/ai/validators/compliance_checker.py` | Compliance tags → tag validity errors (Stage 4) |
| P17 | **NLP Intent Parser** | `apps/api/app/ai/architect/nlp_intent_parser.py` | NL domain description → list of graph operations |
| P18 | **Prompt Factory** | `apps/api/app/ai/architect/prompt_factory.py` | Graph operations + current graph → structured Claude system prompt |
| P19 | **Graph Operator** | `apps/api/app/routes/architect.py` (_apply_operation) | Current graph_json + operation → updated graph_json (pure function) |
| P20 | **Visualization Generator** | `apps/api/app/ai/architect/visualization_generator.py` | graph_json → visualization_config (node positions, colors, edges) |
| P21 | **Template Customizer** | `apps/api/app/ai/template_customizer/customizer.py` | Template definition + instruction → modified definition + diff |
| P22 | **Workflow Engine** | `apps/api/app/core/workflow_engine.py` | Application + workflow definition → state transitions + events |
| P23 | **Condition Parser** | `apps/api/app/core/condition_parser.py` | Condition string + applicant_data → boolean (true/false) |
| P24 | **Event Engine** | `apps/api/app/core/event_engine.py` | Event payload → PostgreSQL + Redis + WebSocket |
| P25 | **API Key Generator** | `apps/api/app/core/api_key_utils.py` | Version number → raw key + SHA256 hash + prefix |
| P26 | **API Key Authenticator** | `apps/api/app/middleware/api_key_auth.py` | Bearer token → RuntimeAuthContext (institution, workflows) |
| P27 | **Design Generator** | `apps/api/app/routes/architect.py` (generate_design) | All domains + workflow schemas → DesignSpec JSON (via Claude) |
| P28 | **WebSocket Hub** | `apps/api/app/ws/` | Event JSON → broadcast to all subscribed WebSocket clients |
| P29 | **Zustand State Manager** | `apps/web/src/lib/stores/` | API responses → in-memory + localStorage client state |
| P30 | **Canvas Converter** | `apps/web/src/app/console/workflows/` (blueprintToCanvas / canvasToDefinition) | Blueprint JSON ↔ ReactFlow nodes/edges |

---

### Data Stores (DS)

| ID | Name | Technology | Location |
|----|------|-----------|---------|
| DS1 | **users** | PostgreSQL table | Neon (prod) / SQLite (dev) |
| DS2 | **projects** | PostgreSQL table | Neon / SQLite |
| DS3 | **workflows** | PostgreSQL table | Neon / SQLite |
| DS4 | **applications** | PostgreSQL table | Neon / SQLite |
| DS5 | **events** | PostgreSQL table | Neon / SQLite |
| DS6 | **blueprint_proposals** | PostgreSQL table | Neon / SQLite |
| DS7 | **institution_architecture** | PostgreSQL table | Neon / SQLite |
| DS8 | **architecture_versions** | PostgreSQL table | Neon / SQLite |
| DS9 | **arch_workflows** | PostgreSQL table (junction) | Neon / SQLite |
| DS10 | **api_keys** | PostgreSQL table | Neon / SQLite |
| DS11 | **workflow_templates** | PostgreSQL table | Neon / SQLite |
| DS12 | **template_customizations** | PostgreSQL table | Neon / SQLite |
| DS13 | **role_permissions** | PostgreSQL table | Neon / SQLite |
| DS14 | **project_role_bindings** | PostgreSQL table | Neon / SQLite |
| DS15 | **AI Response Cache** | Redis sorted set / string | Upstash Redis |
| DS16 | **Rate Limit Counters** | Redis sorted set (sliding window) | Upstash Redis |
| DS17 | **Event Streams** | Redis Streams (XADD) | Upstash Redis |
| DS18 | **Project Context** | Browser localStorage | Client-side |
| DS19 | **Workflow Cache** | Browser localStorage | Client-side |
| DS20 | **Auth Cookies** | HttpOnly browser cookies | Client-side |
| DS21 | **CSRF Cookie** | Readable browser cookie | Client-side |
| DS22 | **Event Memory Store** | Zustand useEventStore (in-memory) | Client-side |

---

### Named Data Flows (DF)

| ID | Name | From → To | Payload Shape |
|----|------|-----------|--------------|
| DF1 | Login Credentials | E1 → P1 | `{ email, password }` |
| DF2 | Auth Request | P1 → FastAPI | `{ email, password }` + forwarded headers |
| DF3 | JWT Tokens | FastAPI → DS20 | `{ access_token, refresh_token }` as HttpOnly cookies |
| DF4 | CSRF Token | FastAPI → DS21 | `csrf_token=<uuid>` readable cookie |
| DF5 | Bearer Token | DS20 → P1 | `Authorization: Bearer <jwt>` header |
| DF6 | Tenant Headers | DS18 → P1 | `X-Institution-Id, X-Project-Id` headers |
| DF7 | CSRF Header | DS21 → P1 | `X-CSRF-Token: <uuid>` header |
| DF8 | JWT Claims | P6 → P8,P9 | `{ sub, institution_id, role, exp }` |
| DF9 | Tenant Context | P8 → Route Handler | `TenantContext { institution_id, project_id }` |
| DF10 | User Prompt | E1 → P10 | `{ prompt: "string", institution_context: {} }` |
| DF11 | Deployed Workflow Summary | DS3 → P10 | `[{ name, states, schema_fields, roles }]` |
| DF12 | Enriched Prompt | P10 → P11 | Full prompt string with PROJECT CONTEXT prepended |
| DF13 | Cache Key | P11 → DS15 | `orquestra:ai:cache:<SHA256(prompt+context)>` |
| DF14 | Cache Hit | DS15 → P11 | Previously generated blueprint JSON |
| DF15 | Claude Request | P11 → E3 | `{ system_prompt, user: enriched_prompt }` |
| DF16 | Raw Blueprint | E3 → P11 | Blueprint JSON (workflow + roles + events + compliance_tags) |
| DF17 | Raw Blueprint | P11 → P12 | Same blueprint JSON passed to validator |
| DF18 | Stage 1 Result | P13 → P12 | `{ valid: bool, errors: [string] }` |
| DF19 | Stage 2 Result | P14 → P12 | `{ valid: bool, errors: [string] }` |
| DF20 | Stage 3 Result | P15 → P12 | `{ valid: bool, errors: [string] }` |
| DF21 | Stage 4 Result | P16 → P12 | `{ valid: bool, errors: [string] }` |
| DF22 | Proposal Write | P12 → DS6 | BlueprintProposal record (status, blueprint, validation_result) |
| DF23 | Workflow Write | FastAPI → DS3 | Workflow record (name, version, definition, deployed=true) |
| DF24 | NL Domain Description | E1 → P17 | `{ prompt: "Add admissions, fee management..." }` |
| DF25 | Operation List | P17 → P18 | `[{ operation: "add_domain", domain: { id, label } }]` |
| DF26 | Architect Prompt | P18 → E3 | `{ system_prompt, user: operation_context }` |
| DF27 | Graph Operations | E3 → P19 | `[{ operation, domain/integration/workflow_link }]` |
| DF28 | Current Graph | DS7 → P19 | `{ erp_system: { domains: [], integrations: [] } }` |
| DF29 | Updated Graph | P19 → DS7 | Same structure, mutated with new domains/links |
| DF30 | Graph for Viz | DS7 → P20 | graph_json |
| DF31 | Viz Config | P20 → DS7 | `{ nodes: [{id,x,y,color}], edges: [{from,to}] }` |
| DF32 | Application Payload | E2 → P26 | `{ workflow_id, applicant_data: {} }` with Bearer header |
| DF33 | API Key Lookup | P26 → DS10 | SHA256(raw_key) → api_key record |
| DF34 | Arch Workflow Set | DS9 → P26 | `[{ workflow_id }]` for this architecture_version |
| DF35 | Runtime Auth Context | P26 → P22 | `{ institution_id, project_id, accessible_workflow_ids }` |
| DF36 | Application Write | P22 → DS4 | Application record (current_state, applicant_data, status) |
| DF37 | Workflow Definition | DS3 → P22 | `{ initial_state, states, schema }` |
| DF38 | Condition Eval | P22 → P23 | `{ condition: "score >= 70", data: { score: 85 } }` |
| DF39 | Condition Result | P23 → P22 | `true` or `false` |
| DF40 | State Update | P22 → DS4 | `UPDATE applications SET current_state=?` |
| DF41 | Event Payload | P22,P12,P19,P25 → P24 | `{ type, institution_id, project_id, data, version }` |
| DF42 | Event DB Write | P24 → DS5 | events row (id, type, timestamp, data) |
| DF43 | Event Stream Write | P24 → DS17 | XADD `events:{inst}:{proj}` fields |
| DF44 | Event Broadcast | P24 → P28 | Event JSON to hub |
| DF45 | WebSocket Message | P28 → E1 | Event JSON via WebSocket frame |
| DF46 | Rate Limit Check | P3 → DS16 | ZREMRANGEBYSCORE + ZADD + ZCARD on `orquestra:rl:{tier}:{ip}` |
| DF47 | Rate Limit Decision | DS16 → P3 | Current count → allow/block |
| DF48 | Project Context Write | P29 → DS18 | `{ institutionId, projectId, projectName }` to localStorage |
| DF49 | Project Context Read | DS18 → P29 | Same shape, restored on page load |
| DF50 | Canvas Nodes/Edges | E1 → P30 | ReactFlow `{ nodes: [{id,type,label}], edges: [{source,target,data}] }` |
| DF51 | Blueprint Definition | P30 → FastAPI | Converted WorkflowDefinition JSON |
| DF52 | Key Write | P25 → DS10 | `{ key_hash: SHA256(raw), key_prefix, architecture_version_id }` |
| DF53 | Raw Key | P25 → E1 | `sk_erp_v{N}_{hex}` — shown once, never stored |
| DF54 | Domain Context | DS7,DS3 → P27 | All domains + compact workflow schemas |
| DF55 | DesignSpec | E3 → P27 | `{ modules: [{id,label,stats,fields,actions,table_columns}], relationships, nav_groups }` |
| DF56 | DesignSpec Save | P27 → DS7 | Written into `visualization_config.design_spec` |
| DF57 | Event Backfill | DS5 → E1 | Last 200 events via REST GET /api/events |
| DF58 | Template Read | DS11 → P21 | `{ definition: WorkflowDefinition }` |
| DF59 | Modified Definition | P21 → DS12 | TemplateCustomization record (modified_definition, diff_json) |
| DF60 | Password Hash | P7 → DS1 | bcrypt hash stored in `users.password_hash` |
| DF61 | RBAC Matrix | DS13 → P9 | `[{ role, permission }]` rows |

---

## Part 2 — Level 0 DFD: Context Diagram

The entire Orquestra system as a single process. Shows only what data crosses the system boundary.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                                                         │
  ┌──────────┐      │  ┌─────────────────────────────────────────────────┐   │
  │ Console  │──────┼─►│                                                 │   │
  │  User    │  DF1 │  │                                                 │   │
  │   (E1)   │◄─────┼──│                                                 │   │
  └──────────┘  pages  │                                                 │   │
                    │  │                                                 │   │
  ┌──────────┐      │  │                                                 │   │
  │ External │──────┼─►│              ORQUESTRA ERP                      │   │
  │Developer │  DF32│  │                SYSTEM                           │   │
  │   (E2)   │◄─────┼──│                                                 │   │
  └──────────┘  DF app │                                                 │   │
                    │  │                                                 │   │
  ┌──────────┐      │  │                                                 │   │
  │ Anthropic│◄─────┼──│                                                 │   │
  │  Claude  │  DF15│  │                                                 │   │
  │   (E3)   │──────┼─►│                                                 │   │
  └──────────┘  DF16│  └─────────────────────────────────────────────────┘   │
                    │                                                         │
                    └─────────────────────────────────────────────────────────┘

Data IN to system:
  From E1: Login credentials, prompts, workflow definitions, domain descriptions,
           customization instructions, application data, CSRF tokens
  From E2: API key, application payloads (workflow_id + applicant_data)
  From E3: Blueprint JSON, graph operations, DesignSpec JSON

Data OUT of system:
  To E1:  JWT cookies, CSRF cookie, rendered UI, WebSocket events, API keys (once),
          blueprint validation results, workflow diagrams, ERP mockup specs
  To E2:  Application ID, current_state, status, error details
  To E3:  System prompts, user prompts (blueprint requests, graph operations, design requests)
```

---

## Part 3 — Level 1 DFD: Major Subsystems

```
                            ┌──────────────────────────────────────────────────────────────────┐
                            │                     ORQUESTRA ERP SYSTEM                         │
                            │                                                                  │
  ┌──────────┐  credentials │  ┌──────────────────┐   JWT + context   ┌──────────────────┐   │
  │ Console  ├──────────────┼─►│ 1. Auth &        ├──────────────────►│                  │   │
  │  User    │◄─────────────┼──┤    Session       │                   │                  │   │
  │   (E1)   │  cookies+UI  │  └──────────────────┘                   │                  │   │
  │          │              │                                           │                  │   │
  │          │  NL prompt   │  ┌──────────────────┐   blueprint JSON  │  5. Workflow      │   │
  │          ├──────────────┼─►│ 2. Blueprint Gen  ├──────────────────►     Execution     │   │
  │          │◄─────────────┼──┤    (Mode A)       │                   │    Engine        │   │
  │          │  proposal    │  └──────────────────┘                   │                  │   │
  │          │              │                                           │                  │   │
  │          │  domain desc │  ┌──────────────────┐   graph_json      │                  │   │
  │          ├──────────────┼─►│ 3. ERP Architect  ├──────────────────►                  │   │
  │          │◄─────────────┼──┤    (Mode B)       │                   │                  │   │
  │          │  graph+viz   │  └──────────────────┘                   └─────────┬────────┘   │
  │          │              │                                                     │            │
  │          │  template+   │  ┌──────────────────┐   modified def              │            │
  │          │  instruction ├─►│ 4. Template       ├─────────────────────────────►            │
  │          │◄─────────────┼──┤    Customization  │                             │            │
  │          │  diff+result │  │    (Mode C)       │                             │            │
  │          │              │  └──────────────────┘                             │events      │
  │          │ WS events    │  ┌──────────────────┐                             │            │
  │          │◄─────────────┼──┤ 6. Event System   │◄────────────────────────────┘            │
  │          │              │  └──────────────────┘                                           │
  └──────────┘              │                                                                  │
                            │                                                                  │
  ┌──────────┐  API key +   │  ┌──────────────────┐                                          │
  │ External │  app payload │  │ 7. Runtime API   │                                          │
  │Developer ├──────────────┼─►│    (External)    ├───────────────────────────► 5. Workflow  │
  │   (E2)   │◄─────────────┼──┤                  │                             Execution    │
  └──────────┘  app result  │  └──────────────────┘                                          │
                            │                                                                  │
  ┌──────────┐              │                                                                  │
  │Anthropic │◄─────────────┼──── prompts from subsystems 2, 3, 4 ──────────────────────────  │
  │  Claude  ├──────────────┼──► results into subsystems 2, 3, 4 ──────────────────────────►  │
  └──────────┘              │                                                                  │
                            └──────────────────────────────────────────────────────────────────┘
```

---

## Part 4 — Level 2 DFDs: Per-Subsystem Detail

---

### 4.1 Subsystem 1 — Authentication & Session

**Processes:** P1 (Proxy), P2 (CORS), P3 (Rate Limiter), P4 (CSRF Validator), P5 (JWT Issuer), P6 (JWT Validator), P7 (Password Hasher)
**Data Stores:** DS1 (users), DS13 (role_permissions), DS16 (rate limit counters), DS20 (auth cookies), DS21 (CSRF cookie), DS18 (project context localStorage)

```
E1 (Console User)
    │
    │  DF1: { email: "alice@inst.edu", password: "secret" }
    ▼
P1 (Next.js Proxy / apps/web/src/app/api/auth/login/route.ts)
    │
    │  Forwards POST /api/auth/login + body
    ▼
P2 (CORS Filter)
    │ Origin in allow-list? → pass/block
    ▼
P3 (Rate Limiter)
    │                           ┌─────────────────────────────────┐
    ├──── DF46: rate check ────►│ DS16: Rate Limit Counters       │
    │◄─── DF47: count ──────────│ key: orquestra:rl:auth:{ip}     │
    │                           │ ZREMRANGEBYSCORE + ZADD + ZCARD  │
    │ count > 60/min → 429      └─────────────────────────────────┘
    │ count ≤ 60/min → pass
    ▼
FastAPI POST /api/auth/login (apps/api/app/routes/auth.py)
    │
    │  Query: { email, institution_id }
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── user record ────────────│ DS1: users                     │
    │                             │ { id, email, password_hash,    │
    │                             │   institution_id, role }       │
    │                             └────────────────────────────────┘
    ▼
P7 (Password Hasher / apps/api/app/security.py)
    │  bcrypt.verify(password, user.password_hash)
    │  → INVALID → 401 "Invalid credentials"
    │  → VALID   → continue
    ▼
P5 (JWT Issuer / apps/api/app/security.py)
    │
    │  Input:  user { id, institution_id, role }
    │  Output access_token payload:
    │    { sub: user.id, institution_id, role: "owner",
    │      type: "access", exp: now+7days }
    │  Output refresh_token payload:
    │    { sub: user.id, type: "refresh", exp: now+30days }
    │  Sign both with HS256(SECRET_KEY)
    ▼
P1 (Next.js Proxy — response phase)
    │
    │  DF3: Set-Cookie: admitflow_access_token=<jwt>; HttpOnly; Secure; SameSite=Lax
    │  DF3: Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Lax
    │  DF4: Set-Cookie: csrf_token=<uuid>; SameSite=Lax  [NOT HttpOnly — readable by JS]
    │       Set-Cookie: institution_id=<id>; SameSite=Lax
    ├──── write ─────────────────►┌────────────────────────────────┐
    │                             │ DS20: Auth Cookies (browser)   │
    │                             │ admitflow_access_token (HttpOnly)│
    │                             │ refresh_token (HttpOnly)       │
    │                             └────────────────────────────────┘
    ├──── write ─────────────────►┌────────────────────────────────┐
    │                             │ DS21: CSRF Cookie (browser)    │
    │                             │ csrf_token = <random UUID>     │
    │                             └────────────────────────────────┘
    │
    │  DF body: { ok: true, user: { id, email, name, role } }
    ▼
E1 browser redirects to /console → ConsoleProvider mounts

ConsoleProvider bootstrap:
    │
    │  Reads DS18 (localStorage: "orquestra-project-context")
    │  → { institutionId, projectId, projectName }
    │
    │  GET /api/auth/me
    │    DS20 → DF5: Bearer token → P6 (JWT Validator)
    │    P6 decodes → { sub, institution_id, role }
    │    Response: { id, email, name, role, institution_id }
    │    → P29 (Zustand): useAuthStore.setUser(user)
    │
    │  GET /api/projects (with tenant headers from DS18)
    │    Response: { projects: [...] }
    │    → P29 (Zustand): useProjectStore.setProjects(projects)
    │
    │  GET /api/workflows (if projectId known from DS18)
    │    Response: { workflows: [...] }
    │    → P29 (Zustand): useWorkflowStore.setWorkflows(workflows)
    │         └── write ──────────►┌────────────────────────────────┐
    │                              │ DS19: Workflow Cache (localStorage)│
    │                              └────────────────────────────────┘
    ▼
All subsequent requests use:
    DS20 (access_token) → DF5 (Authorization header)
    DS18 (context)      → DF6 (X-Institution-Id, X-Project-Id headers)
    DS21 (csrf_token)   → DF7 (X-CSRF-Token header)
```

---

### 4.2 Subsystem 2 — Blueprint Generation (Mode A)

**Processes:** P10 (Context Enricher), P11 (AI Provider Router), P12 (Blueprint Validator), P13–P16 (4 validators)
**Data Stores:** DS3 (workflows), DS6 (blueprint_proposals), DS15 (AI response cache)
**External:** E3 (Claude)

```
E1 (Console User)
    │  DF10: { prompt: "Create a fee payment workflow with doc verification",
    │           institution_context: { type: "university" } }
    ▼
P10 (Context Enricher / apps/api/app/ai/blueprint/context_builder.py)
    │
    │  DF11: Query deployed workflows
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── workflow summaries ─────│ DS3: workflows                 │
    │     [{ name, states,        │ WHERE deployed=true            │
    │        schema_fields,       │ AND institution_id=?           │
    │        roles }]             │ AND project_id=?               │
    │                             └────────────────────────────────┘
    │
    │  Enriched context:
    │  { existing_workflows: [...], known_fields: ["score","email"],
    │    known_roles: ["reviewer","applicant"], workflow_count: 2 }
    │
    │  DF12: Enriched prompt:
    │    "PROJECT CONTEXT — existing workflows: admissions_v1 (fields: score, email)
    │     IMPORTANT: Reuse these field names.
    │     --- NEW WORKFLOW REQUEST ---
    │     Create a fee payment workflow..."
    ▼
P11 (AI Provider Router / apps/api/app/ai/provider_router.py)
    │
    │  Step 1: Cache check
    │  cache_key = "orquestra:ai:cache:" + SHA256(prompt + context)
    ├──── GET cache_key ─────────►┌────────────────────────────────┐
    │◄─── DF14: cached blueprint ─│ DS15: AI Response Cache (Redis) │
    │     OR nil (cache miss)     │ TTL: 86400 seconds (24h)       │
    │                             └────────────────────────────────┘
    │
    │  [CACHE HIT] → skip to validation (Step 3)
    │  [CACHE MISS] →
    │
    │  Step 2: Try Claude
    │  DF15: { system: ERP_BLUEPRINT_SYSTEM_PROMPT,
    │           user: enriched_prompt }
    │  model: claude-sonnet-4-5, max_tokens: 8192
    ├──── request ───────────────►  E3 (Anthropic Claude API)
    │◄─── DF16: raw blueprint ────
    │     OR error/timeout
    │
    │  [CLAUDE FAILS] → Mock:
    │    _mock_blueprint() → deterministic 4-state workflow
    │    is_mock = True (not cached)
    │
    │  [CLAUDE SUCCEEDS] → Cache result:
    ├──── SET cache_key, 86400 ──►┌────────────────────────────────┐
    │     DF: blueprint JSON      │ DS15: AI Response Cache (Redis) │
    │                             └────────────────────────────────┘
    │
    │  DF17: Raw blueprint JSON:
    │  {
    │    "workflow": {
    │      "name": "fee_payment_workflow",
    │      "initial_state": "submitted",
    │      "states": { "submitted": {...}, "approved": {...}, "rejected": {...} },
    │      "schema": { "fields": [{ "name": "fee_amount", "type": "number" }] }
    │    },
    │    "roles": [{ "name": "accounts_officer", "permissions": ["application:review"] }],
    │    "events": [{ "type": "fee.submitted", "version": "1.0" }],
    │    "compliance_tags": ["ferpa"]
    │  }
    ▼
P12 (Blueprint Validator / apps/api/app/ai/blueprint_generator.py)
    │
    │  Runs 4 validators in sequence:
    │
    │  P13 (Schema Checker):
    │    Input:  blueprint JSON
    │    Check:  top-level keys, workflow structure, ≥2 states
    │    DF18:  { valid: true, errors: [] }
    │
    │  P14 (Graph Analyzer):
    │    Input:  states + transitions graph
    │    Check:  initial_state exists, all transition.to valid, ≥1 terminal,
    │            all states reachable from initial_state (BFS)
    │    DF19:  { valid: true, errors: [] }
    │
    │  P15 (Permission Analyzer):
    │    Input:  roles array
    │    Check:  each role has ≥1 permission, "resource:action" format
    │    DF20:  { valid: true, errors: [] }
    │
    │  P16 (Compliance Checker):
    │    Input:  compliance_tags array
    │    Check:  non-empty, lowercase, in {ferpa, gdpr, dpdp, hipaa}
    │    DF21:  { valid: true, errors: [] }
    │
    │  is_valid = stage1 AND stage2 AND stage3 AND stage4
    ▼
DF22: Write BlueprintProposal to DS6
    ├──── INSERT ────────────────►┌────────────────────────────────┐
    │                             │ DS6: blueprint_proposals       │
    │                             │ { id, prompt, status,          │
    │                             │   blueprint (JSON),            │
    │                             │   validation_result (JSON),    │
    │                             │   provider_used, is_mock,      │
    │                             │   institution_id, project_id } │
    │                             └────────────────────────────────┘
    │
    │  Response to E1:
    │  { proposal_id, status: "validated"|"invalid",
    │    blueprint, validation_result, provider_used, is_mock }
    ▼
[On user Deploy] → POST /api/ai/blueprints/{id}/deploy
    │
    │  Re-validate blueprint (guard against stale deploy)
    │  Check version: SELECT MAX(version) FROM workflows WHERE name=?
    │
    │  DF23: Create Workflow record
    ├──── INSERT ────────────────►┌────────────────────────────────┐
    │                             │ DS3: workflows                 │
    │                             │ { name, version, definition,   │
    │                             │   is_ai_generated=true,        │
    │                             │   ai_prompt, deployed=true,    │
    │                             │   deployed_at }                │
    │                             └────────────────────────────────┘
    │
    │  Update DS6: proposal.status = "deployed"
    │  → EventEngine.emit("ai.blueprint.deployed") → P24
```

---

### 4.3 Subsystem 3 — ERP Architecture Composition (Mode B)

**Processes:** P17 (NLP Intent Parser), P18 (Prompt Factory), P19 (Graph Operator), P20 (Visualization Generator), P27 (Design Generator)
**Data Stores:** DS7 (institution_architecture), DS8 (architecture_versions), DS9 (arch_workflows), DS10 (api_keys)
**External:** E3 (Claude)

```
E1 (Console User)
    │  DF24: { prompt: "Add admissions and fee management modules" }
    ▼
P17 (NLP Intent Parser / apps/api/app/ai/architect/nlp_intent_parser.py)
    │  Tokenize → filter stop words → extract domain phrases
    │  DF25: [
    │    { operation: "add_domain", domain: { id: "admissions",    label: "Admissions" } },
    │    { operation: "add_domain", domain: { id: "fee_management", label: "Fee Management" } }
    │  ]
    ▼
P18 (Prompt Factory / apps/api/app/ai/architect/prompt_factory.py)
    │
    ├──── READ ──────────────────►┌────────────────────────────────┐
    │◄─── DF28: current graph ────│ DS7: institution_architecture  │
    │                             │ { erp_system: { domains: [],   │
    │                             │   integrations: [] } }         │
    │                             └────────────────────────────────┘
    │  DF26: Builds system prompt for Claude:
    │    "You are an ERP domain architect. Current graph: {graph_json}.
    │     Valid operations: add_domain, link_workflow, add_integration.
    │     User intent: Add admissions and fee management."
    ▼
E3 (Anthropic Claude API)
    │  DF27: Confirmed graph operations:
    │  [{ operation: "add_domain", domain: { id: "admissions", label: "Admissions", color: "#3b82f6" } },
    │   { operation: "add_domain", domain: { id: "fee_management", label: "Fee Management", color: "#8b5cf6" } }]
    ▼
P19 (Graph Operator / apps/api/app/routes/architect.py → _apply_operation)
    │  PURE FUNCTION — no DB reads inside loop
    │  Reads graph_json ONCE before loop
    │
    │  Loop iteration 1:
    │    operation: add_domain { id: "admissions" }
    │    graph.erp_system.domains.append({ id, label, color })
    │    → graph updated in memory
    │
    │  Loop iteration 2:
    │    operation: add_domain { id: "fee_management" }
    │    graph.erp_system.domains.append({ id, label, color })
    │    → graph updated in memory
    │
    │  DF29: Updated graph_json:
    │  { erp_system: { domains: [
    │      { id: "admissions",    label: "Admissions",    color: "#3b82f6" },
    │      { id: "fee_management",label: "Fee Management",color: "#8b5cf6" }
    │    ], integrations: [] } }
    │
    │  SINGLE DB WRITE (prevents race conditions):
    ├──── UPDATE ────────────────►┌────────────────────────────────┐
    │                             │ DS7: institution_architecture  │
    │                             │ SET graph_json=?, updated_at=? │
    │                             └────────────────────────────────┘
    ▼
P20 (Visualization Generator / apps/api/app/ai/architect/visualization_generator.py)
    │  Input: graph_json + linked_workflows
    │  Output DF31: visualization_config:
    │  { nodes: [
    │      { id: "admissions",    x: 100, y: 200, color: "#3b82f6", linked: false },
    │      { id: "fee_management",x: 400, y: 200, color: "#8b5cf6", linked: false }
    │    ],
    │    edges: []
    │  }
    ├──── UPDATE viz_config ─────►  DS7: institution_architecture
    ▼
Response to E1: { graph_json, visualization_config, diff_summary }

────────────────────────────────────────────────────────────
[Sub-flow: Link Workflow to Domain (bulk)]
────────────────────────────────────────────────────────────

E1: { domain_ids: ["admissions","fee_management"],
      workflow_id: "wf-uuid", workflow_name: "admissions_workflow" }
    ▼
P19 loop (all domains in memory, one DB commit):
    graph = DS7.graph_json  ← read ONCE
    for each domain_id:
      _apply_operation(graph, { operation: "link_workflow",
        workflow_link: { domain_id, workflow_id, workflow_name } })
    DS7.graph_json = updated_graph  ← write ONCE

────────────────────────────────────────────────────────────
[Sub-flow: Generate UI Mockup]
────────────────────────────────────────────────────────────

P27 (Design Generator / apps/api/app/routes/architect.py → generate_design)
    │
    │  DF54: Build domain context (ALL domains, no truncation):
    ├──── READ ──────────────────►┌────────────────────────────────┐
    │◄─── all domains + wf IDs ───│ DS7: institution_architecture  │
    │                             └────────────────────────────────┘
    │  For each domain with workflow_id:
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── definition + schema ────│ DS3: workflows                 │
    │                             └────────────────────────────────┘
    │  compact_fields = [{ name, type }]  ← schema fields only
    │
    │  context = {
    │    system_name: "MCC Undergraduate ERP",
    │    total_domains: 5,
    │    domains: [
    │      { id, label, color, workflow: { name, states, fields } },  ← has workflow
    │      { id, label, color }                                         ← no workflow, infer
    │    ]
    │  }
    │
    │  Prompt to Claude:
    │    "Design a UI mockup for 5 domains — you MUST generate one module per domain"
    ├──── request ───────────────►  E3
    │◄─── DF55: DesignSpec ────────
    │
    │  DF56: Save DesignSpec
    ├──── UPDATE ────────────────►┌────────────────────────────────┐
    │                             │ DS7: institution_architecture  │
    │                             │ visualization_config.design_spec│
    │                             └────────────────────────────────┘

────────────────────────────────────────────────────────────
[Sub-flow: Compile Architecture → API Key]
────────────────────────────────────────────────────────────

E1: { workflow_ids: ["wf-1","wf-2"], key_name: "Production Key" }
    ▼
P25 (API Key Generator / apps/api/app/core/api_key_utils.py)
    │  Input: version_number = 3
    │  raw_key    = "sk_erp_v3_" + secrets.token_hex(16)
    │  key_hash   = SHA256(raw_key)
    │  key_prefix = raw_key[:16] + "..."
    │
    │  raw_secret    = "whsec_erp_" + secrets.token_hex(16)
    │  secret_hash   = SHA256(raw_secret)
    │  secret_prefix = raw_secret[:16] + "..."

INSERT INTO architecture_versions → DS8
INSERT INTO arch_workflows (junction) → DS9
    │
    │  DF52: Key write (hashes only, never raw)
    ├──── INSERT ────────────────►┌────────────────────────────────┐
    │                             │ DS10: api_keys                 │
    │                             │ { key_hash, key_prefix,        │
    │                             │   webhook_secret_hash,         │
    │                             │   webhook_secret_prefix,       │
    │                             │   architecture_version_id }    │
    │                             └────────────────────────────────┘
    │
    │  DF53: Raw key → E1 (ONCE ONLY, browser shows copy modal)
    │  "sk_erp_v3_a1b2c3d4..." + "whsec_erp_x7y8z9..."
    │  → raw values are NEVER stored in any data store
```

---

### 4.4 Subsystem 4 — Template Customization (Mode C)

**Processes:** P21 (Template Customizer), P12–P16 (Validators)
**Data Stores:** DS11 (workflow_templates), DS12 (template_customizations), DS3 (workflows)
**External:** E3 (Claude)

```
E1 (Console User)
    │  Requests template list
    ├──── GET /api/templates ────►┌────────────────────────────────┐
    │◄─── template list ──────────│ DS11: workflow_templates       │
    │     [{ id, name, category,  │ { id, name, category,          │
    │        description }]       │   definition (JSON) }          │
    │                             └────────────────────────────────┘
    │
    │  DF: User selects template + types instruction:
    │  { template_id: "tmpl-uuid",
    │    instruction: "Add GRE score field and department approval step" }
    ▼
P21 (Template Customizer / apps/api/app/ai/template_customizer/customizer.py)
    │
    │  DF58: Load template definition
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── definition JSON ────────│ DS11: workflow_templates       │
    │                             └────────────────────────────────┘
    │
    │  Claude request:
    │    system: "Modify the workflow definition per instruction.
    │             Return: modified_definition + change_summary + diff_json"
    │    user:   { original_definition, instruction }
    ├──── request ───────────────►  E3
    │◄─── { modified_definition, change_summary, diff_json }
    │
    │  modified_definition:
    │  { states: { ...original + "department_review": {type:"intermediate",...} },
    │    schema: { fields: [...original, { name:"gre_score",type:"number" }] },
    │    roles: [{ name: "candidate", permissions: [...] }]  ← renamed
    │  }
    ▼
P12–P16: 4-Stage Validation on modified_definition
    (same pipeline as Subsystem 2, Steps P13→P16)
    validation_result = { stage_1..4, is_valid }
    ▼
DF59: Write TemplateCustomization
    ├──── INSERT ────────────────►┌────────────────────────────────┐
    │                             │ DS12: template_customizations  │
    │                             │ { template_id, institution_id, │
    │                             │   project_id, instruction,     │
    │                             │   modified_definition (JSON),  │
    │                             │   diff_json, validation_result,│
    │                             │   change_summary, provider_used}│
    │                             └────────────────────────────────┘
    │
    │  Response: { customization_id, modified_definition,
    │              validation_result, change_summary, diff_json }
    ▼
[On user Deploy] → POST /api/templates/{id}/deploy
    │  DF23: Create Workflow from modified_definition
    ├──── INSERT ────────────────►┌────────────────────────────────┐
    │                             │ DS3: workflows                 │
    │                             │ { name, version=1,             │
    │                             │   definition=modified_def,     │
    │                             │   is_ai_generated=false,       │
    │                             │   deployed=true }              │
    │                             └────────────────────────────────┘
    │  → EventEngine.emit("template.deployed") → P24
```

---

### 4.5 Subsystem 5 — Workflow Engine Execution

**Processes:** P22 (Workflow Engine), P23 (Condition Parser), P24 (Event Engine)
**Data Stores:** DS3 (workflows), DS4 (applications)

```
Input: application_id  (new record already INSERTed)
    ▼
P22 (Workflow Engine / apps/api/app/core/workflow_engine.py)
    │
    │  Load workflow definition
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── DF37: definition ───────│ DS3: workflows                 │
    │     { initial_state,        │ { definition:                  │
    │       states: {             │   { initial_state, states,     │
    │         "submitted": {      │     schema } }                 │
    │           type: "initial",  └────────────────────────────────┘
    │           transitions: [{ to: "under_review",
    │                           condition: null,
    │                           emit_event: "application.submitted" }]
    │         },
    │         "under_review": {
    │           type: "intermediate",
    │           transitions: [
    │             { to: "approved", condition: "score >= 70" },
    │             { to: "rejected", condition: "score < 70" }
    │           ]
    │         },
    │         "approved": { type: "terminal", transitions: [] },
    │         "rejected": { type: "terminal", transitions: [] }
    │       }
    │     }
    │
    │  Schema validation:
    │  applicant_data = { score: 85, name: "Alice", email: "alice@u.edu" }
    │  Check each field in schema.fields:
    │    score: type=number ✓, min=0 ✓, max=100 ✓
    │    name:  type=string ✓, required=true ✓
    │    email: type=string ✓, required=true ✓
    │  → VALID → continue
    │
    │  ════ EXECUTION LOOP ════
    │
    │  ITERATION 1: current_state = "submitted"
    │    state.type = "initial" → not terminal
    │    transition[0]: condition = null → always matches
    │    → next_state = "under_review"
    │    → emit_event = "application.submitted"
    │
    │  DF38: Condition evaluation (null condition — skip P23)
    │  DF41: { type:"application.submitted", data:{application_id} } → P24
    │
    │  DF40: State update
    ├──── UPDATE ────────────────►┌────────────────────────────────┐
    │     current_state=          │ DS4: applications              │
    │     "under_review"          └────────────────────────────────┘
    │
    │  ITERATION 2: current_state = "under_review"
    │    state.type = "intermediate" → not terminal
    │    transition[0]: condition = "score >= 70"
    │
    │    DF38: { condition: "score >= 70", data: { score: 85 } }
    │    → P23 (Condition Parser)
    │      tokenize → ["score", ">=", "70"]
    │      lookup "score" in { score:85, name:"Alice" } → 85
    │      evaluate 85 >= 70 → TRUE
    │    DF39: true → matches
    │    → next_state = "approved"
    │    → emit_event = "application.reviewed"
    │
    │  DF41: { type:"application.reviewed", data:{...} } → P24
    │
    │  DF40: State update
    ├──── UPDATE ────────────────►┌────────────────────────────────┐
    │     current_state="approved"│ DS4: applications              │
    │                             └────────────────────────────────┘
    │
    │  ITERATION 3: current_state = "approved"
    │    state.type = "terminal" → EXIT LOOP
    │
    │  db.commit()
    ▼
Return: { application_id, current_state: "approved", status: "active" }
```

---

### 4.6 Subsystem 6 — Event System (Three-Channel Cascade)

**Processes:** P24 (Event Engine), P28 (WebSocket Hub), P29 (Zustand)
**Data Stores:** DS5 (events table), DS17 (Redis Streams), DS22 (Event Memory Store)

```
P24 (Event Engine / apps/api/app/core/event_engine.py)
receives DF41: {
    type:           "application.reviewed",
    institution_id: "inst-uuid",
    project_id:     "proj-uuid",
    data:           { application_id, from_state: "submitted", to_state: "approved" },
    version:        "1.0"
}
    │
    │  ════ CHANNEL 1: PostgreSQL (CRITICAL — blocks on failure) ════
    │  DF42: INSERT INTO events
    ├──── INSERT ────────────────►┌────────────────────────────────┐
    │                             │ DS5: events                    │
    │  [DB ERROR] → raise 500     │ { id (UUID),                   │
    │  [SUCCESS]  → event_id ok   │   type,                        │
    │                             │   version,                     │
    │                             │   timestamp = utcnow(),        │
    │                             │   institution_id,              │
    │                             │   project_id,                  │
    │                             │   data (JSONB) }               │
    │                             └────────────────────────────────┘
    │
    │  ════ CHANNEL 2: Redis Stream (GRACEFUL — continues on failure) ════
    │  DF43: XADD
    ├──── XADD ──────────────────►┌────────────────────────────────┐
    │     [REDIS DOWN] → log warn │ DS17: Event Streams (Redis)    │
    │     [SUCCESS]   → ok        │ key: events:{inst_id}:{proj_id}│
    │                             │ maxlen: 20000 (approx)         │
    │                             │ fields: { id, type, version,   │
    │                             │   timestamp, data_json }       │
    │                             └────────────────────────────────┘
    │
    │  ════ CHANNEL 3: WebSocket (GRACEFUL — continues on failure) ════
    │  DF44: broadcast event JSON
    ├──── broadcast ─────────────►  P28 (WebSocket Hub)
    │     [HUB ERROR] → log warn      hub.clients[(inst_id, proj_id)]
    │                                 = set of connected WebSocket objects
    │                                 For each ws:
    │                                   await ws.send_json(event_data)
    │                                   [CLIENT GONE] → remove from set
    │
    │  DF45: WebSocket frame → E1 browser
    ▼
useEventStream hook (apps/web/src/lib/hooks/useEventStream.ts)
    │  ws.onmessage → event_data = JSON.parse(message.data)
    ▼
P29 (Zustand) → useEventStore.pushEvent(event_data)
    │  dedup: if events.find(e => e.id === event_data.id) → skip
    │  prepend: events = [event_data, ...events].slice(0, 400)
    ├──── write ─────────────────►┌────────────────────────────────┐
    │                             │ DS22: Event Memory Store       │
    │                             │ (Zustand useEventStore)        │
    │                             │ max 400 events, deduped by id  │
    │                             └────────────────────────────────┘
    ▼
/console/events page re-renders with new event at top

────────────────────────────────────────────────────────────
[Backfill sub-flow — on page load]
────────────────────────────────────────────────────────────
E1 → GET /api/events?limit=200
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── DF57: last 200 events ──│ DS5: events                    │
    │     ORDER BY timestamp DESC │ WHERE institution_id=?          │
    │     LIMIT 200               │ AND project_id=?               │
    │                             └────────────────────────────────┘
    → useEventStore.setEvents(events)  (replaces memory store)
    Then WebSocket connects (Flow 12) → future events stream in
```

---

### 4.7 Subsystem 7 — Runtime API (External Developer Access)

**Processes:** P26 (API Key Authenticator), P3 (Rate Limiter), P22 (Workflow Engine), P24 (Event Engine)
**Data Stores:** DS10 (api_keys), DS9 (arch_workflows), DS3 (workflows), DS4 (applications), DS5 (events), DS16 (rate limit counters)

```
E2 (External Developer)
    │  DF32: POST /api/v1/applications
    │  Header: Authorization: Bearer sk_erp_v3_a1b2c3d4...
    │  Body:   { workflow_id: "wf-uuid", applicant_data: { score: 85, name: "Bob" } }
    ▼
P3 (Rate Limiter) — "authenticated" tier
    ├──── DF46 ──────────────────►┌────────────────────────────────┐
    │◄─── DF47 ───────────────────│ DS16: Rate Limit Counters      │
    │  > 1200/min → 429           │ key: orquestra:rl:user:{ip}    │
    │  ≤ 1200/min → continue      └────────────────────────────────┘
    ▼
P4 (CSRF Validator) — PATH starts with /api/v1/ → SKIPPED
    ▼
P26 (API Key Authenticator / apps/api/app/middleware/api_key_auth.py)
    │
    │  raw_key  = "sk_erp_v3_a1b2c3d4..."
    │  key_hash = SHA256("sk_erp_v3_a1b2c3d4...") → "7f3a9b..."
    │
    │  DF33: Lookup by hash
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── api_key record ─────────│ DS10: api_keys                 │
    │     { is_active, expires_at,│ WHERE key_hash = "7f3a9b..."   │
    │       institution_id,       │ AND is_active = true           │
    │       project_id,           └────────────────────────────────┘
    │       architecture_version_id }
    │
    │  is_active = false OR not found → 401
    │  expires_at < now           → 401 "API key expired"
    │  → VALID → update last_used_at
    │
    │  DF34: Load accessible workflows
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── accessible_workflow_ids─│ DS9: arch_workflows            │
    │     ["wf-uuid-1","wf-uuid-2"]│ WHERE architecture_version_id  │
    │                             │ = api_key.architecture_version_id│
    │                             └────────────────────────────────┘
    │
    │  DF35: RuntimeAuthContext {
    │    institution_id, project_id,
    │    architecture_version_id,
    │    accessible_workflow_ids: ["wf-uuid-1","wf-uuid-2"]
    │  }
    ▼
Route handler (apps/api/app/routes/runtime.py)
    │
    │  body.workflow_id IN accessible_workflow_ids?
    │  → NO  → 403 "Workflow not available in this architecture version"
    │  → YES →
    │
    │  DF37: Load workflow definition
    ├──── SELECT ────────────────►┌────────────────────────────────┐
    │◄─── definition + schema ────│ DS3: workflows                 │
    │                             │ WHERE id=? AND deployed=true   │
    │                             └────────────────────────────────┘
    │
    │  DF36: Create Application
    ├──── INSERT ────────────────►┌────────────────────────────────┐
    │                             │ DS4: applications              │
    │                             │ { workflow_id, applicant_data, │
    │                             │   current_state=initial_state, │
    │                             │   status="active",             │
    │                             │   submitted_at=now }           │
    │                             └────────────────────────────────┘
    │
    │  → P22 (Workflow Engine) → executes state machine
    │  → P24 (Event Engine)   → emits "application.submitted" + "workflow.transitioned"
    │
    │  Response 201:
    │  { application_id, workflow_id, current_state: "approved", status: "active" }
    ▼
E2 (External Developer) receives result
```

---

## Part 5 — Complete Data Store Reference

### DS1: users

| Attribute | Value |
|-----------|-------|
| **Written by** | P: auth.py (register), P7 (bcrypt hash) |
| **Read by** | P6 (JWT validate), P9 (RBAC check) |
| **Key columns** | `id, institution_id, email, password_hash, role, is_active` |
| **Unique constraint** | `(email, institution_id)` |
| **Retention** | Indefinite |

### DS3: workflows

| Attribute | Value |
|-----------|-------|
| **Written by** | P12 (blueprint deploy), P21 (template deploy), P30 (canvas deploy) |
| **Read by** | P10 (context enricher), P22 (workflow engine), P27 (design generator), P26 (runtime auth) |
| **Key columns** | `id, institution_id, project_id, name, version, definition (JSONB), is_ai_generated, ai_prompt, deployed, deployed_at` |
| **Unique constraint** | `(name, institution_id, project_id, version)` |
| **Immutability** | Once `deployed=true`, `definition` is never mutated |
| **Index** | GIN on `definition` (PostgreSQL), composite on `(institution_id, project_id)` |

### DS4: applications

| Attribute | Value |
|-----------|-------|
| **Written by** | P22 (workflow engine — INSERT on create, UPDATE on transitions) |
| **Read by** | P22 (load for execution), Route handlers (list/get) |
| **Key columns** | `id, institution_id, project_id, workflow_id, workflow_version, current_state, applicant_data (JSONB), status, submitted_at` |
| **State transitions** | Only `current_state` changes; `applicant_data` never mutated after creation |

### DS5: events

| Attribute | Value |
|-----------|-------|
| **Written by** | P24 (event engine — INSERT only) |
| **Read by** | REST GET /api/events (backfill), DF57 |
| **Key columns** | `id, type, version, timestamp, institution_id, project_id, data (JSONB)` |
| **Immutability** | **Append-only — never UPDATE or DELETE** |
| **Index** | Composite on `(institution_id, project_id, timestamp DESC)` |

### DS6: blueprint_proposals

| Attribute | Value |
|-----------|-------|
| **Written by** | P12 (blueprint validator — INSERT), deploy endpoint (UPDATE status) |
| **Read by** | GET /api/ai/blueprints/{id} (view proposal) |
| **Key columns** | `id, prompt, status (pending/validated/invalid/deployed), blueprint (JSONB), validation_result (JSONB), provider_used, is_mock, institution_id, project_id` |
| **Status transitions** | `pending → validated/invalid → deployed` |

### DS7: institution_architecture

| Attribute | Value |
|-----------|-------|
| **Written by** | P19 (graph operator), P20 (viz generator), P27 (design generator) |
| **Read by** | P18 (prompt factory reads current graph), P27 (design generator reads all domains) |
| **Key columns** | `id, institution_id, project_id, name, graph_json (JSONB), visualization_config (JSONB), version` |
| **Unique constraint** | `(institution_id, project_id)` — ONE architecture per project |
| **Race condition guard** | All graph mutations do one read + in-memory loop + one write (never parallel reads in same mutation) |

### DS9: arch_workflows (junction)

| Attribute | Value |
|-----------|-------|
| **Written by** | Compile endpoint (INSERT batch) |
| **Read by** | P26 (API key auth loads accessible workflow IDs) |
| **Key columns** | `id, architecture_version_id, workflow_id, workflow_version, display_order` |
| **Unique constraint** | `(architecture_version_id, workflow_id)` |
| **Purpose** | Defines which workflows are accessible to a compiled API key |

### DS10: api_keys

| Attribute | Value |
|-----------|-------|
| **Written by** | P25 (key generator — hashes only, never raw key) |
| **Read by** | P26 (API key authenticator) |
| **Key columns** | `id, institution_id, project_id, architecture_version_id, key_hash (SHA256), key_prefix, webhook_secret_hash, webhook_secret_prefix, is_active, expires_at, last_used_at` |
| **Security** | Raw key never stored. `key_hash = SHA256(raw_key)`. Prefix stored for display only. |

### DS15: AI Response Cache (Redis)

| Attribute | Value |
|-----------|-------|
| **Written by** | P11 (provider router — after successful Claude response) |
| **Read by** | P11 (cache check before every AI call) |
| **Key format** | `orquestra:ai:cache:<SHA256(prompt+context)>` |
| **Value** | Serialized blueprint JSON |
| **TTL** | 86400 seconds (24 hours) |
| **Eviction** | TTL-based; no LRU |
| **Fallback** | If Redis unavailable: no caching, every request hits Claude |

### DS16: Rate Limit Counters (Redis)

| Attribute | Value |
|-----------|-------|
| **Written by** | P3 (rate limiter — ZADD on every request) |
| **Read by** | P3 (ZCARD to check count) |
| **Key format** | `orquestra:rl:{tier}:{identifier}` e.g. `orquestra:rl:ai:192.168.1.1` |
| **Structure** | Redis Sorted Set (score = timestamp, value = request ID) |
| **Cleanup** | ZREMRANGEBYSCORE removes entries older than window on each check |
| **Fallback** | If Redis unavailable: rate limiting disabled, all requests pass |

### DS17: Event Streams (Redis)

| Attribute | Value |
|-----------|-------|
| **Written by** | P24 (event engine — XADD) |
| **Read by** | WebSocket hub (future: XREAD for replay) |
| **Key format** | `events:{institution_id}:{project_id}` |
| **Max length** | 20,000 entries (approximate trim) |
| **Fallback** | If Redis unavailable: skipped silently, events still in DS5 (PostgreSQL) |

### DS18: Project Context (localStorage)

| Attribute | Value |
|-----------|-------|
| **Written by** | P29 (Zustand useProjectContextStore) on project switch |
| **Read by** | P29 (ConsoleProvider on mount to restore session) |
| **Key** | `orquestra-project-context` |
| **Value** | `{ projectId, projectName, institutionId, institutionName, environment }` |
| **Cleared when** | User logs out, or institution_id mismatch detected on bootstrap |

### DS20: Auth Cookies (HttpOnly)

| Attribute | Value |
|-----------|-------|
| **Written by** | P1 (Next.js proxy — Set-Cookie on login response) |
| **Read by** | P1 (proxy reads on every request, attaches as Authorization header) |
| **Cookies** | `admitflow_access_token` (7-day JWT), `refresh_token` (30-day JWT) |
| **Security** | HttpOnly (cannot be read by JS), Secure in prod, SameSite=Lax |

### DS21: CSRF Cookie

| Attribute | Value |
|-----------|-------|
| **Written by** | FastAPI security_middleware (sets on first response if absent) |
| **Read by** | Browser JS → sent as `X-CSRF-Token` header; P4 compares to cookie value |
| **Cookie** | `csrf_token` = `secrets.token_urlsafe(24)` |
| **Security** | NOT HttpOnly (must be readable by JS to echo in header) |

### DS22: Event Memory Store (Zustand)

| Attribute | Value |
|-----------|-------|
| **Written by** | P29 (pushEvent from WebSocket), P29 (setEvents from REST backfill) |
| **Read by** | /console/events page renderer |
| **Max size** | 400 events (oldest dropped) |
| **Deduplication** | By event `id` field |
| **Cleared when** | Project changes in console |

---

## Part 6 — Cross-Cutting Data Flows

These data payloads flow through multiple subsystems and every developer touching the system must understand their exact shape.

### Tenant Context (injected into every authenticated request)

```
Source:  DS18 (localStorage) → console-api.ts → P1 (proxy) → HTTP headers
Shape:   X-Institution-Id: <uuid>
         X-Project-Id:     <uuid>
Used by: P8 (get_tenant_context) → TenantContext(institution_id, project_id)
         Every DB query: WHERE institution_id=? AND project_id=?
```

### JWT Claims (decoded on every authenticated request)

```
Source:  DS20 (access_token HttpOnly cookie) → P1 (proxy) → Authorization header → P6
Shape:   { sub: user_id, institution_id, role: "owner", type: "access", exp }
Used by: P6 → returns User object
         P9 → uses user.role to check permissions against DS13
         P8 → checks user.institution_id == tenant.institution_id (cross-tenant guard)
```

### CSRF Token (sent on every console mutation)

```
Source:  DS21 (csrf_token cookie, readable) → JS reads document.cookie → X-CSRF-Token header
         P4 reads both cookie and header, compares them
Shape:   Random UUID string (secrets.token_urlsafe(24))
Scope:   All POST/PUT/PATCH/DELETE to /api/* except /api/v1/*
Bypass:  /api/v1/* uses API key auth instead (runtime API)
```

### Event Payload (emitted by every state-changing operation)

```
Source:  P22 (workflow transitions), P12 (blueprint deploy), P19 (arch ops), P25 (compile)
Shape:   {
           id:             "<uuid>",
           type:           "application.reviewed",
           version:        "1.0",
           timestamp:      "2026-07-01T12:00:00",
           institution_id: "<uuid>",
           project_id:     "<uuid>",
           data:           { ...operation-specific fields }
         }
Destinations: DS5 (permanent), DS17 (stream, 24h), DS22 (in-memory, 400 max)
```

### Blueprint JSON (flows through Mode A pipeline)

```
Source:  E3 (Claude) or mock fallback
Shape:   {
           workflow: {
             name:          "snake_case_name",
             initial_state: "state_name",
             states: {
               "<name>": { type: "initial|intermediate|terminal",
                           transitions: [{ to, condition, emit_event }] }
             },
             schema: { fields: [{ name, type, required, min?, max?, enum?, format? }] }
           },
           roles:           [{ name, permissions: ["resource:action"] }],
           events:          [{ type: "domain.event_name", version: "1.0" }],
           compliance_tags: ["ferpa"]
         }
Transformations:
  P11 → raw JSON
  P12 → + validation_result
  DS6  → stored as blueprint_proposals.blueprint
  DS3  → stored as workflows.definition (after deploy)
```

### API Key (generated once, hashed for storage)

```
Source:   P25 (api_key_utils.generate_api_key)
Raw key:  "sk_erp_v{version}_{secrets.token_hex(16)}"   e.g. "sk_erp_v3_a1b2c3d4e5f6..."
Stored:   SHA256(raw_key) → DS10.key_hash
Displayed: raw_key[:16] + "..." → DS10.key_prefix (for UI identification)
Shown to: E1 (Console User) — ONCE at compile time, then never again
Used by:  E2 (External Developer) → Authorization: Bearer <raw_key>
          P26 → SHA256(header_value) == DS10.key_hash → authenticated
```

### Graph JSON (domain model living in DS7)

```
Source:   Seeded as empty on first POST /api/architect
          Mutated by P19 on every domain/link/integration operation
Shape:    {
            "erp_system": {
              "domains": [
                {
                  "id":            "admissions",
                  "label":         "Admissions",
                  "color":         "#3b82f6",
                  "workflow_id":   "wf-uuid",        ← set after link
                  "workflow_name": "admissions_wf"   ← set after link
                }
              ],
              "integrations": [
                { "from_domain": "admissions", "to_domain": "fee_management",
                  "type": "data", "label": "triggers payment" }
              ]
            }
          }
Immutability: Each compile snapshots graph_json into DS8 (architecture_versions.graph_snapshot)
```
