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

// ─── API Key Types ────────────────────────────────────────────────────────────

export type APIKeyItem = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
};

export type APIKeyCreateResponse = APIKeyItem & { full_key: string };

// ─── API Key Functions ────────────────────────────────────────────────────────

export async function listAPIKeys(tenant: TenantContext) {
  const response = await fetch("/api/api-keys", {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ keys: APIKeyItem[] }>(response);
}

export async function createAPIKey(
  tenant: TenantContext,
  payload: { name: string; scopes: string[]; expires_in_days?: number }
) {
  const response = await fetch("/api/api-keys", {
    method: "POST",
    headers: headersForTenant(tenant),
    body: JSON.stringify(payload),
  });
  return parse<APIKeyCreateResponse>(response);
}

export async function revokeAPIKey(tenant: TenantContext, keyId: string) {
  const response = await fetch(`/api/api-keys/${keyId}`, {
    method: "DELETE",
    headers: headersForTenant(tenant),
  });
  return parse<{ ok: boolean }>(response);
}

// ─── Template Types ───────────────────────────────────────────────────────────

export type TemplateItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  compliance_tags: string[];
};

// ─── Template Functions ───────────────────────────────────────────────────────

export async function listTemplates(tenant: TenantContext, category?: string) {
  const url = category ? `/api/templates?category=${encodeURIComponent(category)}` : "/api/templates";
  const response = await fetch(url, {
    cache: "no-store",
    headers: headersForTenant(tenant),
  });
  return parse<{ templates: TemplateItem[] }>(response);
}

export async function deployTemplate(tenant: TenantContext, templateId: string) {
  const response = await fetch(`/api/templates/${templateId}/deploy`, {
    method: "POST",
    headers: headersForTenant(tenant),
  });
  return parse<WorkflowItem>(response);
}
