import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyJson(`/api/architect/${id}/versions`, request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
