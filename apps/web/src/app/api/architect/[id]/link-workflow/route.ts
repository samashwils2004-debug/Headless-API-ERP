import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const proxied = await proxyJson(`/api/architect/${params.id}/link-workflow`, request, "POST", body);
  return NextResponse.json(proxied.body, { status: proxied.status });
}
