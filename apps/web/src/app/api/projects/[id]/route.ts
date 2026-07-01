import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const proxied = await proxyJson(`/api/projects/${id}`, request, "PATCH");
  return NextResponse.json(proxied.body, { status: proxied.status });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const proxied = await proxyJson(`/api/projects/${id}`, request, "DELETE");
  if (proxied.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(proxied.body, { status: proxied.status });
}
