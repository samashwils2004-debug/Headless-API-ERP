import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../_utils";

export async function GET(request: NextRequest) {
  const proxied = await proxyJson("/api/architect", request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const proxied = await proxyJson("/api/architect", request, "POST", body);
  return NextResponse.json(proxied.body, { status: proxied.status });
}
