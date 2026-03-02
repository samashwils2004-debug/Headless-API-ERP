import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../_utils";

export async function GET(request: NextRequest) {
  const category = new URL(request.url).searchParams.get("category");
  const path = category ? `/api/templates?category=${encodeURIComponent(category)}` : "/api/templates";
  const proxied = await proxyJson(path, request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
