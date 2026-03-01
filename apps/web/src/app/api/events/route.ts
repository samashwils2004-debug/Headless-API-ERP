import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../_utils";

export async function GET(request: NextRequest) {
  const query = new URL(request.url).search;
  const proxied = await proxyJson(`/api/events${query}`, request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
