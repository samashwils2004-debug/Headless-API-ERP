import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const proxied = await proxyJson(`/api/architect/${params.id}`, request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
