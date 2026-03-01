import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "../../_utils";

export async function POST(request: NextRequest) {
  const base = backendBaseUrl();
  const payload = await request.json();
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const secure = process.env.NODE_ENV === "production";
  cookies().set("access_token", data.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: data.expires_in,
  });
  if (data.refresh_token) {
    cookies().set("refresh_token", data.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  cookies().set("csrf_token", randomUUID(), {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: data.expires_in,
  });

  if (data.user?.institution_id) {
    cookies().set("institution_id", data.user.institution_id, {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return NextResponse.json({ ok: true, expires_in: data.expires_in }, { status: 200 });
}
