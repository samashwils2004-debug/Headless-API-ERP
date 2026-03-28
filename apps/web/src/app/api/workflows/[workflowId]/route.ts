import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../_utils";

type Params = { params: Promise<{ workflowId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const { workflowId } = await params;
  const proxied = await proxyJson(`/api/workflows/${workflowId}`, request, "DELETE");
  if (proxied.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(proxied.body, { status: proxied.status });
}
