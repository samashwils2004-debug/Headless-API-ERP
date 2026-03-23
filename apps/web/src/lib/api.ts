const API_BASE = "/api";

export type TenantHeaders = {
  institutionId: string;
  projectId: string;
};

function withTenant(headers?: TenantHeaders): Record<string, string> {
  if (!headers) {
    return {};
  }
  return {
    "X-Institution-Id": headers.institutionId,
    "X-Project-Id": headers.projectId,
  };
}

function getErrorMessage(payload: unknown, res: Response) {
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

  const statusLabel = res.statusText ? `${res.status} ${res.statusText}` : String(res.status);
  return `Request failed (${statusLabel})`;
}

async function parseResponse(res: Response) {
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(getErrorMessage(data, res));
  }
  return data;
}

export const api = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return parseResponse(res);
  },
  logout: async () => {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
    return parseResponse(res);
  },
  me: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { method: "GET", cache: "no-store" });
    return parseResponse(res);
  },
  getProjects: async (tenant: TenantHeaders) => {
    const res = await fetch(`${API_BASE}/projects`, {
      method: "GET",
      cache: "no-store",
      headers: withTenant(tenant),
    });
    return parseResponse(res);
  },
  getWorkflows: async (tenant: TenantHeaders) => {
    const res = await fetch(`${API_BASE}/workflows`, {
      method: "GET",
      cache: "no-store",
      headers: withTenant(tenant),
    });
    return parseResponse(res);
  },
  getEvents: async (tenant: TenantHeaders) => {
    const res = await fetch(`${API_BASE}/events`, {
      method: "GET",
      cache: "no-store",
      headers: withTenant(tenant),
    });
    return parseResponse(res);
  },
};
