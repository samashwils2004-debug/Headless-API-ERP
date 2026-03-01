import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

type Params = { params: { proposalId: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const proxied = await proxyJson(`/api/ai/blueprints/${params.proposalId}/deploy`, request, "POST");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
