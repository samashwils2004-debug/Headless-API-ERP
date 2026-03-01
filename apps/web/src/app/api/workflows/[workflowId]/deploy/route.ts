import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

type Params = { params: { workflowId: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const proxied = await proxyJson(`/api/workflows/${params.workflowId}/deploy`, request, "POST");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
