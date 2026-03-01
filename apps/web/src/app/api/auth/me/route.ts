import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function GET(request: NextRequest) {
  const proxied = await proxyJson("/api/auth/me", request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
