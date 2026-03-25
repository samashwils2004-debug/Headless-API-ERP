import { NextRequest, NextResponse } from "next/server";
import { proxyJson } from "../../../_utils";

type Params = { params: Promise<{ proposalId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { proposalId } = await params;
  const proxied = await proxyJson(`/api/ai/blueprints/${proposalId}/deploy`, request, "POST");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
