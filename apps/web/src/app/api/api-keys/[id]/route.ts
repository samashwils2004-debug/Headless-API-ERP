import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyJson(`/api/api-keys/${id}`, request, "DELETE");
  return new NextResponse(null, { status: proxied.status });
}
