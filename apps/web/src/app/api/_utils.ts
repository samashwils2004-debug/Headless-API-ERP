import os from "node:os";

import { NextRequest } from "next/server";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function firstExternalIpv4() {
  type NetworkEntry = {
    address: string;
    family: string | number;
    internal: boolean;
  };
  const networks = os.networkInterfaces();
  for (const interfaceName of Object.keys(networks)) {
    const entries = networks[interfaceName];
    if (!entries) {
      continue;
    }

    for (const entry of entries as NetworkEntry[]) {
      const family = typeof entry.family === "string" ? entry.family : entry.family === 4 ? "IPv4" : "";
      if (family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
}

export function backendBaseUrls() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  try {
    const primary = new URL(raw);
    if (primary.hostname === "localhost") {
      primary.hostname = "127.0.0.1";
    }

    const bases = [trimTrailingSlash(primary.toString())];
    if (primary.hostname === "127.0.0.1") {
      const fallbackAddress = firstExternalIpv4();
      if (fallbackAddress) {
        const fallback = new URL(primary.toString());
        fallback.hostname = fallbackAddress;
        bases.push(trimTrailingSlash(fallback.toString()));
      }
    }

    return Array.from(new Set(bases));
  } catch {
    return [trimTrailingSlash(raw)];
  }
}

export function backendBaseUrl() {
  return backendBaseUrls()[0];
}

export function backendUnavailableDetail(bases: string[], label = "Backend API") {
  return `${label} unavailable at ${bases.join(" or ")}. Run \`npm run dev\` from the repo root to start both backend and frontend together.`;
}

export async function fetchBackend(path: string, init: RequestInit) {
  const bases = backendBaseUrls();
  let lastError: unknown;

  for (const base of bases) {
    try {
      return { response: await fetch(`${base}${path}`, init), base, bases };
    } catch (error) {
      lastError = error;
    }
  }

  return { response: null, base: null, bases, error: lastError };
}

export function authHeaderFromRequest(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : {};
}

export function tenantHeadersFromRequest(req: NextRequest) {
  const institutionId = req.headers.get("x-institution-id") || req.cookies.get("institution_id")?.value || "";
  const projectId = req.headers.get("x-project-id") || req.cookies.get("project_id")?.value || "";
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
  const csrfCookie = req.cookies.get("csrf_token")?.value || "";
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

  const headers: Record<string, string> = {
    ...authHeaderFromRequest(req),
    ...tenantHeadersFromRequest(req),
    ...(extraHeaders || {}),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const result = await fetchBackend(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!result.response) {
    return { status: 503, body: { detail: backendUnavailableDetail(result.bases) } };
  }

  const res = result.response;
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { status: res.status, body: json };
  } catch {
    return { status: res.status, body: { detail: text || "Unknown response" } };
  }
}
