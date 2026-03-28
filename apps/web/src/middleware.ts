import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Sets the CSRF token cookie from the Next.js origin (localhost:3000).
 * This is necessary because FastAPI sets it on port 8000, which is a
 * different cookie jar from the Next.js app on port 3000.
 * The cookie must be set by the same server that reads it in proxyJson.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set CSRF token if not already present for this origin
  if (!request.cookies.get("csrf_token")) {
    const token = randomBytes(24).toString("base64url");
    response.cookies.set("csrf_token", token, {
      httpOnly: false, // Must be JS-readable so headersForTenant can read it
      sameSite: "lax",
      path: "/",
      // No 'secure' in dev — Next.js is on http://localhost
    });
  }

  return response;
}

export const config = {
  // Run on all console and API proxy routes
  matcher: ["/console/:path*", "/api/:path*"],
};
