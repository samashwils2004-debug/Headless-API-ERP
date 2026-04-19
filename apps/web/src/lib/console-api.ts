// the central "API client" for the entire frontend, something like a phonebook of all backend calls
// functions like: getProjects(), listWorkflows(), listEvents()
// ever console page that needs data calls a function from here
// it talks to: 8 different Next API bridge routes:
// /api/projects - list, create, update, delete projects
// /api/workflows - list, create, update, delete workflows
// /api/applications - list, create, update, delete applications
// /api/events - list of historical events
// /api/ai/compile - compile blueprint
// /api/ai/deploy - deploy blueprint
// /api/ai/templates - list, create, update, delete templates
// /api/ai/templates/:id/customize - customize template
// /api/ai/templates/:id/deploy - deploy template
// /api/auth/me - get current user
// every function calls assertTenantContext(tenant) first checking if institutionID and projectID exists
// and then sends them in the headers as X-Institution-Id and X-Project-Id (attaching CSRF token from the cookie)

import { assertTenantContext } from "@/lib/enforcement/tenantGuard";
import type { AuthUser, DomainEvent, InstitutionalBlueprint, ProjectItem, ValidationResult, WorkflowDefinition } from "@/types/contracts";

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

function getErrorMessage(payload: unknown, response: Response) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const candidate of [record.detail, record.message, record.error]) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
      if (candidate && typeof candidate === "object") {
        return JSON.stringify(candidate);
      }
    }
  }

  const statusLabel = response.statusText ? `${response.status} ${response.statusText}` : String(response.status);
  return `Request failed (${statusLabel})`;
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response));
  }
  return payload as T;
}

export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  return parse<AuthUser>(response);
}

export async function listProjects(tenant: TenantContext) {
  const response = await fetch("/api/projects", {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ projects: ProjectItem[] }>(response);
}

export async function createProject(tenant: TenantContext, payload: { name: string; slug: string; environment: "test" | "production" }) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify(payload),
  });
  return parse<{ id: string }>(response);
}

export async function deleteProject(tenant: TenantContext, projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
    headers: headersForTenant(tenant),
  });
  if (response.status === 204) return;
  return parse<void>(response);
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

export async function updateWorkflow(
  tenant: TenantContext,
  workflowId: string,
  payload: { name: string; definition: Record<string, unknown>; is_ai_generated: boolean }
) {
  const response = await fetch(`/api/workflows/${workflowId}`, {
    method: "PUT",
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

export async function undeployWorkflow(tenant: TenantContext, workflowId: string) {
  const response = await fetch(`/api/workflows/${workflowId}/undeploy`, {
    method: "POST",
    headers: headersForTenant(tenant, { "Content-Type": "application/json" }),
  });
  return parse<WorkflowItem>(response);
}

export async function deleteWorkflow(tenant: TenantContext, workflowId: string) {
  const response = await fetch(`/api/workflows/${workflowId}`, {
    method: "DELETE",
    headers: headersForTenant(tenant),
  });
  if (response.status === 204) return;
  return parse<void>(response);
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
  const listData = await parse<{ architecture: ArchitectureItem | null }>(listRes);
  if (listData.architecture) {
    return listData.architecture;
  }
  const createRes = await fetch("/api/architect", {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify({ name: "Institutional ERP" }),
  });
  return parse<ArchitectureItem>(createRes);
}

export async function compileArchitecture(
  tenant: TenantContext,
  archId: string,
  body: { workflow_ids: string[]; key_name: string }
) {
  const response = await fetch(`/api/architect/${archId}/compile`, {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify(body),
  });
  return parse<{
    architecture_version_id: string;
    version_number: number;
    workflows_linked: number;
    api_key: string;
    api_key_prefix: string;
    webhook_secret: string;
    webhook_secret_prefix: string;
    message: string;
  }>(response);
}

export type ArchitectPromptResult =
  | {
      type: "success";
      graph: Record<string, unknown>;
      diff: { summary: string; operation: string | null };
      version: number;
      rationale: string;
      visualization_config: Record<string, unknown>;
      intent_classified_as: string;
      _from_cache: boolean;
      _is_mock: boolean;
    }
  | {
      type: "redirect";
      message: string;
      suggested_action: string;
      pre_fill_prompt: string;
    }
  | { type: "compile_prompt"; message: string };

export async function applyArchitectPrompt(
  tenant: TenantContext,
  archId: string,
  prompt: string
): Promise<ArchitectPromptResult> {
  const response = await fetch(`/api/architect/${archId}/prompt`, {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify({ prompt }),
  });
  return parse<ArchitectPromptResult>(response);
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
  return parse<{
    workflows: Array<{ id: string; name: string; version: number; is_linked: boolean; is_ai_generated: boolean }>;
  }>(response);
}

export async function getArchitectureVersions(tenant: TenantContext, archId: string) {
  const response = await fetch(`/api/architect/${archId}/versions`, {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ versions: ArchitectureVersionItem[] }>(response);
}

// ── API Key functions ────────────────────────────────────────────────────────

export type ApiKeyItem = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
};

export async function listApiKeys(tenant: TenantContext) {
  const response = await fetch("/api/api-keys", {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ keys: ApiKeyItem[] }>(response);
}

export async function revokeApiKey(tenant: TenantContext, keyId: string) {
  const response = await fetch(`/api/api-keys/${keyId}`, {
    method: "DELETE",
    headers: headersForTenant(tenant),
  });
  if (response.status === 204) return;
  return parse<void>(response);
}
