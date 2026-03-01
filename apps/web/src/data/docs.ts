export type DocSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  code?: string;
};

export type DocPage = {
  path: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: DocSection[];
};

export type DocNavGroup = {
  label: string;
  items: Array<{ label: string; href: string }>;
};

export const DOC_NAV_GROUPS: DocNavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs/introduction" },
      { label: "Setup", href: "/docs/setup" },
    ],
  },
  {
    label: "Core Runtime",
    items: [
      { label: "Workflow Engine", href: "/docs/workflow-engine" },
      { label: "Tech Stack", href: "/docs/tech-stack" },
      { label: "Architecture", href: "/docs/architecture" },
    ],
  },
  {
    label: "Platform Safety",
    items: [
      { label: "Security", href: "/docs/security" },
      { label: "API Reference", href: "/docs/api-reference" },
    ],
  },
];

const INTRODUCTION_PAGE: DocPage = {
  path: "/docs/introduction",
  title: "Orquestra Docs",
  description: "Institutional workflow infrastructure for deterministic, event-native execution.",
  updatedAt: "February 25, 2026",
  sections: [
    {
      id: "what-is-orquestra",
      title: "What is Orquestra?",
      paragraphs: [
        "Orquestra is infrastructure, not ERP software and not a student-facing product.",
        "It provides a headless runtime where institutional workflows are represented as deterministic state machines with explicit versioning.",
      ],
      bullets: [
        "Headless-first API architecture",
        "Event-native execution model",
        "Human-approved deployment",
        "AI structural compilation",
      ],
    },
    {
      id: "three-surface-model",
      title: "Three-Surface Model",
      paragraphs: [
        "Surface 1 is the authority layer at orquestra.dev for routing users.",
        "Surface 2 is the control plane at /console for projects, workflows, AI compile, validation, and deploy.",
        "Surface 3 is the runtime and API platform with FastAPI, PostgreSQL, Redis, and WebSocket streams.",
      ],
    },
    {
      id: "platform-invariants",
      title: "Platform Invariants",
      paragraphs: [
        "Frontend behavior must mirror backend contracts. Validation and deployment rules cannot be bypassed from UI.",
      ],
      bullets: [
        "Deployed workflows are immutable",
        "Every transition emits an event",
        "AI output passes 4-stage validation",
        "Tenant isolation is enforced at API and DB layers",
        "No dynamic code execution",
      ],
    },
  ],
};

const SETUP_PAGE: DocPage = {
  path: "/docs/setup",
  title: "Setup",
  description: "Bootstrap Orquestra frontend and backend with tenant-safe defaults.",
  updatedAt: "February 25, 2026",
  sections: [
    {
      id: "requirements",
      title: "Requirements",
      paragraphs: [
        "Use Next.js 14 App Router for frontend and FastAPI 3.11 runtime for backend.",
        "PostgreSQL 15 and Redis 7 are required for deterministic persistence and event streaming.",
      ],
      bullets: [
        "Node.js 20+",
        "Python 3.11",
        "PostgreSQL 15",
        "Redis 7",
      ],
    },
    {
      id: "environment",
      title: "Environment Variables",
      paragraphs: [
        "Frontend should only call backend through /api proxy routes so bearer tokens remain in secure cookies.",
      ],
      code: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000\nNEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000`,
    },
    {
      id: "security-baseline",
      title: "Security Baseline",
      paragraphs: [
        "Use httpOnly cookies for access/refresh tokens. Do not store auth tokens in localStorage.",
        "Enforce project and institution scoping on every request header and websocket subscription.",
      ],
    },
  ],
};

const WORKFLOW_ENGINE_PAGE: DocPage = {
  path: "/docs/workflow-engine",
  title: "Workflow Engine",
  description: "Deterministic state-machine execution with safe condition parsing.",
  updatedAt: "February 25, 2026",
  sections: [
    {
      id: "definition-model",
      title: "WorkflowDefinition Contract",
      paragraphs: [
        "Workflow definitions are JSON objects with initial state and named states map.",
        "Transitions are explicit and can optionally emit event types.",
      ],
      code: `export interface WorkflowDefinition {\n  id?: string;\n  name?: string;\n  version?: string;\n  initial_state: string;\n  states: Record<string, WorkflowState>;\n}`,
    },
    {
      id: "determinism-rules",
      title: "Determinism Rules",
      paragraphs: [
        "No eval, no dynamic code execution, and no client-side transition simulation.",
      ],
      bullets: [
        "Recursive descent parser for conditions",
        "No function calls in conditions",
        "No deep dynamic property access",
        "Terminal states required",
      ],
    },
    {
      id: "versioning",
      title: "Versioning",
      paragraphs: [
        "Applications pin workflow_id and workflow_version to preserve deterministic execution after upgrades.",
        "Deploying creates new immutable versions instead of mutating existing rows.",
      ],
    },
  ],
};

const TECH_STACK_PAGE: DocPage = {
  path: "/docs/tech-stack",
  title: "Technical Stack",
  description: "FastAPI + PostgreSQL + Redis + Next.js runtime architecture.",
  updatedAt: "February 25, 2026",
  sections: [
    {
      id: "service-architecture",
      title: "Service Architecture",
      paragraphs: [
        "API routes call service layer, which invokes workflow, schema, event, and RBAC engines.",
        "Runtime persistence is PostgreSQL plus Redis stream fanout with WebSocket broadcasts.",
      ],
    },
    {
      id: "frontend-architecture",
      title: "Frontend Architecture",
      paragraphs: [
        "Console uses Next.js App Router with scoped routes under /console/*.",
        "Zustand stores maintain auth, project context, workflows, events, and AI drafts.",
      ],
      bullets: [
        "Persist workflow list",
        "Do not persist AI drafts across projects",
        "Always display institution/project/environment context",
      ],
    },
    {
      id: "performance-targets",
      title: "Performance Targets",
      paragraphs: [
        "Workflow execution target is under 50ms with stateless engine calls.",
        "UI uses skeleton states and deterministic refresh paths for runtime confidence.",
      ],
    },
  ],
};

const SECURITY_PAGE: DocPage = {
  path: "/docs/security",
  title: "Security",
  description: "Frontend and runtime security controls derived from sec-check.md.",
  updatedAt: "February 25, 2026",
  sections: [
    {
      id: "frontend-security",
      title: "Frontend Security",
      paragraphs: [
        "Use React-safe rendering and avoid dangerouslySetInnerHTML.",
        "Require SameSite cookies and CSRF protections for state-changing routes.",
      ],
      bullets: [
        "No tokens in localStorage",
        "Restrict CORS to console domain",
        "Content-Security-Policy and frame-ancestors none",
      ],
    },
    {
      id: "tenant-security",
      title: "Tenant Isolation",
      paragraphs: [
        "Every request and event subscription must include institution_id and project_id scope.",
      ],
      bullets: [
        "RBAC checks on every endpoint",
        "Row-level security in PostgreSQL",
        "Reject cross-tenant websocket subscriptions",
      ],
    },
    {
      id: "ai-safety",
      title: "AI Safety",
      paragraphs: [
        "AI output is accepted only via strict function-calling contracts and 4-stage validation.",
        "Deploy button remains blocked when any validation stage fails.",
      ],
    },
  ],
};

const API_REFERENCE_PAGE: DocPage = {
  path: "/docs/api-reference",
  title: "API Reference",
  description: "Control-plane API endpoints and deployment flow contracts.",
  updatedAt: "February 25, 2026",
  sections: [
    {
      id: "auth-endpoints",
      title: "Authentication",
      paragraphs: [
        "Login exchanges credentials for access and refresh tokens stored in secure cookies.",
      ],
      code: `POST /api/auth/login\nPOST /api/auth/logout\nGET /api/auth/me`,
    },
    {
      id: "runtime-endpoints",
      title: "Runtime Endpoints",
      paragraphs: [
        "Project-scoped routes expose workflows, applications, and events.",
      ],
      code: `GET /api/projects\nGET /api/workflows\nGET /api/events?limit=200\nPOST /api/applications/{id}/transition`,
    },
    {
      id: "ai-endpoints",
      title: "AI Compile and Deploy",
      paragraphs: [
        "Blueprint compilation and deployment are split endpoints with mandatory re-validation on deploy.",
      ],
      code: `POST /api/ai/compile\nPOST /api/ai/deploy/{proposalId}`,
    },
  ],
};

const ARCHITECTURE_PAGE: DocPage = {
  path: "/docs/architecture",
  title: "Architecture",
  description: "Cross-layer sequence model from compile to deployment to event streaming.",
  updatedAt: "February 25, 2026",
  sections: [
    {
      id: "compile-sequence",
      title: "Compile Sequence",
      paragraphs: [
        "Prompt is compiled by AI, validated in 4 stages, then exposed for human review.",
      ],
      bullets: [
        "Schema validation",
        "Graph integrity check",
        "Permission analysis",
        "Compliance check",
      ],
    },
    {
      id: "deploy-sequence",
      title: "Deploy Sequence",
      paragraphs: [
        "Deploy executes only after explicit confirmation and backend re-validation.",
      ],
      bullets: [
        "Persist workflow and role definitions",
        "Emit ai.blueprint.deployed event",
        "Redirect to workflow detail with version visibility",
      ],
    },
    {
      id: "event-sequence",
      title: "Event Streaming Sequence",
      paragraphs: [
        "Transition events persist to PostgreSQL, then stream via Redis to WebSocket clients.",
        "Console event store updates in real time with institution and project scoping.",
      ],
    },
  ],
};

export const DOC_PAGES: Record<string, DocPage> = {
  "/docs": INTRODUCTION_PAGE,
  [INTRODUCTION_PAGE.path]: INTRODUCTION_PAGE,
  [SETUP_PAGE.path]: SETUP_PAGE,
  [WORKFLOW_ENGINE_PAGE.path]: WORKFLOW_ENGINE_PAGE,
  [TECH_STACK_PAGE.path]: TECH_STACK_PAGE,
  [SECURITY_PAGE.path]: SECURITY_PAGE,
  [API_REFERENCE_PAGE.path]: API_REFERENCE_PAGE,
  [ARCHITECTURE_PAGE.path]: ARCHITECTURE_PAGE,
};

export function resolveDoc(pathname: string): DocPage {
  return DOC_PAGES[pathname] || INTRODUCTION_PAGE;
}
