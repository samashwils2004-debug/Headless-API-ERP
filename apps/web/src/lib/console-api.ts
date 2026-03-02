import { assertTenantContext } from "@/lib/enforcement/tenantGuard";
import type { DomainEvent, InstitutionalBlueprint, ValidationResult, WorkflowDefinition } from "@/types/contracts";

export type TenantContext = {
  institutionId: string;
  projectId: string;
};

export type WorkflowItem = {
  id: string;
  institution_id: string;
  project_id: string;
  name: string;
  version: number;
  definition: WorkflowDefinition;
  deployed: boolean;
  is_ai_generated: boolean;
};

export type EventItem = DomainEvent;

export type ApplicationItem = {
  id: string;
  institution_id: string;
  project_id: string;
  workflow_id: string;
  workflow_version: number;
  current_state: string;
  status: string;
  applicant_data: Record<string, unknown>;
  application_data: Record<string, unknown>;
};

export type CompileBlueprintResponse = {
  id: string;
  blueprint: InstitutionalBlueprint | Record<string, unknown>;
  validation_result: ValidationResult | null;
  status: string;
};

function headersForTenant(tenant: TenantContext, extra: Record<string, string> = {}) {
  assertTenantContext(tenant);
  const csrfToken =
    typeof document === "undefined"
      ? ""
      : document.cookie
          .split("; ")
          .find((entry) => entry.startsWith("csrf_token="))
          ?.split("=")[1] || "";

  return {
    "Content-Type": "application/json",
    "X-Institution-Id": tenant.institutionId,
    "X-Project-Id": tenant.projectId,
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    ...extra,
  };
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const detail = payload?.detail || "Request failed";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return payload as T;
}

export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  return parse<{ id: string; institution_id: string; email: string; name: string; role: string }>(response);
}

export async function listProjects(tenant: TenantContext) {
  const response = await fetch("/api/projects", {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ projects: Array<{ id: string; institution_id: string; name: string; slug: string; environment: "test" | "production" }> }>(response);
}

export async function createProject(tenant: TenantContext, payload: { name: string; slug: string; environment: "test" | "production" }) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify(payload),
  });
  return parse<{ id: string }>(response);
}

export async function listWorkflows(tenant: TenantContext) {
  const response = await fetch("/api/workflows", {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ workflows: WorkflowItem[] }>(response);
}

export async function createWorkflow(
  tenant: TenantContext,
  payload: { name: string; definition: Record<string, unknown>; is_ai_generated: boolean }
) {
  const response = await fetch("/api/workflows", {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify(payload),
  });
  return parse<WorkflowItem>(response);
}

export async function deployWorkflow(tenant: TenantContext, workflowId: string) {
  const response = await fetch(`/api/workflows/${workflowId}/deploy`, {
    method: "POST",
    headers: headersForTenant(tenant, { "Content-Type": "application/json" }),
  });
  return parse<WorkflowItem>(response);
}

export async function listApplications(tenant: TenantContext) {
  const response = await fetch("/api/applications", {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ applications: ApplicationItem[] }>(response);
}

export async function listEvents(tenant: TenantContext, limit = 200) {
  const response = await fetch(`/api/events?limit=${limit}`, {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ events: EventItem[] }>(response);
}

export async function compileBlueprint(
  tenant: TenantContext,
  payload: { prompt: string; institution_context: Record<string, unknown> }
) {
  const response = await fetch("/api/ai/compile", {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify(payload),
  });
  return parse<CompileBlueprintResponse>(response);
}

export async function deployBlueprint(tenant: TenantContext, proposalId: string) {
  const response = await fetch(`/api/ai/deploy/${proposalId}`, {
    method: "POST",
    headers: headersForTenant(tenant, { "Content-Type": "application/json" }),
  });
  return parse<{ name: string; definition: Record<string, unknown>; is_ai_generated: boolean }>(response);
}

// ── Template types ──────────────────────────────────────────────────────────

export type TemplateItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  compliance_tags: string[];
};

export type TemplateDetail = TemplateItem & {
  definition: Record<string, unknown>;
};

export type CustomizeResult = {
  customization_id: string;
  diff: {
    changed_conditions: Array<{ transition: string; before: string; after: string }>;
    added_states: string[];
    removed_states: string[];
    summary: string;
  };
  validation: {
    schema: { passed: boolean; errors: string[] };
    graph: { passed: boolean; errors: string[] };
    permissions: { passed: boolean; errors: string[] };
    compliance: { passed: boolean; errors: string[] };
    all_passed: boolean;
  };
  change_summary: string;
  is_mock: boolean;
};

// ── Architect types ─────────────────────────────────────────────────────────

export type ArchitectureItem = {
  id: string;
  institution_id: string;
  project_id: string;
  name: string;
  graph_json: Record<string, unknown>;
  visualization_config: Record<string, unknown>;
  version: number;
};

export type ArchitectureVersionItem = {
  id: string;
  architecture_id: string;
  version: number;
  prompt: string;
  diff_summary: string;
  created_at: string;
};

// ── Template API functions ───────────────────────────────────────────────────

export async function listTemplates(tenant: TenantContext, category?: string) {
  const url = category ? `/api/templates?category=${encodeURIComponent(category)}` : "/api/templates";
  const response = await fetch(url, {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ templates: TemplateItem[] }>(response);
}

export async function getTemplate(tenant: TenantContext, id: string) {
  const response = await fetch(`/api/templates/${id}`, {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<TemplateDetail>(response);
}

export async function deployTemplate(tenant: TenantContext, templateId: string) {
  const response = await fetch(`/api/templates/${templateId}/deploy`, {
    method: "POST",
    headers: headersForTenant(tenant),
  });
  return parse<{ id: string; name: string; version: number; message: string }>(response);
}

export async function customizeTemplate(tenant: TenantContext, id: string, instruction: string) {
  const response = await fetch(`/api/templates/${id}/customize`, {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify({ instruction }),
  });
  return parse<CustomizeResult>(response);
}

// ── Architect API functions ──────────────────────────────────────────────────

export async function getOrCreateArchitecture(tenant: TenantContext): Promise<ArchitectureItem> {
  const listRes = await fetch("/api/architect", {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  const listData = await parse<{ architectures: ArchitectureItem[] }>(listRes);
  if (listData.architectures.length > 0) {
    return listData.architectures[0];
  }
  const createRes = await fetch("/api/architect", {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify({ name: "Institutional ERP" }),
  });
  return parse<ArchitectureItem>(createRes);
}

export async function applyArchitectPrompt(tenant: TenantContext, archId: string, prompt: string) {
  const response = await fetch(`/api/architect/${archId}/prompt`, {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify({ prompt }),
  });
  return parse<{
    intent: string;
    confidence: number;
    message: string;
    suggested_action: string;
    pre_fill_prompt: string;
    architecture: ArchitectureItem | null;
    diff_summary: string;
    is_mock: boolean;
  }>(response);
}

export async function linkWorkflowToDomain(
  tenant: TenantContext,
  archId: string,
  body: { domain_id: string; workflow_id: string; workflow_name: string }
) {
  const response = await fetch(`/api/architect/${archId}/link-workflow`, {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify(body),
  });
  return parse<ArchitectureItem>(response);
}

export async function getAvailableWorkflows(tenant: TenantContext, archId: string) {
  const response = await fetch(`/api/architect/${archId}/available-workflows`, {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ workflows: Array<{ id: string; name: string; version: number }> }>(response);
}

export async function getArchitectureVersions(tenant: TenantContext, archId: string) {
  const response = await fetch(`/api/architect/${archId}/versions`, {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ versions: ArchitectureVersionItem[] }>(response);
}
