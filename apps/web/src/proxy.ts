import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Auth Guard (Redirects)
  const accessToken = request.cookies.get("access_token")?.value;

  if (pathname.startsWith("/console")) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/login" && accessToken) {
    return NextResponse.redirect(new URL("/console", request.url));
  }

  // Initialize the response for modifications
  const response = NextResponse.next
();

  // 2. CSRF Token Logic (Runs on /console and /api routes)
  if (pathname.startsWith("/console") || pathname.startsWith("/api")) {
    if (!request.cookies.get("csrf_token")) {
      const token = randomBytes(24).toString("base64url");
      response.cookies.set("csrf_token", token, {
        httpOnly: false, // Must be JS-readable so headersForTenant can read it
        sameSite: "lax",
        path: "/",
      });
    }
  }

  // 3. Security Headers
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const wsBase = process.env.NEXT_PUBLIC_WS_BASE_URL || apiBase.replace(/^http/, "ws");
  const connectSrc = ["'self'", apiBase, wsBase].filter(Boolean).join(" ");

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  if (request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

// Global matcher to intercept all page assets and api paths cleanly
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
