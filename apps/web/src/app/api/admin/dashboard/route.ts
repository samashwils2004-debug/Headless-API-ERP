import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function GET(request: NextRequest) {
  const proxied = await proxyJson(`/api/admin/dashboard${new URL(request.url).search}`, request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
