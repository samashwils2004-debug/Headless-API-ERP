import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyJson(`/api/api-keys/${id}`, request, "DELETE");
  if (proxied.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(proxied.body, { status: proxied.status });
}
