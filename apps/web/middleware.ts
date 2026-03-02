import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Auth Guard ────────────────────────────────────────────────────────────
  const accessToken = request.cookies.get("access_token")?.value;

  // Redirect unauthenticated users away from the console
  if (pathname.startsWith("/console")) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect already-authenticated users away from the login page
  if (pathname === "/login" && accessToken) {
    return NextResponse.redirect(new URL("/console", request.url));
  }

  // ─── Security Headers ──────────────────────────────────────────────────────
  const response = NextResponse.next();

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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
