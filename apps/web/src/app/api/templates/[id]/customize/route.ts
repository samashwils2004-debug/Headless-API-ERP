import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const proxied = await proxyJson(`/api/templates/${id}/customize`, request, "POST", body);
  return NextResponse.json(proxied.body, { status: proxied.status });
}
