import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function POST(request: NextRequest) {
  const proxied = await proxyJson("/api/auth/supabase-token", request, "POST");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
