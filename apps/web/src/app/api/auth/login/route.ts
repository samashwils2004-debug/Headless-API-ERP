import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { backendUnavailableDetail, fetchBackend } from "../../_utils";

async function readResponseBody(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { detail: text || "Unknown response" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await fetchBackend("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!result.response) {
      return NextResponse.json(
        { detail: backendUnavailableDetail(result.bases, "Auth API") },
        { status: 503 }
      );
    }

    const res = result.response;
    const data = await readResponseBody(res);
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const secure = process.env.NODE_ENV === "production";
    const response = NextResponse.json(
      { ok: true, expires_in: data.expires_in, user: data.user ?? null },
      { status: 200 }
    );

    response.cookies.set("access_token", data.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: data.expires_in,
    });
    if (data.refresh_token) {
      response.cookies.set("refresh_token", data.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    response.cookies.set("csrf_token", randomUUID(), {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: data.expires_in,
    });

    if (data.user?.institution_id) {
      response.cookies.set("institution_id", data.user.institution_id, {
        httpOnly: false,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown auth proxy failure";
    console.error("Auth login route failed", error);
    return NextResponse.json({ detail }, { status: 500 });
  }
}
