import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

type Params = { params: Promise<{ workflowId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { workflowId } = await params;
  const proxied = await proxyJson(`/api/workflows/${workflowId}/undeploy`, request, "POST");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
