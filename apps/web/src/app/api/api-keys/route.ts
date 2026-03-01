import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../_utils";

export async function GET(req: NextRequest) {
  const { status, body } = await proxyJson("/api-keys", req, "GET");
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const { status, body } = await proxyJson("/api-keys", req, "POST", payload);
  return NextResponse.json(body, { status });
}
