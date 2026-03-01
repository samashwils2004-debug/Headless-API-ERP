import type { TenantContext } from "@/lib/console-api";

export function assertTenantContext(context: TenantContext) {
  if (!context.institutionId || !context.projectId) {
    throw new Error("Tenant context required.");
  }
}

