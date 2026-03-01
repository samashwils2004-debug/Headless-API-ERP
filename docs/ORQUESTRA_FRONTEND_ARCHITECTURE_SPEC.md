# ORQUESTRA CONSOLE — FRONTEND ARCHITECTURE SPEC (FAS)
## Version 1.0 | Control Plane Interface for Institutional Infrastructure

---

## TABLE OF CONTENTS

1. [Frontend Philosophy Layer](#1-frontend-philosophy-layer)
2. [Console User Roles](#2-console-user-roles)
3. [Backend → UI Surface Mapping](#3-backend--ui-surface-mapping)
4. [Console Navigation Model](#4-console-navigation-model)
5. [Page Responsibility Specification](#5-page-responsibility-specification)
6. [State Ownership Model](#6-state-ownership-model)
7. [Frontend Data Flow Diagrams](#7-frontend-data-flow-diagrams)
8. [Component Architecture Tree](#8-component-architecture-tree)
9. [Navigation–State Coupling Rules](#9-navigationstate-coupling-rules)
10. [API Contract Mapping](#10-api-contract-mapping)
11. [UI Consistency Rules](#11-ui-consistency-rules)
12. [Error & Degraded Mode UX](#12-error--degraded-mode-ux)
13. [Frontend–Backend Evolution Policy](#13-frontendbackend-evolution-policy)
14. [Component Responsibility Matrix](#14-component-responsibility-matrix)
15. [State Ownership Chart](#15-state-ownership-chart)

---

## 1. Frontend Philosophy Layer

### The Console Is a Control Plane

The Orquestra Console is not a product UI. It is not an admin panel. It is not a form-based SaaS dashboard.

**The Orquestra Console is a control plane — a visualization interface for institutional infrastructure state.**

```
The console never executes workflows.
The console never owns institutional truth.
The console visualizes backend state.
The console triggers backend operations, it does not perform them.
The backend remains authoritative at all times.
```

These are not conventions. They are invariants. Every frontend decision — component design, routing structure, state management, API call placement — must be evaluated against them.

### Design System Philosophy

Orquestra inherits from the **Next.js / Linear design language**: dark-first, developer-oriented, infrastructure-focused. Not Stripe (no light-mode-first, no consumer polish). Not Vercel (no marketing warmth). The console communicates precision, observability, and control.

```
Design Vocabulary:
  Background:  #0f0f12 / #141416 / #18181c / #1f1f24
  Accent:      #e4e4e7 (default) / #ffffff (hover)
  Text:        #f4f4f5 / #b4b4bb / #8a8a94
  Borders:     #1c1c22 / #25252b / #2f2f36
  Success:     #4ade80
  Warning:     #fbbf24
  Error:       #f87171
  Info:        #60a5fa
  Code font:   JetBrains Mono
  Body font:   Inter
```

### Console Scope Boundary

The console operates **only within** these boundaries:

| In Scope | Out of Scope |
|----------|--------------|
| Visualizing workflow state | Executing workflow transitions |
| Generating AI blueprints | Auto-deploying without human confirmation |
| Composing ERP architecture graph | Mutating institutional records |
| Viewing event stream | Replaying or injecting events |
| Managing API keys | Bypassing RBAC server-side |
| Compiling architecture versions | Editing deployed (immutable) workflows |

---

## 2. Console User Roles

The console serves four distinct user types. The UI must not drift toward serving any role that does not appear in this table.

| Role | Primary Goal | Console Surfaces Used |
|------|-------------|----------------------|
| **Developer** | Design and deploy institutional workflow infrastructure | All pages — primary user |
| **Institutional IT** | Observe system behavior and event flow | Dashboard, Event Stream, Workflows (read-only) |
| **Integrator** | Obtain versioned API credentials and understand API surfaces | API Keys, Architect → API Surfaces, Docs |
| **Operator** | Monitor execution health, active workflows, event volumes | Dashboard, Event Stream, Workflows |

**Who the console is NOT for:**

- Applicants submitting applications (that is a product built *on* Orquestra)
- Admissions officers reviewing applications (same as above)
- Finance teams processing fees (same as above)
- General administrators managing users or org settings

If any page design starts to serve the above, it has drifted into application territory. Revert it.

---

## 3. Backend → UI Surface Mapping

This is the navigation truth table. Every UI surface derives from a backend entity or domain boundary. No UI-only pages exist.

| Backend Entity / Endpoint | UI Surface | Console Route |
|--------------------------|------------|---------------|
| `institutions` | Project selector (implicit) | Global context bar |
| `projects` | Project switcher dropdown | `/console/projects` |
| `workflows` | Workflow list + detail + editor | `/console/workflows` |
| `applications` | Applications list within workflow | `/console/workflows/:id` (tab) |
| `events` | Live event stream + history | `/console/events` |
| `api_keys` | API Keys management page | `/console/api-keys` |
| `templates` | Template gallery + deploy modal | `/console/templates` |
| `blueprint_proposals` | AI Generator → Blueprint Preview | `/console/ai` |
| `institution_architectures` | Architect Canvas | `/console/architect` |
| `architecture_versions` | Version History panel (within Architect) | `/console/architect/:id?version=N` |
| `compiled_package` | API Surfaces panel (within Architect) | `/console/architect/:id/surfaces` |
| `/api/dashboard/metrics` | Dashboard metrics cards | `/console` |
| `/api/dashboard/activity` | Recent Activity feed | `/console` |

**Rule:** If a backend entity exists, there must be a UI surface that exposes it. If no backend entity exists, no UI surface should be invented for it.

---

## 4. Console Navigation Model

### 4.1 Global Navigation Hierarchy

```
Console Root
│
├── Dashboard                    /console
├── Projects                     /console/projects
├── Templates                    /console/templates
├── Workflows                    /console/workflows
│     └── [Workflow Detail]      /console/workflows/:id
│           └── [Edit]           /console/workflows/:id/edit
│
├── AI Generator                 /console/ai
│     └── [Blueprint Preview]    /console/ai (state transition, not route)
│
├── Event Stream                 /console/events
│
├── API Keys                     /console/api-keys
│
├── Architect ⭐                  /console/architect
│     ├── ERP Canvas             /console/architect (default view)
│     ├── Version History        /console/architect/:id?version=N
│     ├── Compile & Deploy       /console/architect/:id/compile (modal, not route)
│     └── API Surfaces           /console/architect/:id/surfaces
│
└── Settings                     /console/settings
      ├── Project Settings       /console/settings/project
      ├── Team                   /console/settings/team
      ├── Display (theme)        /console/settings/display
      └── Billing                /console/settings/billing
```

### 4.2 Navigation Principles

- Every sidebar item corresponds to exactly one backend domain boundary
- No sidebar item exists that does not map to a backend entity or API
- The Architect section is collapsible — it is the IAL addition and should not dominate the sidebar for users who haven't created an architecture yet
- Settings → Display is where the optional light mode toggle lives (dark is default and primary)

### 4.3 Sidebar Component Structure

```
ConsoleSidebar (260px fixed)
│
├── Logo (top)
├── ProjectSwitcher (dropdown, shows institution + project)
│
├── Primary Navigation
│     ├── Dashboard
│     ├── Projects
│     ├── Templates
│     ├── Workflows
│     ├── AI Generator
│     ├── Event Stream
│     └── API Keys
│
├── ──── divider ────
│
├── Architect (collapsible group)
│     ├── ERP Canvas
│     ├── Version History
│     └── API Surfaces
│
├── ──── divider ────
│
└── Footer Navigation
      ├── Settings
      ├── Docs (external link)
      └── User Menu (avatar + logout)
```

### 4.4 Context Bar (60px, top)

```
ContextBar
│
├── Left: Page title + breadcrumb
├── Center: (empty or page-specific action bar)
└── Right: Institution badge + Project badge + version indicator (if on Architect)
```

The context bar always shows which institution and project the developer is operating within. This is the multi-tenant anchor visible on every console page.

---

## 5. Page Responsibility Specification

Each page is defined as a **state consumer** — it reads from the backend, triggers operations, and displays results. It never owns or mutates the underlying institutional data.

---

### 5.1 Dashboard — `/console`

**Purpose:** Developer observability surface. API usage, workflow health, recent events, quick actions.

**Backend Dependencies:**
```
GET /api/dashboard/metrics
GET /api/dashboard/activity
GET /api/keys (for widget display)
WebSocket /events/stream (mini feed, last 10)
```

**Responsibilities:**
```
✅ Display API call volume (Recharts line chart)
✅ Display active workflow count + avg execution time
✅ Display last 10 events (auto-refresh via WebSocket)
✅ Display active API keys widget (test vs live)
✅ Provide quick action links (Deploy Template, Generate with AI, Create Key)
```

**Forbidden:**
```
❌ Execute workflow transitions
❌ Modify any entity
❌ Display institution-level business metrics (accept rates, student counts)
```

---

### 5.2 Projects — `/console/projects`

**Purpose:** Show all projects within the current institution. Allow switching project context.

**Backend Dependencies:**
```
GET /api/projects
POST /api/projects (create)
```

**Responsibilities:**
```
✅ List projects with name, created date, workflow count
✅ Allow project creation
✅ Set active project context in Zustand (ProjectStore)
```

**Forbidden:**
```
❌ Manage team members or permissions (that is Settings → Team)
❌ Delete projects with active workflows without confirmation
```

---

### 5.3 Templates — `/console/templates`

**Purpose:** Browse pre-built workflow templates. Preview and deploy them.

**Backend Dependencies:**
```
GET /api/templates?category=...
POST /api/templates/:id/deploy
```

**Responsibilities:**
```
✅ Display template grid with search and category filters
✅ Show template metadata: name, description, compliance tags, rating
✅ Preview modal: show template workflow graph + JSON
✅ Deploy flow: select project → confirm → POST deploy → navigate to Workflows
```

**Forbidden:**
```
❌ Edit template definitions (templates are read-only gallery items)
❌ Rate or review templates (future feature)
```

---

### 5.4 Workflows — `/console/workflows`

**Purpose:** View, manage, and edit deployed workflow definitions.

**Backend Dependencies:**
```
GET /api/workflows
GET /api/workflows/:id
GET /api/workflows/:id/analytics
PATCH /api/workflows/:id (draft edits only — creates new version)
DELETE /api/workflows/:id (soft delete, requires no active applications)
```

**Responsibilities:**
```
✅ Table view: name, version, AI-generated badge, status, created date
✅ Workflow Detail tabs: Overview | Definition (Monaco) | Applications | Version History
✅ Edit flow: Monaco JSON editor + live validation panel (mirrors 4-stage backend)
✅ Version History: list of versions, diff viewer
```

**Forbidden:**
```
❌ Edit deployed (active) workflow definitions in-place
   → Must create a new version via explicit "New Version" action
❌ Execute transitions or advance application state
❌ Delete workflows with active (non-terminal) applications
```

**Critical UX Constraint:**  
The Monaco editor on the Definition tab is **read-only** by default. Editing is explicitly enabled by clicking "Edit Blueprint" — which creates a draft. The version badge must update to reflect draft state. Deploying the draft creates a new immutable version. This maps directly to the `draft → validated → deployed` lifecycle in the backend.

---

### 5.5 AI Generator — `/console/ai`

**Purpose:** Generate workflow blueprints from natural language. The most critical demo surface.

**Backend Dependencies:**
```
POST /api/ai/generate
GET /api/ai/blueprints/:id
POST /api/ai/blueprints/:id/deploy
```

**Responsibilities:**
```
✅ Prompt textarea with institution context (type, size, compliance tags)
✅ Loading skeleton state (3–5 seconds — never show blank screen)
✅ Blueprint Preview tabs:
     Tab 1: Overview (name, description, state/transition/role counts)
     Tab 2: Workflow Graph (SVG state machine visualization)
     Tab 3: JSON Blueprint (Monaco, read-only unless "Edit Blueprint")
     Tab 4: Validation Report (4-stage results with pass/warn/fail indicators)
     Tab 5: Roles & Permissions (table with conflict warnings)
✅ Action bar: Edit Blueprint | Deploy Blueprint | Cancel
✅ Generation History: last 5 generations for current project
```

**Forbidden:**
```
❌ Auto-deploy without user clicking Deploy
❌ Skip validation display — all 4 stages must be visible before Deploy is enabled
❌ Allow Deploy if any validation stage has errors (warnings = allowed, errors = blocked)
```

**Deploy Button State Logic:**
```
Schema errors      → Deploy DISABLED (red badge)
Graph errors       → Deploy DISABLED (red badge)
Permission errors  → Deploy DISABLED (red badge)
Compliance errors  → Deploy DISABLED (red badge)
All warnings only  → Deploy ENABLED with warning indicator
All passed         → Deploy ENABLED (green)
```

---

### 5.6 Event Stream — `/console/events`

**Purpose:** Real-time visibility into all events emitted by workflow execution within the current project.

**Backend Dependencies:**
```
WebSocket /events/stream?token=...&project_id=...
GET /api/events?limit=50 (initial load, then WebSocket takes over)
```

**Responsibilities:**
```
✅ Live connection indicator (red pulsing dot = connected)
✅ Event cards: type, timestamp, JSON payload (expandable)
✅ Pause / Resume / Clear controls
✅ Filter by event type (application.submitted, workflow.transitioned, etc.)
✅ Click event card → expand full JSON in right panel
✅ Virtualized list (never render all events in DOM — cap display at 100)
```

**Forbidden:**
```
❌ Replay or re-emit events
❌ Modify event data
❌ Subscribe to events from other projects (WebSocket scoped by project_id at backend)
```

---

### 5.7 API Keys — `/console/api-keys`

**Purpose:** Manage API credentials for integrating with Orquestra. Show version tags for ERP-scoped keys.

**Backend Dependencies:**
```
GET /api/keys
POST /api/keys
DELETE /api/keys/:id
```

**Responsibilities:**
```
✅ Separate sections: Test Keys | Live Keys
✅ Key card: masked key, name, environment, created date, last used, version_tag (if present)
✅ Create Key modal: name + environment selection
✅ Key reveal: shown ONCE on creation (same UX as Stripe/Vercel)
✅ Revoke confirmation modal
✅ Version badge display for ERP-scoped keys (erp_v1, erp_v2, etc.)
✅ Deprecation indicator for older versioned keys
```

**Forbidden:**
```
❌ Show full key value after initial creation reveal
❌ Auto-create keys on architecture compile without showing to user
   → Compile triggers a key to be generated; console then reveals it as new key creation flow
```

---

### 5.8 Architect — `/console/architect` ⭐

**Purpose:** Design, compose, and version the institution's ERP architecture through iterative NLP. Compile architecture to issue versioned API keys.

**Backend Dependencies:**
```
GET  /api/architect                      (list architectures for project)
POST /api/architect                      (create first architecture)
GET  /api/architect/:id                  (fetch with current graph)
POST /api/architect/:id/prompt           (apply NLP change)
GET  /api/architect/:id/versions         (list versions)
GET  /api/architect/:id/versions/:v/diff (visual diff)
POST /api/architect/:id/compile          (compile + issue key)
GET  /api/architect/:id/surfaces         (generated API endpoints)
```

**Sub-surfaces:**

| Sub-surface | Route | Purpose |
|------------|-------|---------|
| ERP Canvas | `/console/architect` | Domain graph + iterative prompt |
| Version History | `/console/architect/:id?version=N` | Historical view (read-only) |
| API Surfaces | `/console/architect/:id/surfaces` | Generated endpoint listing |

**Responsibilities:**
```
✅ Welcome screen with "Start with a prompt" CTA (when no architecture exists)
✅ Domain node graph: colored by status (draft / linked / deployed)
✅ Integration edges: SVG arrows with event trigger labels
✅ Prompt bar (bottom): type → Enter or Apply button → loading → graph updates
✅ Diff animation: highlight added/changed nodes after each prompt
✅ Version indicator in toolbar: "erp_v2 · compiled Dec 3 · 3 workflows linked"
✅ Version History panel: list of prompts used, diff summaries, timestamps
✅ Compile modal: confirm → show compiled package → reveal new API key
✅ API Surfaces panel: list of endpoints available for this architecture version
✅ Route to Blueprint Generator for any domain ("Generate blueprint for admissions")
✅ Cache/mock indicators on AI responses (subtle — not alarming)
```

**Forbidden:**
```
❌ Edit workflow definitions from this surface (navigate to Workflows for that)
❌ Execute any workflow logic
❌ Auto-compile on every prompt (compile is explicit user action)
❌ Delete architecture versions (versions are append-only)
❌ Show architecture from other projects
```

---

### 5.9 Settings — `/console/settings`

**Purpose:** Project configuration, team management, display preferences, billing.

**Responsibilities:**
```
✅ Project Settings: name, description, compliance tags
✅ Team: invite members, manage roles (RBAC-driven visibility)
✅ Display: theme toggle (dark default, light optional), density, font size
✅ Billing: plan tier display (no payment processing in console — link to billing portal)
```

**Forbidden:**
```
❌ Delete institution (enterprise support flow only)
❌ Manage RBAC role definitions (that is a backend admin operation)
```

---

## 6. State Ownership Model

This section defines who owns which state. Frontend failures almost always begin with state ownership violations.

### 6.1 The Golden Rule

```
Frontend NEVER mutates institutional state locally.
Optimistic display is permitted ONLY for UI feedback.
All institutional state is owned and authored by the backend.
```

### 6.2 State Ownership Table

| State Category | Examples | Owner | Frontend Role |
|----------------|----------|-------|---------------|
| Architecture graph | Domain nodes, integrations | **Backend** (institution_architectures) | Read-only display |
| Workflow definitions | States, transitions, conditions | **Backend** (workflows.definition JSONB) | Read + trigger edit |
| Workflow version | v1.0, v2.1, draft | **Backend** | Display only |
| Event records | All emitted events | **Backend** (events table) | Stream display |
| RBAC permissions | Who can do what | **Backend** (rbac_engine) | Conditional rendering only |
| API key metadata | Name, masked key, version_tag | **Backend** (api_keys) | Display + trigger create/revoke |
| Compiled package | Architecture → workflow mapping | **Backend** (architecture_versions) | Display only |
| Project context | Which project is active | **Frontend** (ProjectStore) | Zustand — persisted |
| Auth token | JWT | **Frontend** (AuthStore) | Zustand — httpOnly cookie |
| Layout state | Sidebar collapsed, active tab | **Frontend** | Local component state |
| Selected node | Highlighted domain on canvas | **Frontend** | Local component state |
| Canvas zoom/pan | Viewport position | **Frontend** | Local component state |
| Prompt input value | Typed but not submitted text | **Frontend** | Local component state |
| UI animations | Loading states, transitions | **Frontend** | Local component state |
| Temporary draft | Monaco editor unsaved changes | **Frontend** (WorkflowStore.draft) | Zustand — NOT persisted across projects |

### 6.3 Zustand Store Definitions

```typescript
// AuthStore
interface AuthStore {
  user: User | null
  token: string | null        // JWT — synced with httpOnly cookie
  institution: Institution | null
  login: (email, password) => Promise<void>
  logout: () => void
}

// ProjectStore
interface ProjectStore {
  projects: Project[]
  activeProject: Project | null
  setActiveProject: (project: Project) => void
  fetchProjects: () => Promise<void>
  // Persisted: yes (localStorage — survives page refresh)
}

// WorkflowStore
interface WorkflowStore {
  workflows: Workflow[]
  activeWorkflow: Workflow | null
  draft: WorkflowDefinition | null  // temporary edit — cleared on project switch
  validationResult: ValidationResult | null
  fetchWorkflows: () => Promise<void>
  setDraft: (definition: WorkflowDefinition) => void
  clearDraft: () => void
  // Persisted: workflows list yes, draft NO
}

// EventStore
interface EventStore {
  events: Event[]             // capped at 100 in memory
  isPaused: boolean
  isConnected: boolean
  pushEvent: (event: Event) => void
  pause: () => void
  resume: () => void
  clear: () => void
  // Persisted: NO (events are ephemeral in frontend)
}

// ArchitectStore
interface ArchitectStore {
  architectures: Architecture[]
  activeArchitecture: Architecture | null
  graph: ERPGraph | null
  versions: ArchitectureVersion[]
  isLoading: boolean
  lastDiff: ArchitectureDiff | null
  fromCache: boolean          // display cache indicator
  isMock: boolean             // display demo badge
  fetchArchitecture: (id: string) => Promise<void>
  applyPrompt: (id: string, prompt: string) => Promise<void>
  compile: (id: string) => Promise<{ apiKey: string; versionTag: string }>
  // Persisted: activeArchitecture ID yes, graph NO (always fetch from backend)
}
```

### 6.4 Persistence Rules

```
PERSISTED (survives page refresh + logout):
  ProjectStore.activeProject.id     ← developer should return to last project
  AuthStore.token                   ← session continuity

NOT PERSISTED (cleared on project switch or session end):
  WorkflowStore.draft               ← never carry draft across projects
  ArchitectStore.graph              ← always fetch fresh from backend
  EventStore.events                 ← events are live; history is on backend
  Any AI generation in progress     ← blueprints belong to projects, not sessions
```

---

## 7. Frontend Data Flow Diagrams

### 7.1 Architect Prompt Flow

```
User types in PromptBar
       ↓
[Enter] or [Apply] button
       ↓
ArchitectStore.applyPrompt(id, prompt)
       ↓
POST /api/architect/:id/prompt
       ↓
isLoading = true → Canvas shows loading overlay
       ↓
Backend:
  fetch existing graph
  → check Redis cache
  → cache hit → return immediately
  → cache miss → provider cascade (Gemini → Groq → Mock)
  → apply operation to graph
  → compute diff
  → store architecture_version row
  → return { graph, diff, version, rationale, from_cache }
       ↓
HTTP 200 response received
       ↓
ArchitectStore.graph = response.graph
ArchitectStore.lastDiff = response.diff
ArchitectStore.fromCache = response.from_cache
isLoading = false
       ↓
ERPCanvas re-renders
DomainNodes animate in (diff highlight, 300ms CSS transition)
VersionPanel updates to show new version
CacheIndicator shows if from_cache = true
```

### 7.2 Blueprint Generation Flow

```
User enters prompt in AIGeneratorPage
       ↓
[Generate Blueprint] button
       ↓
POST /api/ai/generate { prompt, context }
       ↓
isLoading = true → SkeletonUI renders (3–5 second wait UX)
       ↓
Backend: Gemini/Groq → function calling → 4-stage validation
       ↓
HTTP 200: { proposal_id, blueprint, validation }
       ↓
isLoading = false
BlueprintPreview renders with 5 tabs
Deploy button enabled/disabled based on validation.all_passed
       ↓
[Deploy Blueprint] (user action)
       ↓
POST /api/ai/blueprints/:id/deploy
       ↓
Re-validation spinner
Confirmation modal: "This will create workflow, roles, event definitions"
[Confirm] → HTTP 200
Toast notification: "Workflow deployed"
Navigate to /console/workflows/:new_id
```

### 7.3 Event Stream Flow

```
Component mount: EventsPage
       ↓
GET /api/events?limit=50 → initial load into EventStore
       ↓
EventStreamClient.connect(token, project_id)
WebSocket ws://api/events/stream
       ↓
EventStreamClient.on('event') → EventStore.pushEvent(event)
       ↓
EventStore: prepend to events[], cap array at 100
       ↓
EventList re-renders (virtualized — only visible items in DOM)
       ↓
Component unmount → EventStreamClient.disconnect()
                   EventStore.clear()
       ↓
Reconnect logic: if WS drops → 5s delay → reconnect
                             → backfill missed events via REST
```

### 7.4 Compile Architecture → Issue Versioned Key

```
User on Architect page clicks [Compile v3]
       ↓
CompileModal opens: shows pending domains, linked workflows, warning if any unlinked
       ↓
[Confirm Compile] → POST /api/architect/:id/compile
       ↓
Backend:
  resolve linked workflows into compiled_package
  create architecture_version row
  generate API key pair (raw_key, key_hash)
  store hashed key, version_tag on api_keys row
  update architecture.status = 'compiled'
  emit architecture.compiled event
  return { version_tag, api_key (raw, shown once), compiled_package }
       ↓
CompileModal → transitions to KeyRevealStep
Shows: "erp_v3 compiled · New API key issued (shown once)"
[Copy] button → copy raw key to clipboard
[Done] → modal closes
APIKeysPage (if navigated to) → shows new key with version badge
```

---

## 8. Component Architecture Tree

### 8.1 Full Tree

```
App (Next.js App Router)
│
├── ConsoleLayout          (apps/web/src/app/console/layout.tsx)
│     ├── ConsoleSidebar   (260px, fixed)
│     │     ├── Logo
│     │     ├── ProjectSwitcher
│     │     ├── NavItem (each page)
│     │     └── UserMenu
│     │
│     ├── ContextBar       (60px, top)
│     │     ├── PageBreadcrumb
│     │     ├── ActionBar (conditional)
│     │     └── ContextBadges (institution, project, version)
│     │
│     └── MainSurface      (flex-1, scrollable)
│           │
│           ├── DashboardPage
│           │     ├── MetricsGrid
│           │     │     └── MetricCard × 4
│           │     ├── QuickActions
│           │     ├── RecentActivityFeed
│           │     │     └── ActivityItem × N
│           │     └── APIKeysWidget
│           │
│           ├── ProjectsPage
│           │     ├── ProjectGrid
│           │     └── CreateProjectModal
│           │
│           ├── TemplatesPage
│           │     ├── TemplateSearch
│           │     ├── TemplateFilters
│           │     ├── TemplateGrid
│           │     │     └── TemplateCard × N
│           │     ├── TemplatePreviewModal
│           │     └── DeployTemplateModal
│           │
│           ├── WorkflowsPage
│           │     ├── WorkflowsTable
│           │     │     └── WorkflowRow × N
│           │     └── WorkflowDetailPage
│           │           ├── WorkflowHeader
│           │           ├── WorkflowTabs
│           │           │     ├── OverviewTab
│           │           │     ├── DefinitionTab (Monaco, read-only)
│           │           │     ├── ApplicationsTab
│           │           │     └── VersionHistoryTab
│           │           └── WorkflowEditPage
│           │                 ├── MonacoEditor
│           │                 └── ValidationPanel
│           │                       └── ValidationStage × 4
│           │
│           ├── AIGeneratorPage
│           │     ├── PromptForm
│           │     │     ├── PromptTextarea
│           │     │     ├── InstitutionContextPanel
│           │     │     │     ├── InstitutionTypeDropdown
│           │     │     │     ├── InstitutionSizeDropdown
│           │     │     │     └── ComplianceTagsMultiselect
│           │     │     └── GenerateButton
│           │     ├── GenerationHistory
│           │     └── BlueprintPreview (conditional)
│           │           ├── BlueprintTabs
│           │           │     ├── OverviewTab
│           │           │     ├── WorkflowGraphTab
│           │           │     │     └── WorkflowDiagram (SVG)
│           │           │     │           ├── StateNode × N
│           │           │     │           └── TransitionEdge × N
│           │           │     ├── JSONTab (Monaco)
│           │           │     ├── ValidationReportTab
│           │           │     │     └── ValidationStage × 4
│           │           │     └── RolesPermissionsTab
│           │           │           └── RolesTable
│           │           └── BlueprintActionBar
│           │                 ├── EditBlueprintButton
│           │                 ├── DeployBlueprintButton
│           │                 └── CancelButton
│           │
│           ├── EventsPage
│           │     ├── EventStreamHeader
│           │     │     ├── ConnectionIndicator
│           │     │     ├── PauseResumeButton
│           │     │     ├── ClearButton
│           │     │     └── EventTypeFilter
│           │     ├── EventList (virtualized)
│           │     │     └── EventCard × N (capped at 100)
│           │     └── EventDetailPanel (right side, conditional)
│           │
│           ├── APIKeysPage
│           │     ├── TestKeysSection
│           │     │     └── APIKeyCard × N
│           │     ├── LiveKeysSection
│           │     │     └── APIKeyCard × N
│           │     ├── CreateKeyModal
│           │     └── RevokeKeyModal
│           │
│           ├── ArchitectPage ⭐
│           │     ├── ArchitectSidebar
│           │     │     ├── ArchitectNavItems
│           │     │     └── CurrentVersionCard
│           │     └── ArchitectMain
│           │           ├── ArchitectToolbar
│           │           │     ├── VersionBadge
│           │           │     ├── PromptTriggerButton
│           │           │     └── CompileButton
│           │           ├── ERPCanvas
│           │           │     ├── DomainGraph (SVG layer)
│           │           │     │     ├── DomainNode × N
│           │           │     │     └── IntegrationEdge × N
│           │           │     ├── DomainNodeDetail (hover tooltip)
│           │           │     ├── LoadingOverlay (conditional)
│           │           │     └── PromptBar
│           │           ├── VersionHistoryPanel (drawer)
│           │           │     └── VersionHistoryItem × N
│           │           ├── CompileModal
│           │           │     ├── CompileConfirmStep
│           │           │     └── KeyRevealStep
│           │           └── APISurfacesPanel
│           │                 └── APIEndpointRow × N
│           │
│           └── SettingsPage
│                 ├── ProjectSettingsTab
│                 ├── TeamTab
│                 ├── DisplayTab (theme toggle)
│                 └── BillingTab
│
└── Shared Components  (apps/web/src/components/shared/)
      ├── Button (primary / secondary / ghost / destructive)
      ├── Card
      ├── Badge / Tag
      ├── Modal
      ├── Toast / Notification
      ├── Tabs
      ├── CodeBlock (syntax highlighted)
      ├── MonacoWrapper (lazy loaded)
      ├── SkeletonLoader
      └── ConfirmDialog
```

---

## 9. Navigation–State Coupling Rules

### 9.1 Routing Truth Table

| Route | State Loaded | View Mode | Writeable? |
|-------|-------------|-----------|------------|
| `/console` | `metrics`, `activity`, `keys` (widget) | Dashboard | No |
| `/console/workflows` | `workflows[]` | List | No |
| `/console/workflows/:id` | `workflow`, `applications`, `versions` | Detail | No (read-only tabs) |
| `/console/workflows/:id/edit` | `workflow.draft` | Editor | Yes (draft only) |
| `/console/ai` | `blueprint` (on generation) | Generator | Yes (generate + deploy) |
| `/console/events` | `events[]` (live) | Stream | No |
| `/console/api-keys` | `api_keys[]` | Keys list | Yes (create + revoke) |
| `/console/architect` | `architectures[]` or welcome | Canvas | Yes (prompt) |
| `/console/architect/:id` | `architecture.graph` | Canvas (specific) | Yes (prompt) |
| `/console/architect/:id?version=N` | `architecture_version` | Historical | **Read-only** |
| `/console/architect/:id/surfaces` | `compiled_package` | Surfaces list | No |

### 9.2 Version Query Parameter Rule

```
?version=N on any architect route → forces READ-ONLY mode

The PromptBar is hidden.
The CompileButton is hidden.
A banner shows: "Viewing historical version N — read only"
[View Current Version] link returns to /console/architect/:id
```

### 9.3 Project Context Switch Rule

```
When ProjectSwitcher changes active project:
  1. WorkflowStore.clearDraft()        ← never carry draft across projects
  2. ArchitectStore.reset()            ← clear graph, fetch fresh
  3. EventStore.clear()                ← events are project-scoped
  4. Navigate to /console              ← return to dashboard
  5. Re-fetch all page data with new project_id
```

### 9.4 Deep Link Behavior

```
/console/architect/:id
  → if architecture belongs to another project: 403 redirect to /console/architect
  → if architecture belongs to current project: load
  → if architecture does not exist: 404 redirect to /console/architect

/console/workflows/:id/edit
  → if workflow is deployed and has active applications: show warning modal
    "This workflow has N active applications. Editing creates a new version.
     Existing applications continue on their current version."
  → confirm → load editor with draft
```

---

## 10. API Contract Mapping

For every significant user action, the full contract from UI event to store update.

### Dashboard

| UI Action | API Call | Method | Response Shape | Store Updated | Re-render Trigger |
|-----------|----------|--------|----------------|---------------|-------------------|
| Page load | `/api/dashboard/metrics` | GET | `{ api_calls, workflows, events, avg_exec_ms }` | — (local) | MetricsGrid |
| Page load | `/api/dashboard/activity` | GET | `ActivityItem[]` | — (local) | ActivityFeed |
| WS connect | `/events/stream` | WS | `Event` stream | `EventStore.events` | RecentEvents widget |

### Workflows

| UI Action | API Call | Method | Response Shape | Store Updated | Re-render Trigger |
|-----------|----------|--------|----------------|---------------|-------------------|
| Page load | `/api/workflows` | GET | `Workflow[]` | `WorkflowStore.workflows` | WorkflowsTable |
| Click row | `/api/workflows/:id` | GET | `Workflow` | `WorkflowStore.activeWorkflow` | WorkflowDetail |
| Click Edit | — | — | — | `WorkflowStore.draft = workflow.definition` | MonacoEditor |
| Save draft | `/api/workflows/:id` | PATCH | `{ id, version, status: 'draft' }` | `WorkflowStore.activeWorkflow` | VersionBadge |
| Deploy draft | `/api/workflows/:id/deploy` | POST | `{ id, version, status: 'deployed' }` | `WorkflowStore.workflows` | Status badge |

### AI Generator

| UI Action | API Call | Method | Response Shape | Store Updated | Re-render Trigger |
|-----------|----------|--------|----------------|---------------|-------------------|
| Generate | `/api/ai/generate` | POST | `{ proposal_id, blueprint, validation }` | — (local state) | BlueprintPreview |
| Deploy | `/api/ai/blueprints/:id/deploy` | POST | `{ workflow_id, status }` | `WorkflowStore.workflows` | Toast + navigate |

### Architect

| UI Action | API Call | Method | Response Shape | Store Updated | Re-render Trigger |
|-----------|----------|--------|----------------|---------------|-------------------|
| Page load | `/api/architect` | GET | `Architecture[]` | `ArchitectStore.architectures` | Canvas or Welcome |
| First prompt | `/api/architect` | POST | `{ architecture_id, graph, version }` | `ArchitectStore.activeArchitecture` | ERPCanvas |
| Subsequent prompt | `/api/architect/:id/prompt` | POST | `{ graph, diff, version, rationale, from_cache }` | `ArchitectStore.graph`, `.lastDiff` | ERPCanvas + diff anim |
| Load versions | `/api/architect/:id/versions` | GET | `ArchitectureVersion[]` | `ArchitectStore.versions` | VersionHistoryPanel |
| View diff | `/api/architect/:id/versions/:v/diff` | GET | `ArchitectureDiff` | — (local) | DiffViewer |
| Compile | `/api/architect/:id/compile` | POST | `{ version_tag, api_key, compiled_package }` | `ArchitectStore` version, trigger key reveal | CompileModal → KeyReveal |
| Load surfaces | `/api/architect/:id/surfaces` | GET | `APIEndpoint[]` | — (local) | APISurfacesPanel |

### API Keys

| UI Action | API Call | Method | Response Shape | Store Updated | Re-render Trigger |
|-----------|----------|--------|----------------|---------------|-------------------|
| Page load | `/api/keys` | GET | `APIKey[]` | — (local) | KeysList |
| Create key | `/api/keys` | POST | `{ id, key (raw), name, environment, version_tag }` | — (local) | CreateModal → KeyReveal |
| Revoke key | `/api/keys/:id` | DELETE | `{ success: true }` | — (local splice) | KeysList |

---

## 11. UI Consistency Rules

These are system-wide UX invariants that mirror the backend invariants. Every page must follow them.

### Always Visible

```
✅ Institution name — always in ContextBar
✅ Active project — always in ContextBar + ProjectSwitcher
✅ Workflow version — always on WorkflowDetail header and WorkflowRow badge
✅ ERP version — always in ArchitectToolbar when on Architect page
✅ API key environment (test/live) — always on APIKeyCard
✅ Connection status — always on EventStream page (pulsing red dot or grey)
```

### Compile / Deploy Is Always Explicit

```
✅ Blueprint Deploy: requires user to click Deploy + confirm modal
✅ Architecture Compile: requires user to click Compile + confirm modal
✅ Key Issuance: triggered only by Compile — shown in reveal step after
❌ No auto-save that changes backend state
❌ No silent deployments
❌ No auto-compile on prompt application
```

### Validation Is Always Shown

```
✅ On Blueprint Preview: all 4 validation stages visible before Deploy is enabled
✅ On Workflow Editor: live validation panel mirrors backend (frontend non-authoritative)
✅ On Architecture Compile modal: list of linked vs unlinked domains shown
❌ Never hide validation results — even if all passed, show all four ✓
```

### Version Is Always the Source of Truth

```
✅ If a workflow has version v2.1, every place it appears shows "v2.1"
✅ If an API key is scoped to erp_v2, that badge appears on the key card
✅ Historical views (version query param) always show version badge prominently
✅ Draft state is always labeled "draft" — never shown as a real version
```

### Loading States

```
✅ Every async operation has a loading state — no blank screens, no flash of empty
✅ AI generation: skeleton UI (not spinner) — mimics result layout
✅ Architecture prompt: canvas loading overlay with subtle animated label
✅ Page transitions: existing content stays visible until new content ready
```

---

## 12. Error & Degraded Mode UX

The AI layer has graceful degradation built into the backend (Section 3 of Implementation Spec). The frontend must surface this without alarming the user.

### AI Response Source Indicators

```
from_cache = true  → show "· cached" in small monospace below rationale text
is_mock = true     → show "demo mode" amber badge in ArchitectToolbar
provider = "groq"  → no indicator (transparent to user)
provider = "gemini"→ no indicator (transparent to user)
```

### Backend Error States

| Error | HTTP Status | Frontend Behavior |
|-------|-------------|-------------------|
| AI rate limited (all providers) | 200 with `degraded: true` | Show mock result + amber toast: "Using demo response — AI providers at capacity" |
| Validation failed on deploy | 422 | Show validation results with errors highlighted, Deploy button disabled |
| Network error on prompt | Network failure | Retry button appears in PromptBar, error toast |
| WebSocket disconnect | — | Grey connection dot + "Reconnecting..." label, auto-retry every 5s |
| 401 Unauthorized | 401 | Redirect to `/login`, preserve intended destination in URL param |
| 403 Cross-project access | 403 | Redirect to `/console`, toast: "Access denied for this resource" |
| 429 Rate limit (API) | 429 | Toast: "Too many requests — please wait a moment", exponential retry in client |

### Never Do

```
❌ Show raw error stack traces to users
❌ Show "AI failed" or "generation error" without a fallback action
❌ Leave a loading spinner running indefinitely — 30s timeout → show error state
❌ Alert/modal for every validation warning (only block on errors, warn inline)
```

---

## 13. Frontend–Backend Evolution Policy

This section governs how the frontend evolves as the backend grows.

### Rules

1. **Backend changes precede frontend changes.** No frontend surface is built before the corresponding backend route exists or is specced. The FAS is updated when the backend API contract changes.

2. **Frontend never introduces new domain concepts.** If a concept doesn't exist in the backend data model (PRD, DB schema, or API routes), it does not appear as a UI element. Example: "teams" cannot appear in the sidebar until a `teams` table and `/api/teams` routes exist.

3. **All console surfaces derive from backend primitives.** The mapping table in Section 3 is the source of truth. Any new sidebar item requires a corresponding entry in that table before implementation begins.

4. **Validation logic is backend-authoritative.** Frontend validation in the Monaco editor and Blueprint Preview is informational only. The backend always re-validates on deploy. The UI must communicate this clearly: "Validation results shown are preliminary — backend re-validates on deploy."

5. **API contracts are versioned.** If a backend route changes its response shape, the corresponding store and component must be updated together in the same PR. Partial updates that leave stores out of sync with API responses are not permitted.

6. **No UI state that mirrors backend state without a sync mechanism.** If `WorkflowStore.workflows` caches the workflow list, there must be a re-fetch trigger (page focus, explicit refresh button, or WebSocket push) that keeps it current.

---

## 14. Component Responsibility Matrix

A quick-reference table for every significant component — what it renders, what it mutates, and what it never does.

| Component | Renders | Mutates | Never |
|-----------|---------|---------|-------|
| `ConsoleSidebar` | Navigation items, ProjectSwitcher | `ProjectStore.activeProject` (via switcher) | Fetches data |
| `ContextBar` | Page title, institution/project badges, version | Nothing | Nothing |
| `DashboardPage` | Metrics, activity, events widget, quick links | Nothing | Modifies any entity |
| `TemplateCard` | Template metadata, rating, preview/deploy buttons | Triggers `deployTemplate()` action | Edits template definition |
| `WorkflowsTable` | Workflow rows with status badges | Triggers navigate to detail | Executes transitions |
| `MonacoEditor` (workflow) | JSON definition, syntax highlighting | `WorkflowStore.draft` | Calls backend directly |
| `ValidationPanel` | 4 validation stages, pass/warn/fail per stage | Nothing | Blocks deploy independently (backend does) |
| `AIGeneratorPage` | Prompt form, generation history, blueprint preview | Triggers `generateBlueprint()`, `deployBlueprint()` | Auto-deploys |
| `WorkflowDiagram` | SVG state machine with nodes and edges | Nothing | Executes transitions |
| `BlueprintActionBar` | Edit / Deploy / Cancel buttons | Enables/disables Deploy based on validation | Bypasses validation |
| `EventList` | Virtualized list of EventCards (max 100) | Nothing | Replays or re-emits events |
| `EventCard` | Event type, timestamp, JSON preview | Nothing | Modifies event data |
| `APIKeyCard` | Masked key, metadata, version badge, revoke button | Triggers `revokeKey()` | Shows full key post-creation |
| `ERPCanvas` | Domain nodes, integration edges, loading overlay | Nothing (read display) | Edits workflow definitions |
| `DomainNode` | Node color by status, label, module count | Nothing | Executes anything |
| `IntegrationEdge` | SVG arrow, event trigger label | Nothing | Modifies integration |
| `PromptBar` | Text input, Apply button, cache/mock indicator | Triggers `applyPrompt()` | Compiles architecture |
| `VersionHistoryPanel` | List of version items with diff summaries | Triggers navigation to `?version=N` | Deletes versions |
| `CompileModal` | Domain resolution summary, confirm + key reveal steps | Triggers `compile()` | Skips confirmation |
| `APISurfacesPanel` | List of generated API endpoints for version | Nothing | Generates new endpoints |
| `ProjectSwitcher` | Dropdown of projects | `ProjectStore.activeProject`, clears dependent stores | Deletes projects |

---

## 15. State Ownership Chart

A visual summary of the complete state ownership model.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (authoritative)                       │
│                                                                 │
│  institution_architectures    workflows.definition              │
│  architecture_versions        events (all)                      │
│  compiled_package             api_keys (hashed)                 │
│  rbac_permissions             blueprint_proposals               │
│  validation_results                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ZUSTAND STORES (derived)                      │
│                                                                 │
│  AuthStore          ProjectStore         WorkflowStore           │
│  ├ user             ├ projects[]         ├ workflows[]           │
│  ├ token            └ activeProject      ├ activeWorkflow        │
│  └ institution        (persisted)        ├ draft (NOT persisted) │
│    (session only)                        └ validationResult      │
│                                                                 │
│  EventStore         ArchitectStore                              │
│  ├ events[]         ├ architectures[]                           │
│  ├ isPaused         ├ graph                                     │
│  └ isConnected      ├ versions[]                                │
│  (NOT persisted)    ├ lastDiff                                  │
│                     ├ fromCache                                 │
│                     └ isMock                                    │
│                     (graph NOT persisted)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │  React reactivity
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL COMPONENT STATE                        │
│                   (never leaves component)                      │
│                                                                 │
│  Selected canvas node        Sidebar collapsed state            │
│  Canvas zoom / pan           Active modal open/closed           │
│  Prompt input value          Active tab selection               │
│  Hover tooltip visibility    Animation state                    │
└─────────────────────────────────────────────────────────────────┘
```

---

*This document is the contract between backend runtime, console navigation, and user mental model. No page, component, or state decision should be made without consulting it. Update this document first when the backend API changes — then update the implementation.*
