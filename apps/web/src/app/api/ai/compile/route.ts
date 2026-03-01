import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const proxied = await proxyJson("/api/ai/blueprints/compile", request, "POST", body);
  return NextResponse.json(proxied.body, { status: proxied.status });
}
