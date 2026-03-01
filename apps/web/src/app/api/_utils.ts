import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export function backendBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
}

export function authHeaderFromCookies() {
  const token = cookies().get("access_token")?.value;
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : {};
}

export function tenantHeadersFromRequest(req: NextRequest) {
  const institutionId = req.headers.get("x-institution-id") || cookies().get("institution_id")?.value || "";
  const projectId = req.headers.get("x-project-id") || cookies().get("project_id")?.value || "";
  const headers: Record<string, string> = {};
  if (institutionId) {
    headers["X-Institution-Id"] = institutionId;
  }
  if (projectId) {
    headers["X-Project-Id"] = projectId;
  }
  const csrf = req.headers.get("x-csrf-token");
  if (csrf) {
    headers["X-CSRF-Token"] = csrf;
  }
  return headers;
}

function isMutationMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function hasSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) {
    return true;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function hasValidCsrf(req: NextRequest) {
  const csrfCookie = cookies().get("csrf_token")?.value || "";
  const csrfHeader = req.headers.get("x-csrf-token") || "";
  return csrfCookie.length > 0 && csrfHeader.length > 0 && csrfCookie === csrfHeader;
}

export async function proxyJson(
  path: string,
  req: NextRequest,
  method: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
) {
  if (isMutationMethod(method)) {
    if (!hasSameOrigin(req)) {
      return { status: 403, body: { detail: "Invalid request origin" } };
    }
    if (!hasValidCsrf(req)) {
      return { status: 403, body: { detail: "Invalid CSRF token" } };
    }
  }

  const base = backendBaseUrl();
  const headers: Record<string, string> = {
    ...authHeaderFromCookies(),
    ...tenantHeadersFromRequest(req),
    ...(extraHeaders || {}),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { status: res.status, body: json };
  } catch {
    return { status: res.status, body: { detail: text || "Unknown response" } };
  }
}
